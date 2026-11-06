import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, writeFile} from 'node:fs/promises';
import {request} from 'node:http';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import conversation from '../skills/show-me/scripts/conversation.cjs';
import hosts from '../skills/show-me/scripts/hosts.cjs';
import previews from '../skills/show-me/scripts/preview-host.cjs';
import {renderEdit} from '../skills/show-me/scripts/conversation.mjs';
import {serveSession} from '../skills/show-me/scripts/preview.mjs';

const sample = JSON.parse(await readFile(new URL('../examples/conversation.json', import.meta.url), 'utf8'));

for (const name of ['codex', 'zcode']) {
  test(name + ' sends exact edits through its own bridge and never through the other host', async () => {
    let sent, calls = 0;
    const env = {[name === 'zcode' ? 'zcode' : 'openai']: {
      sendFollowUpMessage: async message => { calls++; sent = message; return {cancelled:true}; }
    }};
    const host = hosts.connect(name, sample, env);
    const connection = conversation.connect(sample, (message, packet) => host.send(message, packet));
    const text = '我的原话\nKeep <b>literal</b> & spaces.  ';
    await connection.submit({description:text});
    assert.equal(JSON.parse(sent.prompt.split('\nSHOW_ME_RESPONSE\n')[1]).changes[0].after, text);
    assert.equal(connection.state, 'sent');
    await assert.rejects(connection.submit({description:text}));
    assert.equal(calls, 1);
    const wrong = hosts.connect(name, sample, {[name === 'zcode' ? 'openai' : 'zcode']: env[name === 'zcode' ? 'zcode' : 'openai']});
    assert.equal(wrong.available, false);
  });

  test(name + ' preserves the latest saved state when the first persistence call is slow', async () => {
    const saved = []; let release;
    const waiting = new Promise(resolve => { release = resolve; });
    const events = {};
    const bridge = {widgetState:{privateContent:{draft:'existing'}}, setWidgetState:async state => {
      if (!saved.length) await waiting;
      saved.push(state);
    }};
    const host = hosts.connect(name, sample, {[name === 'zcode' ? 'zcode' : 'openai']:bridge, addEventListener:(key, fn) => { events[key] = fn; }});
    assert.equal(host.readState(), bridge.widgetState);
    const first = {modelContent:null, privateContent:{state:'sending'}};
    const p1 = host.saveState(first), p2 = host.saveState({modelContent:null,privateContent:{state:'sent'}});
    first.privateContent.state = 'changed later';
    release(); await Promise.all([p1,p2]);
    assert.deepEqual(saved.map(s => s.privateContent.state), ['sending','sent']);
    let restored;
    host.subscribe(value => { restored = value; });
    events[(name === 'zcode' ? 'zcode' : 'openai') + ':set_globals']({detail:{globals:{widgetState:null}}});
    assert.equal(restored, null);
    assert.equal(saved.length, 2);
  });

  test(name + ' rejection stays uncertain and rendering includes no network transport', async () => {
    const host = hosts.connect(name, sample, {[name === 'zcode' ? 'zcode' : 'openai']:{sendFollowUpMessage:async () => { throw new Error('cancelled or failed'); }}});
    const connection = conversation.connect(sample, (m,p) => host.send(m,p));
    await assert.rejects(connection.submit({description:'A new description.'}));
    assert.equal(connection.state, 'unknown');
    await assert.rejects(connection.submit({description:'A retry.'}));
    const html = await renderEdit(sample,{host:name});
    assert(!/\b(fetch|XMLHttpRequest|WebSocket)\b/.test(html));
  });

  test(name + ' persists the sending state before handoff and never sends after failed persistence', async () => {
    let release, calls = 0;
    const pending = new Promise(resolve => { release = resolve; });
    const bridge = {setWidgetState:() => pending,sendFollowUpMessage:async () => { calls++; }};
    const host = hosts.connect(name, sample, {[name === 'zcode' ? 'zcode' : 'openai']:bridge});
    const saved = host.saveState({modelContent:null,privateContent:{showMe:{state:'sending'}}});
    const sending = host.send({prompt:'synthetic',title:'Test'});
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls,0);
    release(); await saved; await sending;
    assert.equal(calls,1);
    bridge.setWidgetState = async () => { throw new Error('Disk full'); };
    await assert.rejects(host.saveState({privateContent:{showMe:{state:'sending'}}}));
    await assert.rejects(host.send({prompt:'synthetic',title:'Test'}));
    assert.equal(calls,1);
  });
}

test('an unknown host never becomes a local demo', () => {
  assert.throws(() => hosts.connect('unknown', sample, {}));
});

async function preview(t, host = 'claude-code') {
  const running = await serveSession(sample, {host,timeoutMs:5000});
  t.after(() => running.close());
  const page = await fetch(running.url);
  assert.equal(page.status, 200);
  const html = await page.text();
  const boot = JSON.parse(html.match(/const boot = (\{[^\n]+\});/)[1]);
  return {running,boot,html};
}

test('the local preview returns the exact edit to its waiting task and does not execute it', async t => {
  const original = structuredClone(sample);
  const {running,boot,html} = await preview(t);
  const stored = new Map(); let calls = 0;
  const origin = new URL(running.url).origin;
  const host = previews.connect('claude-code',sample,{
    location:{origin},sessionStorage:{getItem:key => stored.get(key) || null,setItem:(key,value) => stored.set(key,value)},
    fetch:(path,options) => { calls++; return fetch(new URL(path,running.url),{...options,headers:{...options.headers,Origin:origin}}); }
  },boot.local);
  const state = {modelContent:null,privateContent:{showMe:{draft:'在这里改，没有发消息。'}}};
  await host.saveState(state);
  assert.deepEqual(host.readState(), state);
  assert.equal(calls,0);
  const connection = conversation.connect(sample,(m,p) => host.send(m,p));
  const exact = 'Before going out, write this.\n中文 🧭 <script>stay text</script>  ';
  await connection.submit({description:exact});
  const packet = await running.response;
  assert.equal(conversation.validate(sample,packet).changes[0].after,exact);
  assert.equal(calls,1);
  assert.deepEqual(sample, original);
  assert(!html.includes('https://'));
  await assert.rejects(connection.submit({description:'Again'}));
});

test('cross-origin, forged-host, invalid-token and stale responses cannot resolve a waiting task', async t => {
  const {running,boot} = await preview(t);
  for (const path of ['/', '/wrong/']) {
    const denied = await fetch(new URL(path,running.url));
    assert.equal(denied.status,404);
    const body = await denied.text();
    assert(!body.includes(sample.fields[0].value));
    assert(!body.includes(boot.local.token));
  }
  const packet = conversation.prepare(sample,{description:'A valid edit.'});
  const base = {method:'POST',headers:{Origin:boot.local.origin,'Content-Type':'application/json','X-Show-Me-Token':boot.local.token},body:JSON.stringify(packet)};
  const forged = await new Promise((resolve, reject) => {
    const req = request(new URL('/response',running.url), {method:'POST',headers:{...base.headers,Host:'attacker.example'}}, response => {
      response.resume(); response.on('end', () => resolve(response.statusCode));
    });
    req.on('error',reject); req.end(base.body);
  });
  assert.equal(forged,403);
  for (const headers of [{Origin:'https://example.org'},{'X-Show-Me-Token':'é'.repeat(64)},{'Content-Type':'text/plain'}]) {
    const result = await fetch(new URL('/response',running.url),{...base,headers:{...base.headers,...headers}});
    assert.equal(result.status,403);
  }
  const stale = await fetch(new URL('/response',running.url),{...base,body:JSON.stringify({...packet,revision:'stale'})});
  assert.equal(stale.status,400);
  const large = await fetch(new URL('/response',running.url),{...base,body:'x'.repeat(13000)});
  assert.equal(large.status,413);
  const valid = await fetch(new URL('/response',running.url),base);
  assert.equal(valid.status,200);
  assert.deepEqual(await running.response,packet);
});

test('a closed or expired preview produces no submitted response', async () => {
  const running = await serveSession(sample,{host:'deepseek',timeoutMs:20});
  await assert.rejects(running.response,/without a submitted response/);
  await assert.rejects(fetch(running.url));
});

test('preview profiles use local transport and reject rendering without a live receiver', async t => {
  for (const name of ['deepseek']) {
    await assert.rejects(renderEdit(sample,{host:name}),/Use serve/);
    const {running,boot} = await preview(t,name);
    assert.equal(boot.host,name);
    assert.equal(boot.local.origin,new URL(running.url).origin);
    running.close();
    await assert.rejects(running.response);
  }
});

test('a browser launcher that stays alive does not delay the CLI response', {skip:process.platform === 'win32'}, async t => {
  const dir = await mkdtemp(join(tmpdir(),'show-me-launcher-'));
  const launcher = join(dir,process.platform === 'darwin' ? 'open' : 'xdg-open');
  const pidFile = join(dir,'launcher.pid');
  await writeFile(launcher,'#!' + process.execPath + '\n' + 'require("node:fs").writeFileSync(' + JSON.stringify(pidFile) + ',String(process.pid)); setInterval(()=>{},1000);\n',{mode:0o700});
  const cli = fileURLToPath(new URL('../skills/show-me/scripts/conversation.mjs',import.meta.url));
  const fixture = fileURLToPath(new URL('../examples/conversation.json',import.meta.url));
  const child = spawn(process.execPath,[cli,'serve',fixture,'--host','deepseek','--open'],{env:{...process.env,PATH:dir + ':' + process.env.PATH}});
  t.after(async () => {
    if (child.exitCode === null) child.kill();
    const pid = Number(await readFile(pidFile,'utf8').catch(() => 0));
    if (pid) { try { process.kill(pid); } catch (_) {} }
  });
  let stdout = '', stderr = '';
  child.stdout.on('data',data => { stdout += data; });
  const exited = new Promise((resolve,reject) => { child.once('error',reject); child.once('close',resolve); });
  const url = await new Promise((resolve,reject) => {
    const timer = setTimeout(() => reject(new Error('CLI did not print its preview URL.')),3000);
    child.stderr.on('data',data => {
      stderr += data;
      const match = stderr.match(/http:\/\/127\.0\.0\.1:\d+\/[a-f0-9]+\//);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  let launcherPid;
  for (let attempt = 0; attempt < 400 && !launcherPid; attempt++) {
    launcherPid = Number(await readFile(pidFile,'utf8').catch(() => 0));
    if (!launcherPid) await new Promise(resolve => setTimeout(resolve,25));
  }
  assert(launcherPid > 0, 'The persistent launcher must actually be running.');
  const html = await (await fetch(url)).text();
  const boot = JSON.parse(html.match(/const boot = (\{[^\n]+\});/)[1]);
  const packet = conversation.prepare(sample,{description:'Returned while the opener stays alive.'});
  const received = await fetch(new URL('/response',url),{method:'POST',headers:{Origin:boot.local.origin,'Content-Type':'application/json','X-Show-Me-Token':boot.local.token},body:JSON.stringify(packet)});
  assert.equal(received.status,200);
  let timer;
  try {
    assert.equal(await Promise.race([exited,new Promise((_,reject) => { timer = setTimeout(() => reject(new Error('CLI waited for the browser launcher.')),3000); })]),0);
  } finally { clearTimeout(timer); }
  assert.deepEqual(JSON.parse(stdout.slice('SHOW_ME_RESPONSE\n'.length)),packet);
});

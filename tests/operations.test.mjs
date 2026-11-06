import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, readFile, readdir, symlink, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import ops from '../skills/show-me/scripts/operation-core.cjs';

const rows = [
  {id:'a',text:'[draft] Setup guide',nested:{retain:[1,true,null]}},
  {id:'b',text:'[draft] API reference',metadata:'untouched'},
  {id:'c',text:'Notes on [draft] status'},
  {id:'d',text:'Release notes'}
];
const source = JSON.stringify(rows, null, 2) + '\n';
const prefix = {schema:1,field:'text',operation:{kind:'replace',find:'[draft] ',with:'',at:'start'}};
const cli = resolve('skills/show-me/scripts/operate.mjs');

test('a second unchanged example rejects an incorrect generalization', () => {
  const candidates = ops.suggest(rows, [{id:'a',after:'Setup guide'}]);
  assert.ok(candidates.some(c => c.operation.at === 'all'));
  assert.ok(candidates.some(c => c.operation.at === 'start'));
  const narrowed = ops.suggest(rows, [{id:'a',after:'Setup guide'}, {id:'c',after:rows[2].text}]);
  assert.equal(narrowed.length, 1);
  assert.deepEqual(narrowed[0], prefix);
  assert.deepEqual(ops.preview(rows, narrowed[0]).map(c => c.after), ['Setup guide', 'API reference']);
});

test('a filename demonstration learns word extraction and case without a model', () => {
  const data = [{id:'a',text:'draft/user-profile.ts'}, {id:'b',text:'draft/billing-history.ts'}, {id:'c',text:'draft'}];
  const candidates = ops.suggest(data, [{id:'a',after:'User profile'},{id:'b',after:'Billing history'},{id:'c',after:'draft'}]);
  assert.ok(candidates.length > 0);
  for (const recipe of candidates) assert.deepEqual(ops.preview(data, recipe).map(c => c.after), ['User profile','Billing history']);
});

test('unsupported examples produce no executable guess', () => {
  assert.deepEqual(ops.suggest(rows, [{id:'a',after:'A long handbook'},{id:'b',after:'Short API notes'}]), []);
});

test('Unicode prefix and suffix edits preserve emoji and non-Latin text', async () => {
  const data = [{id:'一',text:'草稿：你好🌍'}, {id:'二',text:'草稿：再见🌕'}];
  const candidates = ops.suggest(data, [{id:'一',after:'你好🌍'},{id:'二',after:'再见🌕'}]);
  const recipe = candidates.find(c => c.operation.at === 'start');
  const raw = JSON.stringify(data);
  const result = JSON.parse(await ops.execute(raw, await ops.makePlan(raw, recipe)));
  assert.deepEqual(result.map(r=>r.text), ['你好🌍','再见🌕']);
});

test('application preserves all unrelated fields and the source input', async () => {
  const plan = await ops.makePlan(source, prefix);
  const result = JSON.parse(await ops.execute(source, plan));
  assert.equal(source, JSON.stringify(rows, null, 2) + '\n');
  assert.deepEqual(result[0].nested, rows[0].nested);
  assert.equal(result[1].metadata, 'untouched');
  assert.deepEqual(result[2], rows[2]);
  assert.deepEqual(result[3], rows[3]);
});

test('only edited string spans change, preserving number precision and source formatting', async () => {
  const raw = '[ {"id":"a", "text":"[draft] Hello", "big":9007199254740993, "huge":1e400, "fraction":0.123456789012345678901, "nested":{"text":"keep\\\"this","array":[1,{"x":2}]} } ]\n';
  const output = await ops.execute(raw, await ops.makePlan(raw, prefix));
  assert.equal(output,raw.replace('"text":"[draft] Hello"','"text":"Hello"'));
  assert.throws(() => ops.readRows('[{"id":"a","text":"x","text":"y"}]'),/Duplicate/);
});

test('output limits are checked before a plan can be applied', async () => {
  const data = Array.from({length:600},(_,i)=>({id:String(i),text:'a'.repeat(1700)}));
  const recipe = {schema:1,field:'text',operation:{kind:'replace',find:'',with:'b'.repeat(1700),at:'start'}};
  await assert.rejects(ops.makePlan(JSON.stringify(data),recipe),/result exceeds/);
});

test('exact source versions are checked, including changes in unrelated fields', async () => {
  const plan = await ops.makePlan(source, prefix);
  await assert.rejects(ops.execute(source + ' ', plan), /source changed/);
  await assert.rejects(ops.execute(source.replace('untouched','new value'), plan), /source changed/);
});

test('altered change records and unknown executable operations are rejected', async () => {
  const plan = await ops.makePlan(source, prefix);
  plan.changes[0].after = 'injected';
  await assert.rejects(ops.execute(source, plan), /plan changed/);
  assert.throws(() => ops.validateRecipe({schema:1,field:'text',operation:{kind:'eval',code:'globalThis.x=1'}}), /Unknown/);
  assert.throws(() => ops.validateRecipe({...prefix,operation:{...prefix.operation,extra:true}}), /Invalid/);
});

test('an explicit record selection stays within the selected ids', async () => {
  const plan = await ops.makePlan(source, prefix, ['b']);
  const result = JSON.parse(await ops.execute(source, plan));
  assert.deepEqual(result[0], rows[0]);
  assert.equal(result[1].text, 'API reference');
  assert.throws(() => ops.preview(rows,prefix,['missing']), /selection/);
});

test('duplicate ids, invalid fields and oversized results fail before execution', () => {
  assert.throws(() => ops.readRows('[{"id":"a","text":"x"},{"id":"a","text":"y"}]'), /unique/);
  assert.throws(() => ops.readRows(source,'__proto__'), /field/);
  assert.throws(() => ops.suggest(rows,[{id:'a',after:'x'},{id:'a',after:'y'}]), /example/);
  const large = {schema:1,field:'text',operation:{kind:'replace',find:'x',with:'a'.repeat(4000),at:'all'}};
  assert.throws(() => ops.preview([{id:'a',text:'xx'}],large), /limit/);
});

test('recipes reuse on three new batches with known expected results', async () => {
  const recipe = ops.suggest(rows,[{id:'a',after:'Setup guide'},{id:'c',after:rows[2].text}])[0];
  for (const topic of ['Install','Configure','Upgrade']) {
    const data = [{id:'new',text:'[draft] '+topic},{id:'keep',text:'Notes on [draft] status'}];
    const raw = JSON.stringify(data);
    const result = JSON.parse(await ops.execute(raw, await ops.makePlan(raw, recipe)));
    assert.deepEqual(result, [{id:'new',text:topic},data[1]]);
  }
});

test('CLI plans and applies to a new file and refuses existing or symlink outputs', async t => {
  const dir = await mkdtemp(join(tmpdir(),'show-me-test-'));
  t.after(() => rm(dir,{recursive:true,force:true}));
  const input=join(dir,'input.json'), recipe=join(dir,'recipe.json'), plan=join(dir,'plan.json'), output=join(dir,'output.json');
  await writeFile(input,source); await writeFile(recipe,JSON.stringify(prefix));
  const run = args => spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
  assert.equal(run(['plan',input,recipe,'--out',plan]).status,0);
  assert.equal(run(['apply',input,plan,'--out',output]).status,0);
  assert.equal(JSON.parse(await readFile(output,'utf8'))[0].text,'Setup guide');
  assert.equal(await readFile(input,'utf8'),source);
  assert.notEqual(run(['apply',input,plan,'--out',output]).status,0);
  const alias=join(dir,'alias.json'); await symlink(input,alias);
  assert.notEqual(run(['apply',input,plan,'--out',alias]).status,0);
  assert.equal(await readFile(input,'utf8'),source);
  await writeFile(input,source+' ');
  assert.notEqual(run(['apply',input,plan,'--out',join(dir,'stale.json')]).status,0);
  assert.ok(!(await readdir(dir)).includes('stale.json'));
});

test('rendered tools safely embed literal script-like data and contain no remote resources', async t => {
  const dir = await mkdtemp(join(tmpdir(),'show-me-render-'));
  t.after(() => rm(dir,{recursive:true,force:true}));
  const input=join(dir,'data.json'), output=join(dir,'tool.html');
  const dangerous='</script><img src=x onerror=alert(1)> & ${data}';
  await writeFile(input,JSON.stringify([{id:'a',text:dangerous}]));
  const result=spawnSync(process.execPath,[cli,'render',input,'--out',output],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const html=await readFile(output,'utf8');
  const boot=JSON.parse(html.split('<script type="application/json" id="boot">')[1].split('</script>')[0]);
  assert.equal(JSON.parse(boot.source)[0].text,dangerous);
  assert.ok(!html.includes(dangerous));
  assert.ok(!/<script[^>]+src=|<link[^>]+href=|\bfetch\(|XMLHttpRequest|WebSocket/.test(html));
});

test('CLI invoked through a symlink still creates the requested tool', async t => {
  const dir = await mkdtemp(join(tmpdir(),'show-me-entry-'));
  t.after(() => rm(dir,{recursive:true,force:true}));
  const alias=join(dir,'operate.mjs'), input=join(dir,'input.json'), output=join(dir,'tool.html');
  await symlink(cli,alias); await writeFile(input,source);
  const result=spawnSync(process.execPath,[alias,'render',input,'--out',output],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.ok((await readFile(output,'utf8')).includes('Teach an edit'));
});

test('large generated plans remain readable by the CLI', async t => {
  const dir = await mkdtemp(join(tmpdir(),'show-me-large-'));
  t.after(() => rm(dir,{recursive:true,force:true}));
  const data=Array.from({length:600},(_,i)=>({id:String(i),text:'a'.repeat(2000)}));
  const raw=JSON.stringify(data), recipe={schema:1,field:'text',operation:{kind:'case',mode:'upper',trim:false}};
  const plan=await ops.makePlan(raw,recipe);
  const input=join(dir,'input.json'), packet=join(dir,'plan.json'), output=join(dir,'result.json');
  await writeFile(input,raw); await writeFile(packet,JSON.stringify(plan,null,2));
  assert.ok(Buffer.byteLength(JSON.stringify(plan))>ops.LIMITS.bytes);
  const result=spawnSync(process.execPath,[cli,'apply',input,packet,'--out',output],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(await readFile(output,'utf8'))[599].text,'A'.repeat(2000));
});

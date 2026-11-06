#!/usr/bin/env node
/** Render the editable-answer example or validate a response against its local task snapshot. */
import {readFile, writeFile, realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import conversation from './conversation.cjs';

const safeJSON = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));

export async function renderEdit(session, {host = 'codex', label, suggestion = '', language = 'en', local} = {}) {
  conversation.checkSession(session);
  if (session.fields.length !== 1 || session.fields[0].kind !== 'text') throw new Error('This example renders one text field. Build other views around their task.');
  if (!['codex', 'zcode', 'claude-code', 'deepseek', 'demo'].includes(host) || (label !== undefined && typeof label !== 'string') || typeof suggestion !== 'string' || suggestion.length > 4000) throw new Error('Invalid view options.');
  if (!['codex', 'zcode', 'demo'].includes(host) && !local) throw new Error('Use serve for this host so the preview can return to the waiting task.');
  const core = await readFile(new URL('./conversation.cjs', import.meta.url), 'utf8');
  const hosts = await readFile(new URL(local ? './preview-host.cjs' : './hosts.cjs', import.meta.url), 'utf8');
  const template = await readFile(new URL('../assets/conversation.html', import.meta.url), 'utf8');
  const locales = JSON.parse(await readFile(new URL('../assets/demo-locales.json', import.meta.url), 'utf8'));
  if (!Object.hasOwn(locales, language)) throw new Error('Choose en or zh-CN.');
  const strings = locales[language].editor;
  label ??= strings.label;
  const viewId = 'showme-' + session.task;
  return template.replaceAll('__VIEW_ID__', viewId)
    .replace('__CONVERSATION_CORE__', () => core.replace(/<\/script/gi, '<\\/script'))
    .replace('__HOST_CORE__', () => hosts.replace(/<\/script/gi, '<\\/script'))
    .replace('__CONVERSATION_BOOT__', () => safeJSON({session, host, label, suggestion, strings, local}));
}

async function readJSON(path) {
  const source = await readFile(path, 'utf8');
  if (Buffer.byteLength(source) > conversation.MAX_BYTES) throw new Error('The task or response exceeds 12 KB.');
  return JSON.parse(source);
}

async function main(args) {
  if (args[0] === 'check' && args.length === 3) {
    const session = await readJSON(args[1]);
    const response = conversation.validate(session, await readJSON(args[2]));
    process.stdout.write(JSON.stringify(response) + '\n');
  } else if (['render', 'serve'].includes(args[0])) {
    const options = {};
    for (let i = 2; i < args.length; i++) {
      const key = args[i].slice(2);
      if (args[i] === '--open' && !options.open) { options.open = true; continue; }
      if (!['--out', '--host', '--language'].includes(args[i]) || !args[i + 1] || Object.hasOwn(options, key)) throw new Error('Invalid view option.');
      options[key] = args[++i];
    }
    const session = await readJSON(args[1]);
    if (args[0] === 'serve') {
      if (options.out || !options.host) throw new Error('Serve requires --host and returns the response in this terminal.');
      const {serveSession} = await import('./preview.mjs');
      const server = await serveSession(session, options);
      process.stderr.write('Show me preview: ' + server.url + '\nWaiting for an explicit use action. Keep this terminal task running.\n');
      try {
        const response = await (options.open ? Promise.race([server.response, openerFailure(server.url)]) : server.response);
        process.stdout.write('SHOW_ME_RESPONSE\n' + JSON.stringify(response) + '\n');
      } finally { server.close(); }
      return;
    }
    if (!options.out || options.open) throw new Error('Render requires --out; use serve --open to open a local preview.');
    const fragment = await renderEdit(session, options);
    await writeFile(options.out, fragment, {flag: 'wx', mode: 0o600});
    process.stdout.write('Created an inline fragment for ' + (options.host || 'codex') + '.\n');
  } else throw new Error('Use: conversation.mjs render SNAPSHOT.json --host codex|zcode --out VIEW.html [--language en|zh-CN]\n     conversation.mjs serve SNAPSHOT.json --host claude-code|deepseek [--open] [--language en|zh-CN]\n     conversation.mjs check SNAPSHOT.json RESPONSE.json');
}

function openerFailure(url) {
  const [command, args] = process.platform === 'darwin' ? ['open', [url]]
    : process.platform === 'win32' ? ['rundll32.exe', ['url.dll,FileProtocolHandler', url]]
    : ['xdg-open', [url]];
  return new Promise((_, reject) => {
    const child = spawn(command, args, {stdio:'ignore', shell:false, detached:true});
    child.unref();
    child.once('error', () => reject(new Error('The default browser could not open. Run serve again and open its URL in the app preview.')));
    child.once('exit', code => { if (code !== 0) reject(new Error('The default browser could not open. Run serve again and open its URL in the app preview.')); });
  });
}
const isMain = process.argv[1] && await realpath(process.argv[1]).catch(() => null) === await realpath(fileURLToPath(import.meta.url));
if (isMain) main(process.argv.slice(2)).catch(error => { console.error(error.code === 'EEXIST' ? 'Choose a new output file.' : error.message); process.exitCode = 1; });

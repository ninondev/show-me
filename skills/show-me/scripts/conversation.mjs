#!/usr/bin/env node
/** Render the editable-answer example or validate a response against its local task snapshot. */
import {readFile, writeFile, realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import conversation from './conversation.cjs';

const safeJSON = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));

export async function renderEdit(session, {host = 'codex', label = 'Your wording', suggestion = ''} = {}) {
  conversation.checkSession(session);
  if (session.fields.length !== 1 || session.fields[0].kind !== 'text') throw new Error('This example renders one text field. Build other views around their task.');
  if (!['codex', 'demo'].includes(host) || typeof label !== 'string' || typeof suggestion !== 'string' || suggestion.length > 4000) throw new Error('Invalid view options.');
  const core = await readFile(new URL('./conversation.cjs', import.meta.url), 'utf8');
  const template = await readFile(new URL('../assets/conversation.html', import.meta.url), 'utf8');
  const strings = JSON.parse(await readFile(new URL('../assets/demo-locales.json', import.meta.url), 'utf8')).en.editor;
  const viewId = 'showme-' + session.task;
  return template.replaceAll('__VIEW_ID__', viewId)
    .replace('__CONVERSATION_CORE__', () => core.replace(/<\/script/gi, '<\\/script'))
    .replace('__CONVERSATION_BOOT__', () => safeJSON({session, host, label, suggestion, strings}));
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
  } else if (args[0] === 'render' && args.length === 4 && args[2] === '--out') {
    const fragment = await renderEdit(await readJSON(args[1]));
    await writeFile(args[3], fragment, {flag: 'wx', mode: 0o600});
    process.stdout.write('Created an inline fragment for the Codex renderer.\n');
  } else throw new Error('Use: conversation.mjs render SNAPSHOT.json --out VIEW.html\n     conversation.mjs check SNAPSHOT.json RESPONSE.json');
}
const isMain = process.argv[1] && await realpath(process.argv[1]).catch(() => null) === await realpath(fileURLToPath(import.meta.url));
if (isMain) main(process.argv.slice(2)).catch(error => { console.error(error.code === 'EEXIST' ? 'Choose a new output file.' : error.message); process.exitCode = 1; });

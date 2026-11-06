#!/usr/bin/env node
/** Infer a text operation, review a versioned plan, or create an offline editor. */
import {readFile, writeFile, link, unlink, mkdir, realpath} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import ops from './operation-core.cjs';

const here = dirname(fileURLToPath(import.meta.url));
const help = `Show me operations (Node 20+)

  node operate.mjs render DATA.json --out TOOL.html [--field text]
  node operate.mjs infer DATA.json EXAMPLES.json [--field text] [--out RULES.json]
  node operate.mjs plan DATA.json RECIPE.json [--out PLAN.json]
  node operate.mjs apply DATA.json PLAN.json --out RESULT.json

Data: an array of objects with unique string ids and a string text field.
Examples: [{"id":"first-record","after":"Desired text"}]
Choose a recipe from infer's candidates before creating a plan.
Output files must be new. Apply preserves the source file.
Render embeds your data in the output HTML; share that file only with intended readers.
`;

async function read(path, limit = ops.LIMITS.bytes) {
  const text = await readFile(path, 'utf8');
  if (Buffer.byteLength(text) > limit) throw new Error(`The input exceeds its ${limit}-byte limit.`);
  return text;
}

async function writeNew(path, text) {
  const dest = resolve(path);
  await mkdir(dirname(dest), {recursive: true});
  const temporary = dest + '.show-me-' + randomUUID();
  try {
    await writeFile(temporary, text, {flag: 'wx', mode: 0o600});
    await link(temporary, dest);
  } finally {
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

function safeJSON(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, char =>
    '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));
}

export async function renderHTML(source, field = 'text') {
  ops.readRows(source, field);
  const template = await readFile(resolve(here, '../assets/operate.html'), 'utf8');
  const core = await readFile(resolve(here, 'operation-core.cjs'), 'utf8');
  return template.replace('__SHOWME_CORE__', () => core.replace(/<\/script/gi, '<\\/script'))
    .replace('__SHOWME_BOOT__', () => safeJSON({source, field}));
}

async function main(args) {
  if (!args.length || args.includes('--help')) { process.stdout.write(help); return; }
  const command = args.shift(), positional = [];
  let out, field = 'text';
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--out' || args[index] === '--field') {
      const key = args[index], value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}.`);
      if (key === '--out') out = value;
      else field = value;
    } else if (args[index].startsWith('--')) throw new Error('Unknown option: ' + args[index]);
    else positional.push(args[index]);
  }
  if (!['render', 'infer', 'plan', 'apply'].includes(command) || positional.length !== (command === 'render' ? 1 : 2))
    throw new Error(help);
  if (['render', 'apply'].includes(command) && !out) throw new Error('Choose a new output file with --out.');
  const source = await read(positional[0]);
  let result;
  if (command === 'render') {
    result = await renderHTML(source, field);
  } else {
    const limit = command === 'apply' ? ops.LIMITS.planBytes : command === 'plan' ? ops.LIMITS.recipeBytes : ops.LIMITS.bytes;
    const other = JSON.parse(await read(positional[1], limit));
    if (command === 'infer') result = JSON.stringify(ops.suggest(ops.readRows(source, field), other, field), null, 2) + '\n';
    if (command === 'plan') result = JSON.stringify(await ops.makePlan(source, other), null, 2) + '\n';
    if (command === 'apply') result = await ops.execute(source, other);
  }
  if (out) { await writeNew(out, result); process.stdout.write('Created ' + out + '\n'); }
  else process.stdout.write(result);
}

const isMain = process.argv[1] && await realpath(process.argv[1]).catch(() => null) === await realpath(fileURLToPath(import.meta.url));
if (isMain) main(process.argv.slice(2)).catch(error => {
  console.error(error.code === 'EEXIST' ? 'The output already exists. Choose a new file.' : error.message);
  process.exitCode = 1;
});

import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {renderHTML} from '../skills/show-me/scripts/operate.mjs';
const root = new URL('../', import.meta.url);
await mkdir(new URL('docs/',root), {recursive:true});
await writeFile(new URL('docs/index.html',root), await renderHTML(await readFile(new URL('examples/files.json',root),'utf8')));

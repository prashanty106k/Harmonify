import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {apps} from '../src/data.mjs';
import {legacyRedirects} from '../src/redirects.mjs';
const root=path.resolve('dist');let pages=0,links=0;
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(file.endsWith('.html')){pages++;const html=await readFile(file,'utf8');assert.match(html,/<title>.+?<\/title>/);assert.match(html,/<h1[ >]/);assert.match(html,/rel="canonical"/);assert.match(html,/name="description"/);assert.match(html,/name="twitter:card"/);assert.match(html,/<main id="main-content"/);for(const [,url] of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)){const target=path.join(root,url);let info;try{info=await stat(target)}catch{throw Error(`Broken local link ${url} in ${file}`)}if(info.isDirectory())await stat(path.join(target,'index.html'));links++}const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size,`Duplicate IDs in ${file}`);for(const [,id] of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(id),`Missing anchor #${id} in ${file}`)}}}
await walk(root);const ads=await readFile(path.join(root,'app-ads.txt'),'utf8');assert.match(ads,/google\.com, pub-[X\d]+, DIRECT, f08c47fec0942fa0/);assert.equal(pages,6+apps.length*3+Object.keys(legacyRedirects).length);console.log(`PASS: ${pages} pages, ${links} local links/assets, metadata, anchors, unique IDs and app-ads.txt.`);
await import('./check-seo.mjs');
await import('./check-aura.mjs');
await import('./check-learning.mjs');

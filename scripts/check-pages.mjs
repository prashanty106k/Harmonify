import {readFile,stat} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {apps,site} from '../src/data.mjs';
const output=new URL('../dist/',import.meta.url);
assert.equal((await readFile(new URL('CNAME',output),'utf8')).trim(),new URL(site.domain).hostname);
await stat(new URL('.nojekyll',output));
const ads=await readFile(new URL('app-ads.txt',output),'utf8');
for(const app of apps)assert.equal(await readFile(new URL(app.slug+'/app-ads.txt',output),'utf8'),ads);
console.log('PASS: GitHub Pages custom domain, static publishing marker, and all advertising-file mirrors.');

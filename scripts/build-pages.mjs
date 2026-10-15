import './build.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {apps,site} from '../src/data.mjs';
const output=new URL('../dist/',import.meta.url);
await writeFile(new URL('.nojekyll',output),'');
await writeFile(new URL('CNAME',output),new URL(site.domain).hostname+'\n');
const ads=await readFile(new URL('app-ads.txt',output),'utf8');
for(const app of apps)await writeFile(new URL(app.slug+'/app-ads.txt',output),ads);
console.log('Prepared GitHub Pages output, preserved custom domain, and added app-ads.txt mirrors.');

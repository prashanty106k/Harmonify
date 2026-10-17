import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {site} from '../src/data.mjs';
import {legacyRedirects} from '../src/redirects.mjs';

const root=path.resolve('dist');
const sitemap=await readFile(path.join(root,'sitemap.xml'),'utf8');
assert.match(sitemap,/^<\?xml version="1.0" encoding="UTF-8"\?>/);
assert.match(sitemap,/<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
const listed=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
assert.equal(listed.length,new Set(listed).size,'Sitemap URLs must be unique');
const indexable=[];
async function inspect(directory){
  for(const item of await readdir(directory,{withFileTypes:true})){
    const file=path.join(directory,item.name);
    if(item.isDirectory()){await inspect(file);continue}
    if(!file.endsWith('.html'))continue;
    const html=await readFile(file,'utf8');
    const relative=path.relative(root,file).split(path.sep).join('/');
    const route=relative==='404.html'?'/404.html':'/'+relative.replace(/index\.html$/,'');
    const canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.equal(canonical,site.domain+(legacyRedirects[route]||route),`Incorrect canonical for ${route}`);
    if(legacyRedirects[route]){
      assert.ok(html.includes('noindex,follow'),'Legacy redirect pages must not be indexed');
      assert.ok(html.includes('content="0;url='+legacyRedirects[route]+'"'),'Legacy page must redirect to the new route');
    }
    assert.ok(!html.includes('support@novatech-apps.com'),`Old email in ${route}`);
    const mailLinks=[...html.matchAll(/href="mailto:([^"?]+)/g)].map(match=>match[1]);
    assert.ok(mailLinks.length>0,`Missing contact email in ${route}`);
    assert.ok(mailLinks.every(email=>email===site.email),`Inconsistent contact email in ${route}`);
    if(!/<meta name="robots" content="noindex,follow">/.test(html))indexable.push(canonical);
    if(route==='/'){
      const data=JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1]||'null');
      const organization=data?.['@graph']?.find(item=>item['@type']==='Organization');
      assert.equal(organization?.email,site.email,'Structured data must use the current support email');
      assert.equal(organization?.url,site.domain+'/');
    }
  }
}
await inspect(root);
assert.deepEqual([...listed].sort(),indexable.sort(),'Sitemap must contain every indexable page and exclude drafts/404');
for(const url of listed){const parsed=new URL(url);assert.equal(parsed.origin,site.domain);assert.equal(parsed.hash,'');assert.equal(parsed.search,'')}
const robots=await readFile(path.join(root,'robots.txt'),'utf8');
assert.ok(robots.includes('Sitemap: '+site.domain+'/sitemap.xml'),'robots.txt must advertise the same sitemap');
console.log(`PASS: ${listed.length} indexable sitemap URLs, matching canonicals/robots, structured data, and updated email across every page.`);

import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {site} from '../src/data.mjs';
import {legacyRedirects} from '../src/redirects.mjs';

const output=new URL('../dist/',import.meta.url);
const landing=await readFile(new URL('aura-music-player/index.html',output),'utf8');
assert.match(landing,/<h1>Your music\.<br>Your phone\.<br>/);
assert.equal([...landing.matchAll(/data-eq-band="/g)].length,10,'The interactive EQ needs ten bands');
assert.equal([...landing.matchAll(/data-aura-vibe="/g)].length,10,'All ten supplied vibes must be available');
for(const feature of ['8D','16D','Android Auto','M3U','ReplayGain','AMOLED','GPL-3.0','Aura Player','Aura Strip','Aura Disc','Aura Cover','Sound Studio'])assert.ok(landing.includes(feature),`Missing supplied feature ${feature}`);
assert.ok(!landing.includes('Harmonify'),'The renamed landing page must not use the old brand');
for(const [filename,suffix] of [['aura-privacy.md','privacy-policy/'],['aura-terms.md','terms/']]){
  const source=await readFile(new URL('../src/content/'+filename,import.meta.url),'utf8');
  const html=await readFile(new URL('aura-music-player/'+suffix+'index.html',output),'utf8');
  for(const heading of source.matchAll(/^## (.+)\r?$/gm)){
    const title=heading[1].trim().replace(/^\d+\.\s*/,'').replaceAll('&','&amp;').replaceAll("'",'&#39;').replaceAll('"','&quot;');
    assert.ok(html.includes(title),`Missing supplied legal section: ${title}`);
  }
  for(const unresolved of ['[DATE]','[CONTACT EMAIL]','[YOUR NAME OR COMPANY]','[PRIVACY POLICY URL]','Template, not legal advice','Vars.kt'])assert.ok(!html.includes(unresolved),`Template author note leaked: ${unresolved}`);
  assert.ok(html.includes(site.email));
  assert.ok(html.includes('noindex,follow'),'Pre-release legal documents stay out of the sitemap');
  assert.ok(!html.includes('Firebase'),'Aura must use its own supplied SDK disclosure');
  for(const [,url] of html.matchAll(/href="(https:\/\/www\.novatech-apps\.com[^"#]*)"/g)){
    const route=new URL(url).pathname;
    await readFile(new URL(route.slice(1)+(route.endsWith('/')?'index.html':''),output));
  }
}
const terms=await readFile(new URL('aura-music-player/terms/index.html',output),'utf8');
for(const phrase of ['OuterTune','InnerTune','Source code offer','complete corresponding source code','at least three years'])assert.ok(terms.includes(phrase),`Missing supplied software-license wording: ${phrase}`);
for(const [from,to] of Object.entries(legacyRedirects)){
  const html=await readFile(new URL(from.slice(1)+'index.html',output),'utf8');assert.ok(html.includes('0;url='+to));
}
console.log('PASS: Aura feature coverage, 10-band/10-vibe controls, supplied legal sections, source offer and legacy redirects.');

import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {clockAngles,normalizeClock,clockDigital,clockWords} from '../public/assets/learning-clock.js';
import {learningTopics} from '../src/learning-data.mjs';
import {site} from '../src/data.mjs';

assert.equal(normalizeClock(-5),715);
assert.equal(clockDigital(720),'12:00');
assert.equal(clockDigital(555),'9:15');
assert.deepEqual(clockAngles(555),{hour:277.5,minute:90},'The hour hand must move continuously with minutes');
assert.deepEqual(clockAngles(720),{hour:0,minute:0});
for(const [minutes,words] of [[555,'सव्वा नऊ'],[90,'दीड'],[150,'अडीच'],[630,'साडे दहा'],[585,'पावणे दहा'],[45,'पाऊण']])assert.equal(clockWords(minutes,'mr'),words);
assert.equal(clockWords(585),'Quarter to ten');
const output=new URL('../dist/',import.meta.url),html=await readFile(new URL('learning-app/index.html',output),'utf8');
for(const feature of ['English','Marathi','₹1–₹99','₹100–₹999','25-question','Devanagari','Android','No ads','No sign-in','AM and PM','individual-result deletion','save-a-copy','Duplicate-save','localisation','सव्वा','साडे','पावणे','पाऊण','दीड','अडीच'])assert.ok(html.includes(feature),`Missing Learning App disclosure: ${feature}`);
assert.equal(learningTopics.length,15);for(const topic of learningTopics)assert.ok(html.includes(topic));
for(const kind of ['privacy','terms']){
  const source=await readFile(new URL('../src/content/learning-'+kind+'.md',import.meta.url),'utf8');
  const policy=await readFile(new URL('learning-app/'+(kind==='privacy'?'privacy-policy':'terms')+'/index.html',output),'utf8');
  for(const [,heading] of source.matchAll(/^## (.+)\r?$/gm))assert.ok(policy.includes(heading.trim().replaceAll('&','&amp;').replaceAll("'",'&#39;')),`Missing supplied legal section ${heading}`);
  for(const placeholder of ['[DD Month YYYY]','[Developer or business name]','[Public support email]','Draft for owner'])assert.ok(!policy.includes(placeholder));
  assert.ok(policy.includes('noindex,follow'));assert.ok(policy.includes(site.email));assert.ok(!policy.includes('AdMob')&&!policy.includes('Firebase'),'Do not insert other apps’ SDK disclosures');
}
const home=await readFile(new URL('index.html',output),'utf8');assert.ok(home.includes('data-filter="education"'));assert.ok(home.includes('href="/learning-app/"'));
const sitemap=await readFile(new URL('sitemap.xml',output),'utf8');assert.ok(sitemap.includes(site.domain+'/learning-app/'));assert.ok(!sitemap.includes('/learning-app/privacy-policy/'));
console.log('PASS: Learning App feature/legal coverage, 15 topics, clock geometry, Marathi names and sitemap integration.');

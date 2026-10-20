import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {clockAngles,normalizeClock,clockDigital,clockWords} from '../public/assets/learning-clock.js';
import {learningTopics} from '../src/learning-data.mjs';
import {site} from '../src/data.mjs';
import {learningLegalDate} from '../src/learning-legal.mjs';

assert.equal(normalizeClock(-5),715);
assert.equal(clockDigital(720),'12:00');
assert.equal(clockDigital(555),'9:15');
assert.deepEqual(clockAngles(555),{hour:277.5,minute:90},'The hour hand must move continuously with minutes');
assert.deepEqual(clockAngles(720),{hour:0,minute:0});
for(const [minutes,words] of [[555,'सव्वा नऊ'],[90,'दीड'],[150,'अडीच'],[630,'साडे दहा'],[585,'पावणे दहा'],[45,'पाऊण']])assert.equal(clockWords(minutes,'mr'),words);
assert.equal(clockWords(585),'Quarter to ten');
const output=new URL('../dist/',import.meta.url),html=await readFile(new URL('learning-app/index.html',output),'utf8');
assert.ok(html.includes('DnyanVedh'));assert.ok(!html.includes('Learning App'),'Replace the old app name throughout the landing page');
for(const feature of ['English','Marathi','₹1–₹99','₹100–₹999','25-question','Devanagari','Android','No ads','No sign-in','AM and PM','individual-result deletion','save-a-copy','Duplicate-save','localisation','सव्वा','साडे','पावणे','पाऊण','दीड','अडीच'])assert.ok(html.includes(feature),`Missing Learning App disclosure: ${feature}`);
assert.equal(learningTopics.length,15);for(const topic of learningTopics)assert.ok(html.includes(topic));
for(const kind of ['privacy','terms']){
  const source=await readFile(new URL('../src/content/learning-'+kind+'.md',import.meta.url),'utf8');
  const policy=await readFile(new URL('learning-app/'+(kind==='privacy'?'privacy-policy':'terms')+'/index.html',output),'utf8');
  for(const [,heading] of source.matchAll(/^## (.+)\r?$/gm))assert.ok(policy.includes(heading.trim().replaceAll('&','&amp;').replaceAll("'",'&#39;')),`Missing supplied legal section ${heading}`);
  for(const placeholder of ['[Date]','[Developer or Business Name]','[Support Email]','Draft for owner','draft-notice','noindex,follow'])assert.ok(!policy.includes(placeholder));
  assert.ok(policy.includes(learningLegalDate));assert.ok(policy.includes('DnyanVedh'));assert.ok(policy.includes(site.email));assert.ok(!policy.includes('AdMob')&&!policy.includes('Firebase'),'Do not insert other apps’ SDK disclosures');
  const supplied=(await readFile(new URL('../src/content/dnyanvedh-supplied.txt',import.meta.url),'utf8')).replace(/\r\n/g,'\n').split('DnyanVedh Terms and Conditions')[kind==='privacy'?0:1].split('\n').map(line=>line.trim()).filter(Boolean);
  if(kind==='privacy')supplied.shift();supplied.shift();
  const plain=policy.replace(/<[^>]*>/g,'').replaceAll('&amp;','&').replaceAll('&gt;','>').replaceAll('&lt;','<').replaceAll('&quot;','"').replaceAll('&#39;',"'");
  for(const paragraph of supplied){const expected=paragraph.replaceAll('[Developer or Business Name]',site.name).replaceAll('[Support Email]',site.email);assert.ok(plain.includes(expected),`Supplied ${kind} paragraph omitted or changed: ${paragraph.slice(0,75)}`);}
}
const home=await readFile(new URL('index.html',output),'utf8');assert.ok(home.includes('data-filter="education"'));assert.ok(home.includes('href="/learning-app/"'));
const sitemap=await readFile(new URL('sitemap.xml',output),'utf8');for(const route of ['/learning-app/','/learning-app/privacy-policy/','/learning-app/terms/'])assert.ok(sitemap.includes(site.domain+route));
console.log('PASS: DnyanVedh branding, every supplied legal paragraph, 15 topics, clock geometry, Marathi names and sitemap integration.');

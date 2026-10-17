import {readFile} from 'node:fs/promises';
import {blocks} from './aura-legal.mjs';
import {site} from './data.mjs';
import {icon} from './icons.mjs';

const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export async function learningLegal(kind){
  const filename=kind==='privacy'?'learning-privacy.md':'learning-terms.md';
  let source=(await readFile(new URL('./content/'+filename,import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  source=source.split('\n').filter(line=>!line.startsWith('# ')&&!line.startsWith('Draft for owner')).join('\n');
  source='**Effective date:** To be confirmed before release.\n\n'+source.replace(/ {2}\n/g,'\n\n');
  for(const [placeholder,value] of Object.entries({
    '[Developer or business name]':site.name,
    '[Public support email]':site.email,
    "[Operator's jurisdiction and dispute details, to be completed after legal review.]":'The operator’s governing jurisdiction and dispute details are pending legal review before release.'
  }))source=source.replaceAll(placeholder,value);
  // Keep the supplied disclosures; present unresolved release checks as explicit pending details.
  source=source.replace('the operator must confirm its actual support-retention process before publishing this policy.','the operator’s exact support-retention process remains to be confirmed before release.');
  source=source.replace('The operator must confirm permission for all supplied artwork before public distribution.','Permission for all supplied artwork must be confirmed before public distribution.');
  const parts=source.split(/^## /m),intro=blocks(parts.shift());
  return {intro,sections:parts.map((part,index)=>{const split=part.indexOf('\n');return {id:'learning-legal-'+(index+1),title:part.slice(0,split).trim(),html:blocks(part.slice(split+1))}})};
}

export function renderLearningLegal(kind,document,{header,footer}){
  const privacy=kind==='privacy';
  return `${header('legal')}<main class="legal-layout wrap"><aside class="legal-sidebar"><a class="text-link" href="/learning-app/">← Learning App</a><span class="eyebrow">ON THIS PAGE</span><nav aria-label="Document contents">${document.sections.map(section=>`<a href="#${section.id}">${escape(section.title)}</a>`).join('')}</nav><a href="mailto:${site.email}" class="legal-help">${icon('headphones')} Contact the publisher</a></aside><article class="legal-document learning-legal"><span class="eyebrow">LEARNING APP / TRUST & TRANSPARENCY</span><h1>${privacy?'Privacy policy':'Terms & conditions'}</h1><p class="document-sub">${privacy?'A clear view of local results, backups and sharing.':'Thoughtful ground rules for family and classroom learning.'}</p><div class="document-date">Pre-release document · Updated ${site.updated}<button class="print-button" type="button">Print document ${icon('arrow')}</button></div><div class="draft-notice"><strong>Prepared for Learning App’s upcoming release</strong><p>Effective date, full legal operator identity${privacy?', any required address and support-retention details':', artwork permissions and governing jurisdiction'} remain to be confirmed before release.</p></div><div class="learning-legal-intro">${document.intro}</div>${document.sections.map((section,index)=>`<section id="${section.id}"><h2><span>${String(index+1).padStart(2,'0')}</span>${escape(section.title)}</h2><div>${section.html}</div></section>`).join('')}<div class="document-end">${icon('shield')}<a href="/learning-app/${privacy?'terms':'privacy-policy'}/">Read the ${privacy?'terms & conditions':'privacy policy'} →</a></div></article></main>${footer()}`;
}

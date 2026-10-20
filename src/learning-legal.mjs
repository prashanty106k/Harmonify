import {readFile} from 'node:fs/promises';
import {blocks} from './aura-legal.mjs';
import {site} from './data.mjs';
import {icon} from './icons.mjs';

const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const learningLegalDate='October 20, 2026';

export async function learningLegal(kind){
  const filename=kind==='privacy'?'learning-privacy.md':'learning-terms.md';
  let source=(await readFile(new URL('./content/'+filename,import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  source=source.split('\n').filter(line=>!line.startsWith('# ')&&!line.startsWith('**Effective date:**')).join('\n');
  const parts=source.split(/^## /m),intro=blocks(parts.shift());
  return {intro,sections:parts.map((part,index)=>{const split=part.indexOf('\n');return {id:'learning-legal-'+(index+1),title:part.slice(0,split).trim(),html:blocks(part.slice(split+1))}})};
}

export function renderLearningLegal(kind,document,{header,footer}){
  const privacy=kind==='privacy';
  return `${header('legal')}<main class="legal-layout wrap"><aside class="legal-sidebar"><a class="text-link" href="/learning-app/">← DnyanVedh</a><span class="eyebrow">ON THIS PAGE</span><nav aria-label="Document contents">${document.sections.map(section=>`<a href="#${section.id}">${escape(section.title)}</a>`).join('')}</nav><a href="mailto:${site.email}" class="legal-help">${icon('headphones')} Contact the publisher</a></aside><article class="legal-document learning-legal"><span class="eyebrow">DNYANVEDH / TRUST & TRANSPARENCY</span><h1>${privacy?'Privacy policy':'Terms & conditions'}</h1><p class="document-sub">${privacy?'A clear view of local results, backups and sharing.':'Thoughtful ground rules for family and classroom learning.'}</p><div class="document-date">Effective date ${learningLegalDate}<button class="print-button" type="button">Print document ${icon('arrow')}</button></div>${document.intro?`<div class="learning-legal-intro">${document.intro}</div>`:''}${document.sections.map((section,index)=>`<section id="${section.id}"><h2><span>${String(index+1).padStart(2,'0')}</span>${escape(section.title)}</h2><div>${section.html}</div></section>`).join('')}<div class="document-end">${icon('shield')}<a href="/learning-app/${privacy?'terms':'privacy-policy'}/">Read the ${privacy?'terms & conditions':'privacy policy'} →</a></div></article></main>${footer()}`;
}

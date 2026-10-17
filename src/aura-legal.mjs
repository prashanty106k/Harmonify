import {readFile} from 'node:fs/promises';
import {site} from './data.mjs';
import {icon} from './icons.mjs';

const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function inline(value){
  const tokens=[];
  const token=html=>{tokens.push(html);return `MDTOKEN${tokens.length-1}END`};
  let text=value.replace(/`([^`]+)`/g,(_,code)=>token(`<code>${escape(code)}</code>`));
  text=text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g,(_,label,url)=>token(`<a href="${escape(url)}">${escape(label)}</a>`));
  text=text.replace(/https?:\/\/[^\s<>]+/g,value=>{const url=value.replace(/[.,;:!?]+$/,'');return token(`<a href="${escape(url)}">${escape(url)}</a>`)+value.slice(url.length)});
  text=text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,email=>token(`<a href="mailto:${escape(email)}">${escape(email)}</a>`));
  text=escape(text).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  return text.replace(/MDTOKEN(\d+)END/g,(_,index)=>tokens[Number(index)]);
}

export function blocks(value){
  const lines=value.split('\n');let html='',paragraph=[];
  const flush=()=>{if(paragraph.length){html+=`<p>${inline(paragraph.join(' '))}</p>`;paragraph=[]}};
  for(let index=0;index<lines.length;index++){
    const line=lines[index].trim();
    if(!line){flush();continue}
    if(line.startsWith('|')&&lines[index+1]?.match(/^\s*\|[\s|:-]+\|\s*$/)){
      flush();const cells=row=>row.trim().replace(/^\||\|$/g,'').split('|').map(cell=>inline(cell.trim()));
      const headers=cells(line);index+=2;const rows=[];
      while(index<lines.length&&lines[index].trim().startsWith('|')){rows.push(cells(lines[index]));index++}index--;
      html+=`<div class="legal-table-scroll"><table><thead><tr>${headers.map(cell=>`<th scope="col">${cell}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;continue;
    }
    if(line.startsWith('- ')){
      flush();const items=[];
      while(index<lines.length&&lines[index].trim().startsWith('- ')){
        let item=lines[index].trim().slice(2);index++;
        while(index<lines.length&&lines[index].trim()&&!lines[index].trim().startsWith('- ')&&!lines[index].trim().startsWith('#')){item+=' '+lines[index].trim();index++}
        items.push(item);
        if(!lines[index]?.trim())break;
      }
      index--;html+=`<ul>${items.map(item=>`<li>${inline(item)}</li>`).join('')}</ul>`;continue;
    }
    if(line.startsWith('### ')){flush();html+=`<h3>${inline(line.slice(4))}</h3>`;continue}
    paragraph.push(line);
  }
  flush();return html;
}

export async function auraLegal(kind){
  const file=kind==='privacy'?'aura-privacy.md':'aura-terms.md';
  let source=(await readFile(new URL('./content/'+file,import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  source=source.split('\n').filter(line=>!line.startsWith('>')&&!line.startsWith('# ')).join('\n');
  const replacements={
    '[DATE]':'To be confirmed before release',
    '[YOUR NAME OR COMPANY]':site.name,
    '[CONTACT EMAIL]':site.email,
    '[PRIVACY POLICY URL]':site.domain+'/aura-music-player/privacy-policy/',
    '[COUNTRY / STATE]':'[country/state to be confirmed before release]',
    '[CITY / COUNTRY]':'[city/country to be confirmed before release]',
    '[POSTAL ADDRESS, if required in your country]':'Postal address: to be confirmed where required.',
  };
  for(const [placeholder,value] of Object.entries(replacements))source=source.replaceAll(placeholder,value);
  const parts=source.split(/^## /m);const intro=blocks(parts.shift());
  const sections=parts.map((part,index)=>{
    const firstBreak=part.indexOf('\n');const heading=part.slice(0,firstBreak).trim();const number=heading.match(/^(\d+)\./)?.[1];const title=heading.replace(/^\d+\.\s*/,'');
    return {id:'section-'+(number||'summary-'+index),number,title,html:blocks(part.slice(firstBreak+1))};
  });
  return {intro,sections};
}

export function renderAuraLegal(kind,document,{header,footer}){
  const title=kind==='privacy'?'Privacy policy':'Terms & conditions';
  return `${header('legal')}<main class="legal-layout wrap"><aside class="legal-sidebar"><a class="text-link" href="/aura-music-player/">← Aura Music Player</a><span class="eyebrow">ON THIS PAGE</span><nav aria-label="Document contents">${document.sections.map(section=>`<a href="#${section.id}">${escape(section.title)}</a>`).join('')}</nav><a href="mailto:${site.email}" class="legal-help">${icon('headphones')} Contact the publisher</a></aside><article class="legal-document aura-legal"><span class="eyebrow">AURA MUSIC PLAYER / TRUST & TRANSPARENCY</span><h1>${title}</h1><p class="document-sub">${kind==='privacy'?'Your local library. Clear information about advertising.':'Your music, your rights, and the ground rules.'}</p><div class="document-date">Pre-release document · Updated ${site.updated}<button class="print-button" type="button">Print document ${icon('arrow')}</button></div><div class="draft-notice"><strong>Prepared for Aura’s upcoming release</strong><p>The effective date, publisher’s full legal identity and any required address must be confirmed before release.${kind==='terms'?' The governing jurisdiction is also pending.':''}</p></div><div class="aura-legal-intro">${document.intro}</div>${document.sections.map(section=>`<section id="${section.id}"><h2>${section.number?`<span>${section.number.padStart(2,'0')}</span>`:''}${escape(section.title)}</h2><div>${section.html}</div></section>`).join('')}<div class="document-end">${icon('shield')} ${kind==='privacy'?'<a href="/aura-music-player/terms/">Read the terms & conditions →</a>':'<a href="/aura-music-player/privacy-policy/">Read the privacy policy →</a>'}</div></article></main>${footer()}`;
}

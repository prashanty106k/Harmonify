import {readFile} from 'node:fs/promises';
import {blocks} from './aura-legal.mjs';

export const cinematicPrivacyDate='October 18, 2026';
export async function cinematicPrivacy(){
  const source=(await readFile(new URL('./content/cinematic-pro-privacy.md',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  return source.split(/^## /m).slice(1).map((part,index)=>{
    const split=part.indexOf('\n');
    return ['cinematic-privacy-'+(index+1),part.slice(0,split).trim(),blocks(part.slice(split+1))];
  });
}

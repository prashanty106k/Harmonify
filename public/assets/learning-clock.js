export const normalizeClock = minutes=>((minutes%720)+720)%720;
export function clockAngles(minutes){const normalized=normalizeClock(minutes);return {hour:normalized/2,minute:(normalized%60)*6};}
export function clockDigital(minutes){const normalized=normalizeClock(minutes);return `${Math.floor(normalized/60)||12}:${String(normalized%60).padStart(2,'0')}`;}
const english=['Twelve','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven'];
const marathi=['बारा','एक','दोन','तीन','चार','पाच','सहा','सात','आठ','नऊ','दहा','अकरा'];
export function clockWords(minutes,language='en'){
  const time=normalizeClock(minutes),hour=Math.floor(time/60),minute=time%60,next=(hour+1)%12;
  if(language==='mr'){
    if(minute===0)return `${marathi[hour]} वाजले`;
    if(minute===15)return `सव्वा ${marathi[hour]}`;
    if(minute===30)return hour===1?'दीड':hour===2?'अडीच':`साडे ${marathi[hour]}`;
    if(minute===45)return next===1?'पाऊण':`पावणे ${marathi[next]}`;
    return `${marathi[hour]} वाजून ${minute} मिनिटे`;
  }
  if(minute===0)return `${english[hour]} o’clock`;
  if(minute===15)return `Quarter past ${english[hour].toLowerCase()}`;
  if(minute===30)return `Half past ${english[hour].toLowerCase()}`;
  if(minute===45)return `Quarter to ${english[next].toLowerCase()}`;
  return `${clockDigital(time)}`;
}

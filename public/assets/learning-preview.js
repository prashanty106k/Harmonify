import {normalizeClock,clockAngles,clockDigital,clockWords} from './learning-clock.js';

const preview=document.querySelector('[data-learning-preview]');
if(preview){
  const $=selector=>preview.querySelector(selector),$$=selector=>[...preview.querySelectorAll(selector)];
  let minutes=540,target=555,language='en',step=15,solved=false;
  const tabs=$$('[data-learn-tab]');
  function selectTab(tab){tabs.forEach(other=>{const selected=other===tab;other.setAttribute('aria-selected',String(selected));other.tabIndex=selected?0:-1;$('#'+other.getAttribute('aria-controls')).hidden=!selected;});}
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>selectTab(tab));
    tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();selectTab(tabs[next]);tabs[next].focus();}});
  });
  function feedback(text,success=false){$('[data-clock-feedback]').textContent=text;$('.learn-feedback').classList.toggle('success',success);}
  function render(){
    const angles=clockAngles(minutes),marathi=language==='mr';
    $('[data-clock-hour]').setAttribute('transform',`rotate(${angles.hour} 120 120)`);
    $('[data-clock-minute]').setAttribute('transform',`rotate(${angles.minute} 120 120)`);
    $('[data-learning-clock]').setAttribute('aria-label',`${marathi?'घड्याळ':'Clock'} ${clockDigital(minutes)}, ${clockWords(minutes,language)}`);
    $('[data-clock-digital]').textContent=clockDigital(minutes);
    $('[data-clock-words]').textContent=clockWords(minutes,language);
    $('[data-clock-words]').lang=language;
    $('[data-clock-target]').textContent=clockDigital(target);
    $('[data-clock-task]').textContent=marathi?'घड्याळाची वेळ लावा':'Set the clock to';
    $('[data-clock-title]').textContent=marathi?'चला, वेळ शिकूया.':'A good time to learn.';
    $('[data-clock-title]').lang=language;
    $('[data-clock-eyebrow]').textContent=marathi?'गणित · वेळ':'MATHS · TIME';
    $$('[data-hour-label]').forEach(label=>{label.textContent=marathi?'तास':'Hour';label.lang=language;});
    $$('[data-minute-label]').forEach(label=>{label.textContent=marathi?'मिनिटे':'Minute';label.lang=language;});
    $('[data-clock-language]').innerHTML=marathi?'English ↔':'मराठी ↔';
    $('[data-clock-language]').lang=marathi?'en':'mr';
    $('[data-clock-language]').setAttribute('aria-label',marathi?'Switch clock preview to English':'Switch clock preview to Marathi');
    $('[data-clock-check]').innerHTML=marathi?'तपासा ✓':'Check ✓';
    $('[data-clock-next]').textContent=marathi?'पुढचे घड्याळ →':'Next clock →';
    $$('[data-clock-adjust]').forEach(button=>{const delta=Number(button.dataset.clockAdjust),hours=Math.abs(delta)===60;button.setAttribute('aria-label',marathi?`${delta>0?'वाढवा':'कमी करा'}: ${hours?'एक तास':'पाच मिनिटे'}`:`${delta>0?'Add':'Subtract'} ${hours?'one hour':'five minutes'}`);});
  }
  function resetFeedback(){solved=false;$('[data-clock-next]').hidden=true;feedback(language==='mr'?'थोडा सराव. नवा शोध.':'A little turn. A new discovery.');}
  $$('[data-clock-adjust]').forEach(button=>button.addEventListener('click',()=>{minutes=normalizeClock(minutes+Number(button.dataset.clockAdjust));resetFeedback();render();}));
  $('[data-clock-language]').addEventListener('click',()=>{language=language==='en'?'mr':'en';resetFeedback();render();});
  $('[data-clock-check]').addEventListener('click',()=>{solved=minutes===target;feedback(solved?(language==='mr'?'छान! बरोबर वेळ लावली.':'You did it! That’s the right time.'):(language==='mr'?'पुन्हा प्रयत्न करा. दोन्ही काटे तपासा.':'Keep exploring. Check both hands and try again.'),solved);$('[data-clock-next]').hidden=!solved;});
  function nextClock(){const choices=720/step;let next;do{next=Math.floor(Math.random()*choices)*step}while(next===target);target=next;minutes=normalizeClock(Math.floor(target/60)*60+(target%60===0?60:0));resetFeedback();render();}
  $('[data-clock-next]').addEventListener('click',nextClock);
  $('[data-clock-difficulty]').addEventListener('change',event=>{step=Number(event.target.value);nextClock();});
  render();
}

(() => {
  const $=(s,root=document)=>root.querySelector(s), $$=(s,root=document)=>[...root.querySelectorAll(s)];
  const read=(key,fallback)=>{try{return localStorage.getItem('novatech-'+key)??fallback}catch{return fallback}};
  const save=(key,value)=>{try{localStorage.setItem('novatech-'+key,value)}catch{}};
  let toastTimer;
  function toast(text){const el=$('.toast');el.textContent=text;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,4500)}
  const themeButton=$('.theme-toggle');
  function syncTheme(){const dark=document.documentElement.dataset.theme==='dark';themeButton.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');themeButton.setAttribute('aria-pressed',String(dark))}
  themeButton?.addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;save('theme',theme);syncTheme()});syncTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',e=>{if(read('theme','')===''){document.documentElement.dataset.theme=e.matches?'dark':'light';syncTheme()}});
  const menu=$('.menu-toggle');menu?.addEventListener('click',()=>{const nav=$('.mobile-nav');nav.hidden=!nav.hidden;menu.setAttribute('aria-expanded',String(!nav.hidden));menu.setAttribute('aria-label',nav.hidden?'Open navigation':'Close navigation')});
  $$('.mobile-nav a').forEach(a=>a.addEventListener('click',()=>{$('.mobile-nav').hidden=true;menu.setAttribute('aria-expanded','false')}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){$('.mobile-nav').hidden=true;menu.setAttribute('aria-expanded','false');menu.focus()}});
  $$('.filter').forEach(btn=>btn.addEventListener('click',()=>{$$('.filter').forEach(b=>{b.classList.toggle('active',b===btn);b.setAttribute('aria-pressed',String(b===btn))});$$('.app-card').forEach(c=>c.hidden=btn.dataset.filter!=='all'&&btn.dataset.filter!==c.dataset.category)}));
  function connection(){const online=navigator.onLine;$$('[data-connection]').forEach(el=>{el.textContent=online?'Browser online':'Browser offline';el.parentElement.classList.toggle('offline',!online);el.parentElement.title='Browser network availability; not an app backend health check.'})}
  window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
  $$('[data-soon]').forEach(b=>b.addEventListener('click',()=>toast(`${b.dataset.soon} is in development. A Google Play link will appear here when it launches.`)));
  $('.print-button')?.addEventListener('click',()=>window.print());
  $('.copy-email')?.addEventListener('click',async()=>{const email=$('.contact-email a').textContent.trim();try{await navigator.clipboard.writeText(email);toast('Support email copied.')}catch{toast('Email us at '+email)}});
  $$('.demo-stage').forEach(stage=>{
    let context,gain,oscillators=[],playing=false;const playButton=$('.play-demo',stage),type=stage.dataset.demo;
    const iconPlay=playButton.innerHTML;
    function stop(){playing=false;stage.classList.remove('is-playing');playButton.innerHTML=iconPlay;playButton.setAttribute('aria-label',type==='audio'?'Play ambient sound demo':'Animate visual preview');if(context){context.close().catch(()=>{});context=null;gain=null;oscillators=[]}}
    async function play(){if(playing){stop();return}if(type==='audio'){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('unsupported');context=new Audio();await context.resume();gain=context.createGain();gain.gain.value=Number(read('volume','35'))/100*.065;gain.connect(context.destination);[130.81,164.81,196,261.63].forEach((frequency,i)=>{const o=context.createOscillator();o.type='sine';o.frequency.value=frequency;o.detune.value=i*2;const voice=context.createGain();voice.gain.value=.7/(i+1);o.connect(voice);voice.connect(gain);o.start();oscillators.push(o)})}catch{stop();toast('Audio is unavailable in this browser. You can still explore the layouts.');return}}playing=true;stage.classList.add('is-playing');playButton.innerHTML='<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 5h3v14H7zm7 0h3v14h-3z"/></svg>';playButton.setAttribute('aria-label',type==='audio'?'Pause ambient sound demo':'Pause visual preview')}
    playButton.addEventListener('click',play);
    const tabs=$$('[role=tab]',stage);
    function selectTab(tab){tabs.forEach(t=>{const chosen=t===tab;t.setAttribute('aria-selected',String(chosen));t.tabIndex=chosen?0:-1;$('#'+t.getAttribute('aria-controls'),stage).hidden=!chosen});if(tab.dataset.tab!=='play')stop()}
    tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>selectTab(tab));tab.addEventListener('keydown',e=>{let index;if(e.key==='ArrowRight')index=(i+1)%tabs.length;else if(e.key==='ArrowLeft')index=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')index=0;else if(e.key==='End')index=tabs.length-1;else return;e.preventDefault();selectTab(tabs[index]);tabs[index].focus()})});
    function layout(value){stage.dataset.layout=value;$$('[data-layout]',stage).forEach(b=>{const active=b.dataset.layout===value;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))});$('.layout-confirm',stage).textContent=value[0].toUpperCase()+value.slice(1)+' layout selected.'}
    layout(['focus','compact','studio'].includes(read('layout','focus'))?read('layout','focus'):'focus');
    $$('.layout-option',stage).forEach(b=>b.addEventListener('click',()=>{layout(b.dataset.layout);save('layout',b.dataset.layout)}));
    const volume=$('[data-volume]',stage);volume.value=Math.min(100,Math.max(0,Number(read('volume','35'))||0));volume.addEventListener('input',()=>{save('volume',volume.value);if(gain)gain.gain.setTargetAtTime(Number(volume.value)/100*.065,context.currentTime,.1)});
    const animation=$('[data-animation]',stage);animation.checked=read('animation','true')==='true';document.body.classList.toggle('no-animation',!animation.checked);animation.addEventListener('change',()=>{save('animation',String(animation.checked));document.body.classList.toggle('no-animation',!animation.checked)});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});window.addEventListener('pagehide',stop);
  });
})();

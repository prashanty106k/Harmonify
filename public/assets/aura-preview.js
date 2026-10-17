(() => {
  const stage=document.querySelector('[data-aura-studio]');
  if(!stage)return;
  const $=selector=>stage.querySelector(selector);
  const bands=[...stage.querySelectorAll('[data-eq-band]')];
  const frequencies=[31,62,125,250,500,1000,2000,4000,8000,16000];
  const presets={flat:[0,0,0,0,0,0,0,0,0,0],bass:[7,6,4,2,0,-1,-1,0,0,0],vocal:[-3,-2,-1,1,4,5,4,2,0,-1],night:[2,1,0,-1,-1,-2,-3,-4,-5,-6]};
  let audio=null,frame=null,mode='8d',speed=.6,vibe={ratio:1,cutoff:18000,room:0,key:'original'};

  function updateCurve(){
    const values=bands.map(input=>Number(input.value));
    $('[data-eq-curve]').setAttribute('d',values.map((value,index)=>`${index?'L':'M'}${index*300/9} ${15-value*.9}`).join(' '));
    bands.forEach((input,index)=>{
      input.setAttribute('aria-valuetext',`${values[index]>0?'+':''}${values[index]} decibels`);
      if(audio)audio.filters[index].gain.setTargetAtTime(values[index],audio.context.currentTime,.06);
    });
  }
  bands.forEach(input=>input.addEventListener('input',()=>{$('[data-eq-preset]').value='custom';updateCurve()}));
  $('[data-eq-preset]').addEventListener('change',event=>{
    const values=presets[event.target.value];if(!values)return;
    bands.forEach((input,index)=>input.value=values[index]);updateCurve();
  });

  function applyVibe(){
    if(!audio)return;
    const now=audio.context.currentTime;
    audio.oscillators.forEach((oscillator,index)=>oscillator.frequency.setTargetAtTime(audio.baseFrequencies[index]*vibe.ratio,now,.25));
    audio.tone.frequency.setTargetAtTime(vibe.cutoff,now,.15);
    audio.wet.gain.setTargetAtTime(vibe.room,now,.2);
    audio.bass.gain.setTargetAtTime(vibe.key==='bass'?7:vibe.key==='phonk'?4:0,now,.12);
  }
  const vibeButtons=[...document.querySelectorAll('[data-aura-vibe]')];
  vibeButtons.forEach(button=>button.addEventListener('click',()=>{
    vibe={key:button.dataset.auraVibe,ratio:Number(button.dataset.ratio),cutoff:Number(button.dataset.cutoff),room:Number(button.dataset.room)};
    vibeButtons.forEach(other=>{const selected=other===button;other.classList.toggle('selected',selected);other.setAttribute('aria-pressed',String(selected))});
    const name=button.childNodes[1].textContent.trim();
    document.querySelectorAll('[data-current-vibe]').forEach(label=>label.textContent=name);
    applyVibe();
  }));
  stage.querySelectorAll('[data-spatial-mode]').forEach(button=>button.addEventListener('click',()=>{
    mode=button.dataset.spatialMode;stage.dataset.spatialMode=mode;
    stage.querySelectorAll('[data-spatial-mode]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
    $('[data-spatial-label]').textContent=mode==='16d'?'A FULL SPHERE OF SOUND':'360° AROUND YOU';
    if(!audio)$('[data-spatial-dot]').style.transform=mode==='16d'?'translate(65px,-42px)':'translate(88px,-10px)';
  }));
  $('[data-orbit-speed]').addEventListener('input',event=>speed=Number(event.target.value)/100);

  function stop(){if(frame!==null)cancelAnimationFrame(frame);frame=null;audio=null}
  stage.addEventListener('aura:audio-stop',stop);
  stage.addEventListener('aura:audio-ready',event=>{
    stop();
    const {context,gain,oscillators}=event.detail;
    const filters=frequencies.map(frequency=>{const filter=context.createBiquadFilter();filter.type='peaking';filter.frequency.value=frequency;filter.Q.value=1.2;return filter});
    const bass=context.createBiquadFilter();bass.type='lowshelf';bass.frequency.value=180;
    const tone=context.createBiquadFilter();tone.type='lowpass';tone.frequency.value=vibe.cutoff;
    const panner=context.createPanner();panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=2;panner.rolloffFactor=.2;
    const limiter=context.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=15;limiter.ratio.value=6;
    const convolver=context.createConvolver();const buffer=context.createBuffer(2,context.sampleRate*2,context.sampleRate);
    for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);for(let index=0;index<data.length;index++)data[index]=(Math.random()*2-1)*Math.pow(1-index/data.length,3)}
    convolver.buffer=buffer;
    const wet=context.createGain();wet.gain.value=vibe.room;
    gain.disconnect();gain.connect(filters[0]);filters.forEach((filter,index)=>{if(index<filters.length-1)filter.connect(filters[index+1])});
    filters.at(-1).connect(bass);bass.connect(tone);tone.connect(panner);tone.connect(convolver);convolver.connect(wet);wet.connect(panner);panner.connect(limiter);limiter.connect(context.destination);
    audio={context,oscillators,baseFrequencies:oscillators.map(oscillator=>oscillator.frequency.value),filters,bass,tone,wet,panner};
    updateCurve();applyVibe();
    const origin=context.currentTime;
    function animate(){
      if(!audio||context.state==='closed')return;
      const phase=(context.currentTime-origin)*speed;
      const x=Math.cos(phase)*2,z=Math.sin(phase)*2,y=mode==='16d'?Math.sin(phase*1.4)*1.5:0;
      panner.positionX.setTargetAtTime(x,context.currentTime,.025);panner.positionY.setTargetAtTime(y,context.currentTime,.025);panner.positionZ.setTargetAtTime(z,context.currentTime,.025);
      if(!document.body.classList.contains('no-animation')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)$('[data-spatial-dot]').style.transform=`translate(${x*44}px,${z*15-y*27}px) scale(${1+z*.075})`;
      frame=requestAnimationFrame(animate);
    }
    animate();
  });
  updateCurve();
})();

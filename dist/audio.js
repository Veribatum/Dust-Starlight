export const MUSIC={frontier:{file:'outer-reach.mp3',name:'A Sky Full of Trouble'},industrial:{file:'quiet-iron.mp3',name:'Quiet Iron'},combat:{file:'red-contact.mp3',name:'Red Contact'}};
export class ShipAudio {
  constructor(){this.enabled=true;this.musicEnabled=true;this.musicVolume=.55;this.effectsVolume=.55;this.started=false;this.ctx=null;this.music=null;this.musicKey=null;this.previousMusic=null;this.fade=null;this.blocked=false;
    try{const p=JSON.parse(localStorage.getItem('dust-starlight-audio')||'{}');for(const k of ['enabled','musicEnabled'])if(typeof p[k]==='boolean')this[k]=p[k];for(const k of ['musicVolume','effectsVolume'])if(Number.isFinite(p[k]))this[k]=Math.max(0,Math.min(1,p[k]));}catch{}
  }
  get trackName(){return MUSIC[this.musicKey||'frontier'].name;}
  preferences(){try{localStorage.setItem('dust-starlight-audio',JSON.stringify({enabled:this.enabled,musicEnabled:this.musicEnabled,musicVolume:this.musicVolume,effectsVolume:this.effectsVolume}));}catch{}}
  start(){
    if(this.started){this.ctx?.resume().catch(()=>{});if(this.musicEnabled)this.playMusic();return;}this.started=true;
    try{const Context=window.AudioContext||window.webkitAudioContext;if(Context){this.ctx=new Context();const ctx=this.ctx;this.master=ctx.createGain();this.master.gain.value=this.enabled?this.effectsVolume:0;this.master.connect(ctx.destination);
      const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+Math.random()*.04-.02)*.985;data[i]=last*3;}
      this.engine=ctx.createBufferSource();this.engine.buffer=buffer;this.engine.loop=true;this.filter=ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=160;this.gain=ctx.createGain();this.gain.gain.value=0;this.engine.connect(this.filter);this.filter.connect(this.gain);this.gain.connect(this.master);this.engine.start();ctx.resume().catch(()=>{});
    }}catch{this.enabled=false;}if(this.musicEnabled)this.setTrack('frontier',false);
  }
  playMusic(){if(!this.music){this.setTrack(this.musicKey||'frontier',false);return;}this.music.volume=this.musicVolume;this.music.play().then(()=>{this.blocked=false;}).catch(()=>{this.blocked=true;});}
  setTrack(key,crossfade=true){
    if(!this.started||!this.musicEnabled)return;const next=new window.Audio(new URL('./music/'+MUSIC[key].file,import.meta.url).href);next.loop=true;next.preload='auto';next.volume=crossfade?0:this.musicVolume;
    if(this.previousMusic)this.previousMusic.pause();this.previousMusic=this.music;this.music=next;this.musicKey=key;this.fade=crossfade&&this.previousMusic?{start:performance.now(),duration:1500}:null;
    next.play().then(()=>{this.blocked=false;}).catch(()=>{this.blocked=true;});if(!this.fade&&this.previousMusic){this.previousMusic.pause();this.previousMusic=null;}
  }
  toggleMusic(){this.musicEnabled=!this.musicEnabled;if(this.musicEnabled)this.playMusic();else{this.music?.pause();this.previousMusic?.pause();this.fade=null;}this.preferences();return this.musicEnabled;}
  toggle(){this.enabled=!this.enabled;if(this.master)this.master.gain.setTargetAtTime(this.enabled?this.effectsVolume:0,this.ctx.currentTime,.12);this.preferences();return this.enabled;}
  setVolume(channel,value){value=Math.max(0,Math.min(1,value));if(channel==='music'){this.musicVolume=value;if(this.music&&!this.fade)this.music.volume=value;}else{this.effectsVolume=value;if(this.master)this.master.gain.setTargetAtTime(this.enabled?value:0,this.ctx.currentTime,.1);}this.preferences();}
  tone(freq,duration=.15,type='sine',volume=.13,endFreq){if(!this.ctx||!this.enabled)return;const ctx=this.ctx,t=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);if(endFreq)osc.frequency.exponentialRampToValueAtTime(endFreq,t+duration);gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(gain);gain.connect(this.master);osc.start();osc.stop(t+duration+.05);}
  event(type){if(type==='shot')this.tone(650,.09,'sawtooth',.04,170);else if(type==='missile')this.tone(90,.35,'sawtooth',.17,30);else if(type==='impact')this.tone(90,.1,'triangle',.15,40);else if(type==='explosion'||type==='death'){this.tone(68,.6,'sawtooth',.24,18);this.tone(130,.5,'triangle',.13,30);}else if(type==='salvage'||type==='success'){this.tone(440,.22,'sine',.13);setTimeout(()=>this.tone(660,.32,'sine',.13),130);}else if(type==='jump'){this.tone(70,2,'sawtooth',.09,850);this.tone(105,2.2,'triangle',.12,1300);}else if(type==='click')this.tone(330,.07,'sine',.06);}
  update(sim,mode){
    if(this.ctx){const t=this.ctx.currentTime,flight=mode==='flight'||mode==='departure'||mode==='jump';this.gain.gain.setTargetAtTime(flight?.035+sim.throttle*.04+(sim.boosting?.1:0):.006,t,.2);this.filter.frequency.setTargetAtTime(flight?150+sim.speed*2.5:110,t,.2);}
    if(this.started&&this.musicEnabled){const fight=mode==='flight'&&(sim.lastHit<5||sim.entities.some(e=>e.kind==='pirate'&&!e.dead&&sim.distance(e)<800));const desired=fight?'combat':['cinder','hush','deadlight'].includes(sim.state.system)?'industrial':'frontier';if(desired!==this.musicKey)this.setTrack(desired);
      if(this.fade){const mix=Math.min(1,(performance.now()-this.fade.start)/this.fade.duration);this.music.volume=this.musicVolume*mix;if(this.previousMusic)this.previousMusic.volume=this.musicVolume*(1-mix);if(mix>=1){this.previousMusic?.pause();this.previousMusic=null;this.fade=null;}}
    }
  }
  suspend(){this.ctx?.suspend().catch(()=>{});this.music?.pause();this.previousMusic?.pause();}
  resume(){this.ctx?.resume().catch(()=>{});if(this.started&&this.musicEnabled)this.playMusic();}
}

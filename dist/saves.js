import {SAVE_KEY,STORY,validateSave,saveState} from './world.js';

export const SAVE_SLOTS=['slot-1','slot-2','slot-3'];
const PREFIX='dust-and-starlight-voyage-v1:';
const META_KEY=PREFIX+'autosave-time';
const copy=value=>JSON.parse(JSON.stringify(value));

export class VoyageSaves {
  constructor(storage){
    try{this.storage=storage===undefined?globalThis.localStorage:storage;}catch{this.storage=null;}
  }
  read(id){
    if(!['auto','previous',...SAVE_SLOTS].includes(id))return null;
    try{
      const raw=this.storage?.getItem(id==='auto'?SAVE_KEY:PREFIX+id);if(!raw)return null;
      const value=JSON.parse(raw),state=validateSave(id==='auto'?value:value?.version===1?value.state:null);
      if(!state)return {id,invalid:true,state:null,savedAt:0};
      let stamp=value.savedAt;if(id==='auto')try{stamp=Number(this.storage.getItem(META_KEY));}catch{stamp=0;}
      return {id,state,savedAt:Number.isFinite(stamp)&&stamp>0?stamp:0};
    }catch{return {id,invalid:true,state:null,savedAt:0};}
  }
  list(){return ['auto',...SAVE_SLOTS,'previous'].map(id=>this.read(id)||{id,state:null,savedAt:0});}
  load(id){const record=this.read(id);return record?.state?validateSave(copy(record.state)):null;}
  autosave(state){
    let valid;try{valid=validateSave(copy(state));}catch{return false;}
    if(!valid||!saveState(valid,this.storage))return false;
    // The version-1 voyage remains the canonical autosave for older exports.
    try{this.storage.setItem(META_KEY,String(Date.now()));}catch{}
    return true;
  }
  write(id,state){
    if(id!=='previous'&&!SAVE_SLOTS.includes(id))return false;
    try{
      const valid=validateSave(copy(state));if(!valid)return false;
      this.storage.setItem(PREFIX+id,JSON.stringify({version:1,savedAt:Date.now(),state:valid}));return true;
    }catch{return false;}
  }
  saveSlot(id,state){return SAVE_SLOTS.includes(id)&&this.write(id,state);}
  backup(state){return this.write('previous',state);}
  remove(id){
    if(!SAVE_SLOTS.includes(id))return false;
    try{this.storage.removeItem(PREFIX+id);return true;}catch{return false;}
  }
}

export function voyageSummary(record){
  const state=record?.state;if(!state)return null;
  const minutes=Math.floor(state.time/60),hours=Math.floor(minutes/60);
  return {chapter:state.storyDone?'Story complete':'Chapter '+(state.storyStage+1)+' / '+STORY.length,
    playtime:hours?hours+' h '+minutes%60+' min':minutes+' min',
    objective:state.missions.find(m=>m.story)?.title||state.missions[0]?.title||'Free flight'};
}

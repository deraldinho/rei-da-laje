const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

export function normalizePhysicalAction(name){
  const n=String(name||'').trim().toLowerCase();
  if(['soltar','solta','descarregar','descarrego','dar linha'].includes(n))return 'descarregar';
  if(['embicar','desbicar','despicar','desbicada','despicada'].includes(n))return 'despicar';
  if(['puxar','puxa','puxao','puxão'].includes(n))return 'puxar';
  if(['pegar','aparar','aparar_retao','aparar_despicada'].includes(n))return n==='pegar'?'aparar':n;
  return n;
}

export class PlayerIntentController{
  constructor(kite){
    this.kite=kite;
    this.spoolCommand=0;
    this.debicoTorque=0;
    this.trimPitch=0;
    this.tensionAssist=0;
    this.reelVelocity=0;
    this.liftIntent=0;
    this.steerIntent=0;
    this.currentAction=null;
    this.actionTimer=0;
    this.actionDuration=0;
    this.customSteer=null;
    this.intensity=1;
    this.tenteioPulseTimer=0;
    this.intentEnvelope=null;
  }

  triggerIntentEnvelope(envelope={}){
    const duration=clamp(envelope.duration??.8,.3,2);
    this.intentEnvelope={source:String(envelope.source||'comment'),
      spoolCommand:clamp(envelope.spoolCommand??0,-1,1),debicoTorque:clamp(envelope.debicoTorque??0,-1.2,1.2),
      trimPitch:clamp(envelope.trimPitch??0,-.4,.4),tensionAssist:clamp(envelope.tensionAssist??0,-.4,.4)};
    this.currentAction='comment_gesture';this.actionDuration=duration;this.actionTimer=duration;
    this.intensity=clamp(envelope.intensity??1,.35,1.5);this.customSteer=null;
    return this.currentAction;
  }
  triggerAction(actionName,duration=1.2,options={}){
    this.currentAction=normalizePhysicalAction(actionName);
    this.actionDuration=Math.max(.2,Number(duration)||1.2);
    this.actionTimer=this.actionDuration;
    this.customSteer=Number.isFinite(options.steerDir)?clamp(options.steerDir,-1,1):null;
    this.intensity=clamp(options.intensity||1,.5,2.5);
    return this.currentAction;
  }

  actionDirection(wind){
    if(this.customSteer!==null)return this.customSteer||1;
    const wx=Number(wind?.x)||0;
    if(Math.abs(wx)>.05)return Math.sign(wx);
    const rate=Number(this.kite?.attitude?.headingRate)||0;
    return Math.abs(rate)>.02?Math.sign(rate):1;
  }

  update(dt=1/60,wind=null,allKites=[]){
    const seconds=Math.max(.001,Math.min(.05,Number(dt)||1/60));
    this.spoolCommand*=Math.pow(.25,seconds*60);
    this.debicoTorque*=Math.pow(.35,seconds*60);
    this.trimPitch*=Math.pow(.55,seconds*60);
    this.tensionAssist*=Math.pow(.45,seconds*60);

    if(this.actionTimer>0&&this.currentAction){
      this.actionTimer=Math.max(0,this.actionTimer-seconds);
      const progress=clamp(1-this.actionTimer/Math.max(.001,this.actionDuration),0,1);
      const dir=this.actionDirection(wind);
      const gain=this.intensity;
      switch(this.currentAction){
        case 'comment_gesture':{
          const e=this.intentEnvelope||{};
          this.spoolCommand=clamp((Number(e.spoolCommand)||0)*gain,-1,1);
          this.debicoTorque=clamp((Number(e.debicoTorque)||0)*gain,-1.2,1.2);
          this.trimPitch=clamp((Number(e.trimPitch)||0)*gain,-.4,.4);
          this.tensionAssist=clamp((Number(e.tensionAssist)||0)*gain,-.4,.4);
          break;
        }        case 'puxar':
          this.spoolCommand=-1;
          this.trimPitch=-.24*gain;
          this.tensionAssist=.24*gain;
          break;
        case 'descarregar':
          this.spoolCommand=1;
          this.trimPitch=.03;
          this.tensionAssist=-.16;
          break;
        case 'despicar':
          this.spoolCommand=.58;
          this.debicoTorque=dir*.95*gain;
          this.trimPitch=.08;
          this.tensionAssist=-.08;
          break;
        case 'tenteio':{
          this.tenteioPulseTimer+=seconds*15;
          const pulse=Math.sin(this.tenteioPulseTimer);
          this.spoolCommand=pulse>=0?-.72:.52;
          this.debicoTorque=Math.cos(this.tenteioPulseTimer*.7)*.18;
          this.trimPitch=-pulse*.08;
          this.tensionAssist=pulse>0?.14:0;
          break;
        }
        case 'retao':{
          if(progress<.28){
            this.spoolCommand=.9;
            this.debicoTorque=dir*.18;
            this.tensionAssist=-.12;
          }else if(progress<.52){
            this.spoolCommand=.48;
            this.debicoTorque=dir*1.74*gain;
            this.trimPitch=.10;
            this.tensionAssist=-.08;
          }else{
            this.spoolCommand=-1;
            this.debicoTorque=dir*.06;
            this.trimPitch=-.28*gain;
            this.tensionAssist=.32*gain;
          }
          break;
        }
        case 'mergulho':
          if(progress<.58){
            this.spoolCommand=.62;
            this.debicoTorque=dir*.28*gain;
            this.trimPitch=.88;
            this.tensionAssist=-.10;
          }else{
            this.spoolCommand=-.82;
            this.debicoTorque=dir*.08;
            this.trimPitch=-.48;
            this.tensionAssist=.22;
          }
          break;
        case 'relo_lateral':
          this.spoolCommand=-.48;
          this.debicoTorque=dir*.72*gain;
          this.trimPitch=-.08;
          this.tensionAssist=.16;
          break;
        case 'largada':
          this.spoolCommand=.82;
          this.debicoTorque=dir*.16;
          this.trimPitch=-.04;
          this.tensionAssist=-.14;
          break;
        case 'mergulho_parafuso':
          this.spoolCommand=.46;
          this.debicoTorque=dir*1.18*gain;
          this.trimPitch=.92;
          this.tensionAssist=-.06;
          break;
        case 'lacada':
          this.spoolCommand=-.28;
          this.debicoTorque=dir*.82*gain;
          this.trimPitch=.02;
          this.tensionAssist=.10;
          break;
        case 'mestre_do_ceu':
          this.spoolCommand=progress<.35?.58:-.92;
          this.debicoTorque=dir*(progress<.5?.86:.22)*gain;
          this.trimPitch=progress<.35?.12:-.24;
          this.tensionAssist=progress<.35?-.08:.28;
          break;
        case 'perseguir':
          this.spoolCommand=-.55;
          this.debicoTorque=dir*.42*gain;
          this.trimPitch=-.08;
          this.tensionAssist=.12;
          break;
        case 'aparar':
        case 'aparar_retao':
        case 'aparar_despicada':
          this.spoolCommand=.38;
          this.debicoTorque=-dir*.28;
          this.trimPitch=.04;
          this.tensionAssist=-.08;
          break;
        default:
          this.spoolCommand=0;
      }
      if(this.actionTimer<=0){if(this.currentAction==='comment_gesture')this.intentEnvelope=null;this.currentAction=null;}
    }else{
      this.applyAutoFlightTrim(wind);
    }

    // Campos legados permanecem apenas como adaptadores durante a migração.
    this.reelVelocity=this.spoolCommand*(this.spoolCommand<0?4.8:5.2);
    this.liftIntent=-this.trimPitch*2.3;
    this.steerIntent=this.debicoTorque;
    return {spoolCommand:this.spoolCommand,debicoTorque:this.debicoTorque,trimPitch:this.trimPitch,
      tensionAssist:this.tensionAssist,reelVelocity:this.reelVelocity,liftIntent:this.liftIntent,steerIntent:this.steerIntent};
  }

  applyAutoFlightTrim(wind){
    const wy=Number(wind?.y)||0;
    const wz=Number(wind?.z)||0;
    this.spoolCommand=0;
    this.debicoTorque=clamp(wz*.025,-.05,.05);
    this.trimPitch=clamp(-wy*.06,-.04,.04);
    this.tensionAssist=0;
  }

}

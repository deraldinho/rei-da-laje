import { createCommentGesture } from './CommentGestureEngine.js';
import { createInteractionGesture } from './InteractionGestureEngine.js';

/** Amortece entradas da live sem criar um segundo controlador físico. */
export class LiveInputBuffer {
  constructor(kite) {
    this.kite = kite;
    this.commentEnergy = 0;
    this.likeEnergy = 0;
    this.pendingCommands = [];
    this.lastCommandTime = 0;
  }

  addComment(text = '', user = null, context = {}) {
    const clean = String(text || '').trim().toLowerCase();
    if (!clean) return null;
    this.commentEnergy = Math.min(50, this.commentEnergy + 1.2);
    const userId = String(user || this.kite?.userId || 'anon');
    const gesture = createCommentGesture({ text: clean, userId, kite: this.kite,
      wind: context.wind || null, lineDensity: context.lineDensity || null,
      engagement: Number(context.engagement) || 0 });
    if (!gesture) return null;
    return this._enqueue({ gesture, at:Number(context.nowMs)||Date.now(), text:clean, userId, type:'comment', count:1 }, 220);
  }
  addInteraction(type='interaction', count=1, context={}) {
    const kind=String(type||'interaction').toLowerCase();
    if(kind==='comment') return this.addComment(context.text||'',context.userId||this.kite?.userId,context);
    const safeCount=Math.max(1,Math.min(1000,Number(count)||1));
    if(kind==='like')this.likeEnergy=Math.min(40,this.likeEnergy+Math.min(100,safeCount)*.4);
    const userId=String(context.userId||this.kite?.userId||'anon');
    const gesture=createInteractionGesture({type:kind,count:safeCount,userId,kite:this.kite,wind:context.wind||null});
    return this._enqueue({gesture,at:Number(context.nowMs)||Date.now(),text:'',userId,type:kind,count:safeCount},kind==='like'?240:120);
  }

  _enqueue(item,coalesceMs=0){
    const last=this.pendingCommands[this.pendingCommands.length-1];
    if(last&&last.userId===item.userId&&last.type===item.type&&item.at-last.at<coalesceMs){
      if(item.type==='like'){
        last.count=Math.min(1000,(Number(last.count)||1)+(Number(item.count)||1));
        last.gesture=createInteractionGesture({type:'like',count:last.count,userId:item.userId,kite:this.kite});
      }else last.gesture=item.gesture;
      last.at=item.at;return last.gesture;
    }
    this.pendingCommands.push(item);if(this.pendingCommands.length>5)this.pendingCommands.shift();return item.gesture;
  }

  addLikes(count = 1) { return this.addInteraction('like',count); }
  step(dt = 1 / 60, intentController = null, context = {}) {
    const seconds = Math.max(0, Math.min(.1, Number(dt) || 1 / 60));
    this.commentEnergy *= Math.pow(0.92, seconds * 60);
    this.likeEnergy *= Math.pow(0.94, seconds * 60);
    if (!intentController) return;

    const now = Number(context.nowMs) || Date.now();
    const free = !intentController.currentAction || intentController.actionTimer <= .15;
    if (this.pendingCommands.length > 0 && free && now - this.lastCommandTime >= 160) {
      const next = this.pendingCommands.shift();
      intentController.triggerIntentEnvelope?.(next.gesture);
      this.lastCommandTime = now;
    }

    if (this.likeEnergy > 1 && !intentController.currentAction) {
      const lift = Math.min(.35, this.likeEnergy * .02);
      intentController.trimPitch -= lift * .12;
      intentController.tensionAssist += lift * .08;
    }
  }
}

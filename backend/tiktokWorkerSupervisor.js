const { TIKTOK_FAILURE, classifyTikTokFailure, nextTikTokRetry } = require('./tiktokRecoveryPolicy');

const ACTIVITY_EVENTS=[
  'unknown','member','social','roomUserSeq','control','follow','share','join','liveIntro','roomMessage',
  'caption','goalUpdate','imDelete','rankUpdate','poll','envelope','roomPin','unauthorizedMember',
  'linkMicMethod','linkMicBattle','linkMicArmies','linkMessage','linkLayer','linkMicLayoutState',
  'giftPanelUpdate','inRoomBanner','guide','emoteChat','questionNew','subNotify','barrage','hourlyRank',
  'msgDetect','linkMicFanTicket','roomVerify','oecLiveShopping','giftBroadcast','rankText',
  'giftDynamicRestriction','viewerPicksUpdate','accessControl','accessRecall','alertBoxAuditResult',
  'bindingGift','boostCard','bottom','gameRankNotify','giftPrompt','linkState','linkMicBattlePunishFinish',
  'linkmicBattleTask','marqueeAnnouncement','notice','notify','partnershipDropsUpdate',
  'partnershipGameOffline','partnershipPunish','perception','speaker','subCapsule','subPinEvent',
  'subscriptionNotify','toast','system','liveGameIntro'
];

const issueFrom = error => ({
  code:String(error?.code || error?.cause?.code || 'TRANSPORT_WARNING'),
  kind:classifyTikTokFailure(error),
  name:String(error?.name || error?.cause?.name || '').slice(0,80),
  detail:String(error?.message || error?.cause?.message || '').slice(0,240),
  message:classifyTikTokFailure(error)===TIKTOK_FAILURE.LIVE_NOT_FOUND
    ? 'Live não encontrada pelo conector.'
    : 'Falha transitória no transporte TikTok.'
});

const waitMs = ms => new Promise(resolve=>setTimeout(resolve,ms));

async function superviseTikTok({
  username,createClient,send,isStopping=()=>false,setCurrentClient=()=>{},
  sleep=waitMs,maxRecoveryFailures=20,onDeviceBlocked=()=>{},random=Math.random
}) {
  let everLocated=false;
  let consecutiveFailures=0;
  let retryAttempt=0;
  let cycle=0;

  while(!isStopping()){
    cycle++;
    let locatedThisCycle=false;
    let restoredThisCycle=false;
    let liveEndedThisCycle=false;
    let lastActivitySignalAt=0;
    let client=null;
    let retry=null;
    let failureKind=null;

    const markActivity=()=>{
      const now=Date.now();
      consecutiveFailures=0;
      retryAttempt=0;
      if(now-lastActivitySignalAt>=5000 || lastActivitySignalAt===0){
        lastActivitySignalAt=now;
        send('transport_activity',{cycle,at:now});
      }
      if(everLocated && cycle>1 && !restoredThisCycle){
        restoredThisCycle=true;
        send('transport_restored',{cycle,at:now});
      }
    };

    try{
      client=await createClient(username);
      setCurrentClient(client);

      for(const name of ['chat','gift','like','follow']){
        client.on(name,data=>{markActivity();send(name,data);});
      }
      for(const name of ACTIVITY_EVENTS){
        if(['chat','gift','like','follow'].includes(name)) continue;
        client.on(name,()=>markActivity());
      }
      client.on('liveEnded',data=>{
        liveEndedThisCycle=true;
        send('liveEnded',data);
      });

      client.on('connected',data=>{
        locatedThisCycle=true;
        liveEndedThisCycle=false;
        retryAttempt=0;
        if(!everLocated){
          everLocated=true;
          consecutiveFailures=0;
          send('connected',data);
        }else{
          send('room_relocated',{roomId:data?.roomId||null,cycle});
        }
      });

      client.on('reconnecting',event=>{
        if(event?.deviceBlocked)onDeviceBlocked();
        send('reconnecting',{
          attempt:Number(event?.attempt)||0,
          maxRetries:Number(event?.maxRetries)||0,
          delayMs:Number(event?.delayMs)||0,
          cycle
        });
      });

      client.on('error',error=>{
        if(locatedThisCycle || everLocated) send('transport_diagnostic',issueFrom(error));
      });

      await client.connect();
      if(isStopping()) break;
      failureKind=liveEndedThisCycle ? TIKTOK_FAILURE.LIVE_ENDED : TIKTOK_FAILURE.TRANSPORT_FAILURE;
      retryAttempt++;
      retry=nextTikTokRetry({kind:failureKind,attempt:retryAttempt,random});
      if(retry.countsTowardExhaustion) consecutiveFailures++;
      send('transport_cycle_end',{cycle,located:locatedThisCycle,restored:restoredThisCycle,kind:failureKind});
    }catch(error){
      if(isStopping()) break;
      failureKind=classifyTikTokFailure(error);
      retryAttempt++;
      retry=nextTikTokRetry({kind:failureKind,attempt:retryAttempt,random});
      if(retry.countsTowardExhaustion) consecutiveFailures++;
      const issue=issueFrom(error);
      if(retry.slow) send('waiting_for_live',{...issue,attempt:retryAttempt,delayMs:retry.delayMs,cycle});
      else send('transport_warning',issue);
    }finally{
      try{await client?.disconnect?.();}catch(_){}
      setCurrentClient(null);
    }

    if(isStopping()) break;
    if(retry?.countsTowardExhaustion && consecutiveFailures>=maxRecoveryFailures){
      send('disconnected',{code:'SUPERVISOR_EXHAUSTED',failures:consecutiveFailures,kind:failureKind});
      return false;
    }

    const delayMs=retry?.delayMs || 750;
    send('reconnecting',{
      attempt:retryAttempt,
      maxRetries:retry?.countsTowardExhaustion ? maxRecoveryFailures : 0,
      delayMs,
      cycleRestart:true,
      slow:Boolean(retry?.slow),
      kind:failureKind
    });
    await sleep(delayMs);
  }

  return true;
}

module.exports={superviseTikTok,issueFrom};

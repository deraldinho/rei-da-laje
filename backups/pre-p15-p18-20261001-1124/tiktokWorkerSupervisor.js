const DEFAULT_DELAYS=[750,1500,3000,5000,8000,12000];
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
  name:String(error?.name || error?.cause?.name || '').slice(0,80),
  detail:String(error?.message || error?.cause?.message || '').slice(0,240),
  message:/not currently live|offline/i.test(String(error?.message||''))
    ? 'Live não encontrada pelo conector.'
    : 'Falha transitória no transporte TikTok.'
});

const waitMs = ms => new Promise(resolve=>setTimeout(resolve,ms));

/**
 * Mantém o mesmo worker durante trocas normais de WebSocket.
 * O upstream não zera o contador interno após uma reconexão saudável,
 * então cada ciclo recebe um cliente novo antes desse contador virar queda definitiva.
 */
async function superviseTikTok({
  username,createClient,send,isStopping=()=>false,setCurrentClient=()=>{},
  sleep=waitMs,maxRecoveryFailures=20,onDeviceBlocked=()=>{}
}) {
  let everLocated=false;
  let consecutiveFailures=0;
  let cycle=0;

  while(!isStopping()){
    cycle++;
    let locatedThisCycle=false;
    let restoredThisCycle=false;
    let lastActivitySignalAt=0;
    let client=null;

    const markActivity=()=>{
      const now=Date.now();
      consecutiveFailures=0;
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
      // Qualquer evento decodificado pelo pacote prova que o WSS está recebendo frames válidos.
      for(const name of ACTIVITY_EVENTS){ if(['chat','gift','like','follow'].includes(name)) continue; client.on(name,()=>markActivity()); }
      client.on('liveEnded',data=>send('liveEnded',data));

      client.on('connected',data=>{
        locatedThisCycle=true;
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
        // O pacote também usa `error` para falha de decode de frame. Só `reconnecting` confirma queda do WSS.
        if(locatedThisCycle || everLocated) send('transport_diagnostic',issueFrom(error));
      });

      await client.connect();
      if(isStopping()) break;
      consecutiveFailures++;
      send('transport_cycle_end',{cycle,located:locatedThisCycle,restored:restoredThisCycle});
    }catch(error){
      if(isStopping()) break;
      if(!everLocated){
        send('error',issueFrom(error));
        return false;
      }
      consecutiveFailures++;
      send('transport_warning',issueFrom(error));
    }finally{
      try{await client?.disconnect?.();}catch(_){}
      setCurrentClient(null);
    }

    if(isStopping()) break;
    if(consecutiveFailures>=maxRecoveryFailures){
      send('disconnected',{code:'SUPERVISOR_EXHAUSTED',failures:consecutiveFailures});
      return false;
    }

    const delayMs=DEFAULT_DELAYS[Math.min(consecutiveFailures-1,DEFAULT_DELAYS.length-1)];
    send('reconnecting',{
      attempt:consecutiveFailures,
      maxRetries:maxRecoveryFailures,
      delayMs,
      cycleRestart:true
    });
    await sleep(delayMs);
  }

  return true;
}

module.exports={superviseTikTok,issueFrom};

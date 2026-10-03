// Conector independente: não usa a assinatura da Euler Stream.
const { firstHttps, normalizeUser, normalizeGiftEvent } = require('./tiktokEventNormalizer');
const playerSpawnPayload = require('./playerSpawnPayload');
const { classifyConnectionError } = require('./tiktokDiagnostics');
const LiveActivityMonitor = require('./liveActivityMonitor');

/**
 * Serviço de Conexão com o TikTok Live WebCast
 * Transforma eventos brutos da live nos contratos padronizados do jogo
 */
class TikTokService {
  constructor(io, gameRules, buffManager, clientFactory = null) {
    this.clientFactory = clientFactory;
    this.connectGeneration = 0;
    this.io = io;
    this.gameRules = gameRules;
    this.buffManager = buffManager;
    this.connection = null;
    this.isConnected = false;
    this.currentUsername = null;
    this.hasReceivedEvent = false;
    this.connectionFailures = 0;
    this.lastConnectionError = null;
    this.lastEventAt = null;
    this.eventCounts = { chat: 0, gift: 0, like: 0, follow: 0, share: 0 };
    this.lastRoomLocatedAt = null;
    this.roomFoundCount = 0;
    this.transportReconnecting = false;
    this.transportWarnings = 0;
    this.transportRecoveries = 0;
    this.lastTransportRecoveredAt = null;
    this.lastTransportActivityAt = null;
    this.lastTransportWarning = null;
    this.internalRetry = null;
    this.recentGiftMessages = new Map();
    this.chatCommandState = new Map();
    this.chatActionsEnabled = false;
    this.activityMonitor = new LiveActivityMonitor();
    this.replayStore = null;
    this.playerPlatform = null;
    this.onLiveEnded = null;
  }

  /**
   * Conecta a uma Live ativa do TikTok usando o @username
   */
  async connect(username) {
    if (!username) throw new Error('Username é obrigatório');
    const cleanUsername = String(username).replace(/^@/, '').trim();
    if (!/^[a-zA-Z0-9._]{2,24}$/.test(cleanUsername)) throw new Error('Informe um @usuário válido do TikTok.');

    if (this.connection && this.currentUsername === cleanUsername) {
      return {
        success: true,
        waiting: !this.isConnected,
        message: this.isConnected ? `Já conectado a @${cleanUsername}` : `Aguardando Live de @${cleanUsername}`
      };
    }

    if (this.connection) await this.disconnect();
    const generation = ++this.connectGeneration;

    try {
      this.currentUsername = cleanUsername;
      const factory = this.clientFactory || (async name => {
        const IsolatedTikTokClient = require('./isolatedTikTokClient');
        return new IsolatedTikTokClient(name);
      });
      const client = await factory(cleanUsername);
      if (generation !== this.connectGeneration) {
        await client.disconnect();
        throw new Error('Tentativa de conexão substituída.');
      }
      this.connection = client;

      this.setupListeners();

      // O worker pode localizar a sala imediatamente ou permanecer vivo aguardando
      // a próxima Live do perfil salvo. Não destruir o subprocesso só porque a Live
      // ainda não começou.
      const state = await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (error, result) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          client.off('connected', onConnected);
          client.off('waiting_for_live', onWaiting);
          client.off('error', onInitialError);
          if (error) reject(error);
          else resolve(result);
        };
        const onConnected = info => finish(null, { phase: 'connected', info });
        const onWaiting = info => finish(null, { phase: 'waiting', info });
        const onInitialError = error => finish(error);
        const timer = setTimeout(() => finish(new Error('Tempo esgotado ao iniciar supervisor TikTok')), 20000);
        client.on('connected', onConnected);
        client.on('waiting_for_live', onWaiting);
        client.on('error', onInitialError);
        Promise.resolve().then(() => client.connect()).catch(onInitialError);
      });
      if (generation !== this.connectGeneration) {
        await client.disconnect();
        return { success: false, message: 'Tentativa substituída.' };
      }
      if (state.phase === 'waiting') {
        return { success: true, waiting: true, retryInMs: Number(state.info?.delayMs) || null };
      }
      return { success: true, roomId: state.info?.roomId || null };
    } catch (err) {
      this.isConnected = false;
      this.hasReceivedEvent = false;
      this.transportReconnecting = false;
      if (this.connection) {
        const failedClient = this.connection;
        this.connection = null;
        try { await failedClient.disconnect(); } catch (_) { /* encerramento já iniciado */ }
      }
      this.currentUsername = null;
      this.connectionFailures++;
      this.lastConnectionError = { code: classifyConnectionError(err), at: Date.now() };
      console.error(`[TikTok Live] Falha ao conectar a @${cleanUsername}: ${/not currently live|offline/i.test(String(err.message)) ? 'Live não detectada como ativa' : 'erro de conexão (detalhes omitidos)'}`);
      this.io.emit('tiktok:status', {
        connected: false,
        username: cleanUsername,
        error: /not currently live|offline/i.test(String(err.message))
          ? 'Este conector não encontrou uma Live ativa nesse @usuário. Confirme o perfil e a transmissão pública.'
          : 'O conector independente não conseguiu abrir a Live. Verifique o @usuário e tente novamente.'
      });
      throw err;
    }
  }

  /**
   * Desconecta da live
   */
  async disconnect() {
    this.connectGeneration++;
    if (this.connection) {
      const client = this.connection;
      this.connection = null;
      try {
        await client.disconnect();
      } catch (e) {
        // ignore
      }
      this.connection = null;
      this.currentUsername = null;
      this.isConnected = false;
      this.hasReceivedEvent = false;
      this.transportReconnecting = false;
      this.io.emit('tiktok:status', { connected: false, username: null });
      console.log('[TikTok Live] Desconectado.');
    }
  }

  markRoomLocated(client, info = {}) {
    if (this.connection !== client) return;
    const wasConnected = this.isConnected;
    this.isConnected = true;
    this.hasReceivedEvent = false;
    this.transportReconnecting = false;
    this.internalRetry = null;
    this.lastRoomLocatedAt = Date.now();
    if (!wasConnected) this.roomFoundCount++;
    this.lastConnectionError = null;
    this.io.emit('tiktok:status', {
      connected: true,
      username: this.currentUsername,
      roomId: info?.roomId || null,
      phase: 'room_found',
      retrying: false
    });
  }

  markWaitingForLive(client, info = {}) {
    if (this.connection !== client) return;
    this.isConnected = false;
    this.hasReceivedEvent = false;
    this.transportReconnecting = true;
    this.internalRetry = {
      attempt: Math.max(1, Number(info?.attempt) || 1),
      maxRetries: 0,
      delayMs: Math.max(0, Number(info?.delayMs) || 0)
    };
    this.lastConnectionError = { code: String(info?.kind || info?.code || 'LIVE_NOT_FOUND'), at: Date.now() };
    this.activityMonitor.reconnecting(true);
    this.io.emit('tiktok:status', {
      connected: false,
      username: this.currentUsername,
      phase: 'waiting_for_live',
      retrying: true,
      retryInMs: this.internalRetry.delayMs
    });
  }

  /**
   * Registra os ouvintes de eventos da live
   */
  confirmLiveEvents() {
    if (!this.connection || this.hasReceivedEvent) return;
    this.hasReceivedEvent = true;
    this.transportReconnecting = false;
    this.internalRetry = null;
    this.isConnected = true;
    this.io.emit('tiktok:status', { connected: true, username: this.currentUsername, phase: 'events_active' });
  }

  markTransportDown(client, reason, code = '') {
    if (this.connection !== client) return;
    this.connection = null;
    this.isConnected = false;
    this.hasReceivedEvent = false;
    this.transportReconnecting = false;
    this.currentUsername = null;
    this.connectionFailures++;
    this.lastConnectionError = { code: String(code || 'TRANSPORT_CLOSED'), at: Date.now() };
    this.activityMonitor.failure(this.lastConnectionError.code, this.lastConnectionError.at);
    console.error(`[TikTok Live] Transporte interrompido (${this.lastConnectionError.code}); aguardando reconexão.`);
    this.io.emit('tiktok:status', { connected: false, error: reason, retrying: true });
    try { Promise.resolve(client.disconnect()).catch(() => {}); } catch (_) { /* worker já encerrado */ }
    this.onTransportDown?.({ code:this.lastConnectionError.code, at:this.lastConnectionError.at });
  }

  isDuplicateGift(gift, now = Date.now()) {
    const messageId=String(gift?.messageId||'');
    if(!messageId)return false;
    const key=String(gift?.roomId||'')+':'+messageId;
    const seenAt=this.recentGiftMessages.get(key);
    if(seenAt && now-seenAt<120000)return true;
    this.recentGiftMessages.set(key,now);
    if(this.recentGiftMessages.size>2000){
      for(const [id,at] of this.recentGiftMessages){
        if(now-at>120000 || this.recentGiftMessages.size>1600)this.recentGiftMessages.delete(id);
      }
    }
    return false;
  }

  recordEvent(type) {
    this.lastEventAt = Date.now();
    this.eventCounts[type] = (this.eventCounts[type] || 0) + 1;
    this.activityMonitor.record(type, this.lastEventAt);
    this.confirmLiveEvents();
  }

  ensurePlayerForInteraction(raw = {}) {
    const isSimulation=Boolean(raw.simulation);
    const stableUserId=String(raw.userId || '').trim().slice(0,128);
    const userId=stableUserId || String(raw.uniqueId || '').trim().slice(0,128);
    if(!userId)return null;
    const data={...raw,userId,uniqueId:String(raw.uniqueId||'').slice(0,60),nickname:String(raw.nickname||raw.uniqueId||'Espectador').slice(0,60),profilePictureUrl:firstHttps(raw.profilePictureUrl)};
    const persistent=isSimulation?null:(this.playerPlatform?.observeProfile?.({...data,userId:stableUserId,seenAt:Date.now()})||null);
    if(persistent?.profilePictureUrl)data.profilePictureUrl=persistent.profilePictureUrl;
    const enter=this.gameRules.handlePlayerInteraction || this.gameRules.handlePlayerComment;
    const result=enter?.call(this.gameRules,{userId:data.userId,uniqueId:data.uniqueId,nickname:data.nickname,profilePictureUrl:data.profilePictureUrl,kiteType:['peixinho','raiada','carrapeta'].includes(persistent?.loadout?.kiteKey)?persistent.loadout.kiteKey:undefined,isSimulation});
    if(result?.status==='spawn'||result?.status==='queued'||result?.status==='already_active')this.onArenaMutation?.();
    if(result?.status==='queued')this.io.emit('competition:queue',{length:this.gameRules.queue.length});
    if(result?.status==='already_active'&&result?.player&&(data.profilePictureUrl||data.nickname))this.io.emit('player:profile_updated',{userId:data.userId,nickname:result.player.nickname,profilePictureUrl:result.player.profilePictureUrl||''});
    if(result?.status==='spawn'){const snap=!isSimulation&&this.playerPlatform?this.playerPlatform.spawnSnapshot(stableUserId):persistent;this.io.emit('player:spawn',playerSpawnPayload(result.player,this.buffManager,undefined,snap));}
    return {data,result,persistent,stableUserId,isSimulation};
  }

  emitLiveInteraction(entry,type,count=1,extra={}) {
    if(!entry?.result||!['spawn','already_active'].includes(entry.result.status))return false;
    this.io.emit('competition:interaction',{userId:entry.data.userId,nickname:entry.result.player?.nickname||entry.data.nickname,type:String(type||'interaction'),count:Math.max(1,Math.min(1000,Number(count)||1)),status:entry.result.status,...extra});
    return true;
  }

  handleLike(data = {}) {
    const entry=this.ensurePlayerForInteraction(data); if(!entry)return null;
    const likeCount=Math.max(1,Number(data.likeCount||data.count||1));
    this.io.emit('likes:burst',{userId:entry.data.userId,uniqueId:entry.data.uniqueId,nickname:entry.data.nickname,likeCount,totalLikes:Number(data.totalLikes||likeCount),despike:true});
    this.emitLiveInteraction(entry,'like',likeCount); return entry.result;
  }

  handleShare(data = {}) {
    const entry=this.ensurePlayerForInteraction(data); if(!entry)return null;
    this.emitLiveInteraction(entry,'share',1); this.io.emit('share:new',{userId:entry.data.userId,nickname:entry.data.nickname}); return entry.result;
  }

  handleFollow(data = {}) {
    const entry=this.ensurePlayerForInteraction(data); if(!entry)return null;
    const payload={userId:entry.data.userId,uniqueId:entry.data.uniqueId,nickname:entry.data.nickname,profilePictureUrl:entry.data.profilePictureUrl||null,followedAt:Date.now()};
    this.emitLiveInteraction(entry,'follow',1); this.io.emit('follow:new',payload); return payload;
  }
  setupListeners() {
    if (!this.connection) return;
    const client = this.connection;

    client.on('connected', info => this.markRoomLocated(client, info));
    client.on('waiting_for_live', info => this.markWaitingForLive(client, info));

    // 1. Chat (Comentários e Comandos)
    this.connection.on('chat', (event) => {
      const data = event.data || event;
      this.recordEvent('chat');
      const normalized={ ...normalizeUser(data), comment: data.comment ?? data.content };
      this.replayStore?.record('chat', normalized);
      this.handleChatMessage(normalized);
    });

    // 2. Presentes (Gifts)
    this.connection.on('gift', (event) => {
      const data = event.data || event;
      this.recordEvent('gift');
      const gift = normalizeGiftEvent(data);
      // Presentes em sequência só são aplicados quando a sequência termina.
      if (gift.giftType === 1 && !gift.repeatEnd) return;
      if (this.isDuplicateGift(gift)) return;
      this.replayStore?.record('gift', gift);
      this.handleGift(gift);
    });

    // 3. Curtidas (Likes)
    this.connection.on('like', (event) => {
      const data=event.data||event; this.recordEvent('like'); const likeCount=Math.max(1,Number(data.likeCount||1));
      this.replayStore?.record('like',{userId:String(data.userId||data.user?.userId||''),uniqueId:String(data.uniqueId||data.user?.uniqueId||''),nickname:String(data.nickname||data.user?.nickname||data.uniqueId||''),count:likeCount});
      this.handleLike({...normalizeUser(data),likeCount,totalLikes:Number(data.totalLikes||likeCount)});
    });

    this.connection.on('share',(event)=>{ const data=event.data||event; this.recordEvent('share'); this.handleShare(normalizeUser(data)); });

    // 4. Novo seguidor
    this.connection.on('follow', (event) => {
      const data = event.data || event;
      this.recordEvent('follow');
      const follower = normalizeUser(data);
      if (!follower.userId && !follower.uniqueId) return;
      this.replayStore?.record('follow', follower);
      this.handleFollow(follower);
    });
    // Erros de EventEmitter sem listener encerram o Node.js.
    client.on('transport_warning', warning => {
      if (this.connection !== client) return;
      this.transportWarnings++;
      this.lastTransportWarning = { code: String(warning?.code || 'TRANSPORT_WARNING'), at: Date.now() };
      // Um warning pode ser apenas falha de decode de um frame; não declarar queda sem `reconnecting`.
      this.io.emit('tiktok:status', { connected: this.isConnected, username: this.currentUsername,
        phase: this.transportReconnecting ? 'reconnecting' : 'transport_warning',
        retrying: this.transportReconnecting });
    });
    client.on('transport_activity', info => {
      if (this.connection !== client) return;
      this.lastTransportActivityAt = Number(info?.at) || Date.now();
      this.activityMonitor.transport(this.lastTransportActivityAt);
    });
    client.on('room_relocated', info => {
      if (this.connection !== client) return;
      this.isConnected = true;
      this.lastRoomLocatedAt = Date.now();
      this.roomFoundCount++;
      this.transportReconnecting = true;
      this.io.emit('tiktok:status', { connected:true, username:this.currentUsername,
        phase:'room_relocated', roomId:info?.roomId || null, retrying:true });
    });
    client.on('transport_restored', info => {
      if (this.connection !== client) return;
      this.isConnected = true;
      this.transportReconnecting = false;
      this.activityMonitor.reconnecting(false);
      this.internalRetry = null;
      this.lastTransportRecoveredAt = Date.now();
      this.lastTransportActivityAt = Number(info?.at) || this.lastTransportRecoveredAt;
      this.transportRecoveries++;
      this.lastConnectionError = null;
      this.io.emit('tiktok:status', { connected: true, username: this.currentUsername,
        phase: 'transport_restored', roomId: info?.roomId || null, retrying: false });
    });
    client.on('transport_cycle_end', info => {
      if (this.connection !== client) return;
      this.transportReconnecting = true;
      this.io.emit('tiktok:status', { connected: this.isConnected, username: this.currentUsername,
        phase: this.isConnected ? 'reconnecting' : 'waiting_for_live', retrying: true, cycle: info?.cycle || null });
    });
    client.on('reconnecting', info => {
      if (this.connection !== client) return;
      if (info?.slow) {
        this.markWaitingForLive(client, info);
        return;
      }
      this.transportReconnecting = true;
      this.activityMonitor.reconnecting(true);
      this.hasReceivedEvent = false;
      this.internalRetry = {
        attempt: Math.max(0, Number(info?.attempt) || 0),
        maxRetries: Math.max(0, Number(info?.maxRetries) || 0),
        delayMs: Math.max(0, Number(info?.delayMs) || 0)
      };
      this.io.emit('tiktok:status', { connected: this.isConnected, username: this.currentUsername,
        phase: 'reconnecting', retrying: true });
    });
    client.on('liveEnded', () => {
      const wasConnected = this.isConnected;
      this.markWaitingForLive(client, { kind:'LIVE_ENDED', attempt:1, delayMs:120000 });
      if (wasConnected) {
        try { this.onLiveEnded?.(); }
        catch (error) { console.error('[TikTok Live] Falha ao encerrar arena:', error?.message || error); }
      }
    });
    client.on('error', error => {
      this.markTransportDown(client, 'Conexão com a Live interrompida. Reconexão automática em andamento.', error?.code || error?.cause?.code);
    });

    // 4. Queda de conexão
    this.connection.on('disconnected', () => {
      this.markTransportDown(client, 'Conexão com a Live perdida. Reconexão automática em andamento.');
    });
  }

  emitChatActionThrottled(userId,nickname,action,now=Date.now()) {
    if (this.chatCommandState.size > 150) { for (const [uid, st] of this.chatCommandState.entries()) { if (!st.timer && (now - (st.lastAt || 0) > 20000)) this.chatCommandState.delete(uid); } }
    const id=String(userId||''); if(!id||!action)return false;
    const state=this.chatCommandState.get(id)||{lastAt:0,pending:null,timer:null};
    const emit=cmd=>{state.lastAt=Date.now();state.pending=null;this.io.emit('competition:chat_action',{userId:id,nickname,action:cmd});};
    const wait=Math.max(0,300-(now-state.lastAt));
    if(wait===0 && !state.timer){emit(action);this.chatCommandState.set(id,state);return true;}
    state.pending=action;
    if(!state.timer){state.timer=setTimeout(()=>{state.timer=null;if(state.pending)emit(state.pending);},wait||300);state.timer.unref?.();}
    this.chatCommandState.set(id,state);return false;
  }

  /**
   * Processa uma mensagem de chat vinda da live ou do simulador
   */
  handleChatMessage(data) {
    if (!data || typeof data.comment !== 'string') return;
    const isSimulation=Boolean(data.simulation);
    const stableUserId=String(data.userId || '').trim().slice(0,128);
    const userId = stableUserId || String(data.uniqueId || '').trim().slice(0,128);
    if (!userId) return;
    data = { ...data, userId,
      uniqueId:String(data.uniqueId||'').slice(0,60),
      nickname: String(data.nickname || data.uniqueId || 'Espectador').slice(0, 60),
      profilePictureUrl:firstHttps(data.profilePictureUrl) };
    const persistent=isSimulation ? null : (this.playerPlatform?.observeProfile?.({...data,userId:stableUserId,seenAt:Date.now()}) || null);
    if(persistent?.profilePictureUrl) data.profilePictureUrl=persistent.profilePictureUrl;
    const command = this.gameRules.parseChatCommand?.(data.comment) || null;
    // Todo comentário continua servindo para entrar/reentrar; comandos exatos também controlam a própria pipa.
    // Comentário normal -> Tentativa de Spawn / Entrada no jogo
    const enterPlayer=this.gameRules.handlePlayerInteraction || this.gameRules.handlePlayerComment;
    const result = enterPlayer.call(this.gameRules,{
      userId: data.userId,
      uniqueId: data.uniqueId,
      nickname: data.nickname,
      profilePictureUrl: data.profilePictureUrl,
      kiteType: ['peixinho','raiada','carrapeta'].includes(persistent?.loadout?.kiteKey) ? persistent.loadout.kiteKey : undefined,
      isSimulation
    });

    if (result?.status === 'spawn' || result?.status === 'queued' || result?.status === 'already_active') this.onArenaMutation?.();
    if (result?.status === 'queued') this.io.emit('competition:queue', { length: this.gameRules.queue.length });
    if (result?.status === 'already_active' && result?.player && (data.profilePictureUrl || data.nickname)) {
      this.io.emit('player:profile_updated', {
        userId:data.userId,
        nickname:result.player.nickname,
        profilePictureUrl:result.player.profilePictureUrl || ''
      });
    }
    if (result && result.status === 'spawn') {
      const spawnPersistent=!isSimulation && this.playerPlatform ? this.playerPlatform.spawnSnapshot(stableUserId) : persistent;
      this.io.emit('player:spawn', playerSpawnPayload(result.player,this.buffManager,undefined,spawnPersistent));
    }
    if (result && ['spawn','already_active','queued'].includes(result.status)) {
      this.io.emit('competition:comment', {
        userId:data.userId,
        nickname:result.player?.nickname || data.nickname,
        text:String(data.comment || '').slice(0,180),
        status:result.status
      });
    }
    if (result && ['spawn','already_active'].includes(result.status)) this.io.emit('competition:interaction',{userId:data.userId,nickname:result.player?.nickname||data.nickname,type:'comment',count:1,status:result.status,text:String(data.comment||'').slice(0,180)});
    if (this.chatActionsEnabled && command && result && (result.status === 'spawn' || result.status === 'already_active')) {
      this.emitChatActionThrottled(data.userId,result.player?.nickname || data.nickname,command);
    }
  }

  /**
   * Processa um presente vindo da live ou do simulador
   */
  handleGift(data) {
    if (!data) return;
    const isSimulation=Boolean(data.simulation);
    const stableUserId=String(data.userId || '').trim().slice(0,128);
    data = { ...data, userId: stableUserId || String(data.uniqueId || '').trim().slice(0,128),
      iconUrl:firstHttps(data.iconUrl) };
    if (!data.userId) return;
    const entry=this.ensurePlayerForInteraction({...data,userId:stableUserId});
    if(entry)this.emitLiveInteraction(entry,'gift',Math.max(1,Number(data.repeatCount)||1),{giftName:String(data.giftName||'').slice(0,90)});
    const { getGiftUpgrade, getGiftUpgradeByValue } = require('./rules/giftConfig');
    const configuredUpgrade = getGiftUpgrade(data.giftId) || getGiftUpgrade(data.giftName);

    // Valor canônico: o nome do presente é apresentação; o tier é resolvido pelo total da sequência.
    const count=Math.min(1000,Math.max(1,Math.floor(Number(data.repeatCount)||1)));
    const unitCoinValue=Number.isFinite(Number(data.diamondCount)) && Number(data.diamondCount)>0
      ? Math.min(1000000,Number(data.diamondCount)) : Math.max(0,Number(configuredUpgrade?.cost)||0);
    const totalCoinValue=Math.min(1000000000,unitCoinValue*count);
    const tierName=data.giftName || configuredUpgrade?.name;
    const unitUpgrade=getGiftUpgradeByValue(tierName,unitCoinValue);
    const upgrade=getGiftUpgradeByValue(tierName,totalCoinValue);
    const sameTier=Boolean(unitUpgrade && upgrade && unitUpgrade.lineType===upgrade.lineType
      && unitUpgrade.specialAbility===upgrade.specialAbility);
    const applicationCount=sameTier?count:1;
    const giftName=String(data.giftName || configuredUpgrade?.name || ('Presente #'+String(data.giftId||'?'))).slice(0,90);
    if (!isSimulation) {
      this.playerPlatform?.observeProfile?.({
        userId:stableUserId,uniqueId:data.uniqueId,nickname:data.nickname,
        profilePictureUrl:firstHttps(data.profilePictureUrl),seenAt:Date.now()
      });
      this.giftCatalog?.observe({giftId:data.giftId,giftName,diamondCount:unitCoinValue,
        repeatCount:count,iconUrl:data.iconUrl});
    }
    this.io.emit('gift:celebration',{
      userId:data.userId,nickname:String(data.nickname||data.uniqueId||'Espectador').slice(0,60),
      giftId:String(data.giftId||''),giftName,diamondCount:unitCoinValue,repeatCount:count,
      unitCoinValue,totalCoinValue,known:Boolean(upgrade),iconUrl:String(data.iconUrl||'').slice(0,1000)
    });
    const applyTemporary=()=>{
      if (this.gameRules.recordGift?.(data.userId,count,unitCoinValue)) this.onArenaMutation?.();
      if (!upgrade) return null;
      const buff=this.buffManager.applyGiftUpgrade(data.userId,upgrade,applicationCount);
      this.io.emit('competition:maneuver',{
        userId:data.userId,giftName:upgrade.maneuverGiftName||upgrade.name,giftCost:totalCoinValue,
        repeatCount:Math.min(20,applicationCount),unitCoinValue,totalCoinValue
      });
      this.io.emit('gift:received', {
        userId:data.userId,uniqueId:data.uniqueId,giftId:String(data.giftId||upgrade.id||''),giftName,
        nickname:data.nickname||data.uniqueId||'Espectador',diamondCount:unitCoinValue,unitCoinValue,totalCoinValue,
        upgrade:{lineType:buff.lineType,powerMultiplier:buff.powerMultiplier,
          durationSeconds:upgrade.durationSeconds,specialAbility:upgrade.specialAbility}
      });
      return buff;
    };
    if(this.playerPlatform && !isSimulation){
      return this.playerPlatform.resolveGift({...data,userId:stableUserId},{
        unitCoinValue,totalCoinValue,tierKey:upgrade?.lineType||'',
        maneuverName:upgrade?.maneuverGiftName||upgrade?.name||'',
        effect:upgrade?{lineType:upgrade.lineType,specialAbility:upgrade.specialAbility}:{}
      },applyTemporary);
    }
    applyTemporary();
    return {accepted:true,duplicate:false,persistent:false,ledgerId:null};
  }
}

module.exports = TikTokService;

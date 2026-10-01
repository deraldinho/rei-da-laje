const { EventEmitter } = require('node:events');
const { fork } = require('node:child_process');
const path = require('node:path');

/** EventEmitter compatível com o serviço; subprocesso protege a arena de crashes do conector. */
class IsolatedTikTokClient extends EventEmitter {
  constructor(username) {
    super();
    this.username = username;
    this.stopping = false;
    this.child = null;
    this.failureReported = false;
  }

  reportFailure(error) {
    if (this.stopping || this.failureReported) return;
    this.failureReported = true;
    this.emit('error', error);
  }

  connect() {
    this.child = fork(path.join(__dirname, 'tiktokWorker.js'), [], {
      stdio: ['ignore', 'ignore', 'pipe', 'ipc']
    });
    this.child.stderr.on('data', chunk => {
      const line = String(chunk);
      if (/UND_ERR_SOCKET|other side closed/.test(line))
        console.error('[TikTok Worker] Conexão HTTP/2 encerrada pelo servidor remoto.');
    });
    this.child.on('message', message => {
      if (this.stopping || !message?.event) return;
      if (message.event === 'error') {
        this.reportFailure(message.payload || { code: 'WORKER_ERROR' });
        return;
      }
      if (message.event === 'disconnected') {
        this.reportFailure({ code: String(message.payload?.code || 'TRANSPORT_DISCONNECTED'),
          failures: Number(message.payload?.failures) || 0 });
        return;
      }
      // Avisos transitórios e tentativas internas não encerram o subprocesso.
      this.emit(message.event, message.payload);
    });
    this.child.on('error', error => {
      this.reportFailure({ code: error.code || 'WORKER_FAILED' });
    });
    this.child.on('exit', (code, signal) => {
      this.reportFailure({ code: 'WORKER_EXIT', message: 'Processo TikTok encerrado.', exitCode: code, signal });
    });
    this.child.send({ action: 'connect', username: this.username });
    // A conexão de eventos dura enquanto a Live estiver ativa.
    return new Promise(() => {});
  }

  disconnect() {
    this.stopping = true;
    if (this.child && this.child.connected) this.child.send({ action: 'disconnect' });
    const child = this.child;
    if (child) {
      const timer = setTimeout(() => { if (child.exitCode === null) child.kill(); }, 1800);
      timer.unref();
    }
  }
}

module.exports = IsolatedTikTokClient;

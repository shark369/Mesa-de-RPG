import { Tunnel } from 'cloudflared';

let activeTunnel = null;
let state = {
  status: 'idle', // 'idle' | 'starting' | 'connected' | 'error' | 'disabled'
  publicUrl: null,
  error: null,
  targetUrl: null
};
let notifyFn = null;
let intentionalStop = false;

function emitUpdate() {
  if (typeof notifyFn === 'function') {
    try {
      notifyFn({ ...state });
    } catch {
      // ignora erro de callback
    }
  }
}

export function getTunnelState() {
  return { ...state };
}

export function stopTunnel() {
  intentionalStop = true;
  if (activeTunnel) {
    try {
      activeTunnel.stop();
    } catch {
      // ignora
    }
    activeTunnel = null;
  }
  state = {
    ...state,
    status: 'idle',
    publicUrl: null,
    error: null
  };
  emitUpdate();
  return getTunnelState();
}

export function startTunnel(targetUrl, onUpdate) {
  if (onUpdate) notifyFn = onUpdate;

  // Em hospedagem em nuvem (Render, Railway, Fly, Heroku) não precisa abrir túnel local
  if (
    process.env.AUTO_TUNNEL === 'false' ||
    process.env.RENDER ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.FLY_APP_NAME ||
    process.env.HEROKU_APP_NAME
  ) {
    state = { status: 'disabled', publicUrl: null, error: null, targetUrl };
    emitUpdate();
    return getTunnelState();
  }

  // Fecha instância anterior antes de abrir uma nova
  if (activeTunnel) {
    intentionalStop = true;
    try {
      activeTunnel.stop();
    } catch {
      // ignora
    }
    activeTunnel = null;
  }

  intentionalStop = false;
  state = {
    status: 'starting',
    publicUrl: null,
    error: null,
    targetUrl
  };
  emitUpdate();

  try {
    const t = Tunnel.quick(targetUrl);
    activeTunnel = t;

    t.once('url', (url) => {
      if (activeTunnel !== t) return;
      state = {
        status: 'connected',
        publicUrl: url,
        error: null,
        targetUrl
      };
      console.log(`🌐 Link público na Internet aberto para amigos: ${url}`);
      emitUpdate();
    });

    t.on('error', (err) => {
      if (activeTunnel !== t) return;
      state = {
        status: 'error',
        publicUrl: state.publicUrl,
        error: err?.message || 'Erro ao iniciar túnel público.',
        targetUrl
      };
      console.error('Erro no túnel Cloudflare:', state.error);
      emitUpdate();
    });

    t.on('exit', (code) => {
      if (activeTunnel !== t) return;
      activeTunnel = null;
      if (!intentionalStop && state.status !== 'error') {
        state = {
          status: 'error',
          publicUrl: null,
          error: `Túnel encerrado (código ${code ?? 'desconhecido'}).`,
          targetUrl
        };
        emitUpdate();
      }
    });
  } catch (err) {
    state = {
      status: 'error',
      publicUrl: null,
      error: err?.message || 'Falha ao abrir túnel público.',
      targetUrl
    };
    emitUpdate();
  }

  return getTunnelState();
}

function cleanupOnExit() {
  if (activeTunnel) {
    intentionalStop = true;
    try {
      activeTunnel.stop();
    } catch {
      // ignora
    }
    activeTunnel = null;
  }
}

process.once('SIGINT', () => {
  cleanupOnExit();
  process.exit(0);
});
process.once('SIGTERM', () => {
  cleanupOnExit();
  process.exit(0);
});
process.once('exit', cleanupOnExit);

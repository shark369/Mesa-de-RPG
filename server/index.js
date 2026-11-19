import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerBestiaryRoutes } from './bestiary.js';
import { getTunnelState, startTunnel, stopTunnel } from './tunnel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '15mb' }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 15e6 // 15MB para mapas customizados e avatares
});

// Armazenamento em memória com persistência em disco
const rooms = new Map();
// Janela deslizante de timestamps de rolagens por sala/jogador ("roomId:playerName" -> number[])
const roomRollTimestamps = new Map();

function ensureRoomScenes(room) {
  if (!Array.isArray(room.drawings)) {
    room.drawings = [];
  }
  if (!Array.isArray(room.trades)) {
    room.trades = [];
  }
  if (!room.playerCharLimits || typeof room.playerCharLimits !== 'object') {
    room.playerCharLimits = {};
  }
  if (room.allowMultiCharAll === undefined) {
    room.allowMultiCharAll = false;
  }
  if (!room.rollLimit || typeof room.rollLimit !== 'object') {
    room.rollLimit = { enabled: true, maxRolls: 2, windowSeconds: 40 };
  } else {
    room.rollLimit = {
      enabled: room.rollLimit.enabled !== undefined ? Boolean(room.rollLimit.enabled) : true,
      maxRolls: Math.max(1, Math.min(20, Math.round(Number(room.rollLimit.maxRolls) || 2))),
      windowSeconds: Math.max(5, Math.min(300, Math.round(Number(room.rollLimit.windowSeconds) || 40)))
    };
  }
  if (!Array.isArray(room.scenes) || room.scenes.length === 0) {
    room.scenes = [
      {
        id: 'scene-1',
        name: 'Cena Principal',
        map: room.map,
        tokens: room.tokens || [],
        drawings: room.drawings || []
      }
    ];
    room.activeSceneId = 'scene-1';
  }
  if (!room.activeSceneId || !room.scenes.some((s) => s.id === room.activeSceneId)) {
    room.activeSceneId = room.scenes[0].id;
  }
  return room;
}

function syncActiveScene(room) {
  ensureRoomScenes(room);
  const idx = room.scenes.findIndex((s) => s.id === room.activeSceneId);
  if (idx >= 0) {
    room.scenes[idx] = {
      ...room.scenes[idx],
      map: room.map,
      tokens: room.tokens,
      drawings: room.drawings || []
    };
  }
}

const EXACT_MAP_DIMS = {
  '/maps/taverna.webp': { cols: 48, rows: 36 },
  '/maps/barco.webp': { cols: 52, rows: 38 },
  '/maps/caverna.webp': { cols: 54, rows: 36 },
  '/maps/caverna-aquatica.webp': { cols: 64, rows: 44 },
  '/maps/farol.webp': { cols: 42, rows: 30 }
};

function fixMapDimensions(map) {
  if (!map?.imageUrl) return map;
  const spec = EXACT_MAP_DIMS[map.imageUrl];
  if (spec) {
    return { ...map, cols: spec.cols, rows: spec.rows };
  }
  return map;
}

function loadRooms() {
  try {
    if (fs.existsSync(ROOMS_FILE)) {
      const raw = fs.readFileSync(ROOMS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      for (const [id, room] of Object.entries(parsed)) {
        const normalized = ensureRoomScenes(room);
        normalized.map = fixMapDimensions(normalized.map);
        normalized.scenes = normalized.scenes.map((sc) => ({
          ...sc,
          map: fixMapDimensions(sc.map)
        }));
        rooms.set(id, normalized);
      }
      console.log(`Carregadas ${rooms.size} salas salvas.`);
    }
  } catch (err) {
    console.error('Erro ao carregar salas:', err);
  }
}

let saveTimeout = null;
function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const obj = Object.fromEntries(rooms.entries());
      fs.writeFileSync(ROOMS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.error('Erro ao salvar salas:', err);
    }
  }, 500);
}

loadRooms();

function createDefaultRoom(id, name, dmPassword = '') {
  const now = Date.now();
  return {
    id,
    name: name || `Mesa ${id}`,
    dmPassword,
    createdAt: now,
    updatedAt: now,
    map: {
      presetId: 'dungeon',
      imageUrl: '',
      gridSize: 52,
      cols: 26,
      rows: 18,
      gridColor: 'rgba(255, 255, 255, 0.14)',
      fogEnabled: true,
      fogCells: {}
    },
    tokens: [
      {
        id: 'tok-hero-1',
        name: 'Aldric (Guerreiro)',
        x: 4,
        y: 8,
        size: 1,
        color: '#3b82f6',
        avatar: '⚔️',
        hp: 28,
        maxHp: 28,
        ac: 18,
        hidden: false,
        ownerName: '',
        type: 'pc',
        conditions: []
      },
      {
        id: 'tok-goblin-1',
        name: 'Goblin Emboscador',
        x: 14,
        y: 7,
        size: 1,
        color: '#ef4444',
        avatar: '👺',
        hp: 7,
        maxHp: 7,
        ac: 15,
        hidden: true, // Oculto dos jogadores por padrão!
        ownerName: 'Mestre',
        type: 'monster',
        conditions: []
      }
    ],
    characters: [],
    initiative: {
      round: 1,
      activeIndex: 0,
      entries: []
    },
    chat: [
      {
        id: 'sys-welcome',
        timestamp: Date.now(),
        sender: 'Sistema',
        role: 'system',
        type: 'system',
        text: `Bem-vindo à mesa "${name || id}"! Role dados usando os botões ou digitando /r 1d20+5 no chat.`,
        isSecret: false
      }
    ],
    dmNotes: '# Notas Secretas do Mestre\n\n- O Goblin Emboscador está escondido atrás das caixas (CD 14 Percepção para notar).\n- Armadilha de fosso no corredor leste (CD 13 Investigação).',
    drawings: [],
    scenes: [],
    activeSceneId: 'scene-1',
    playerCharLimits: {},
    allowMultiCharAll: false,
    rollLimit: { enabled: true, maxRolls: 2, windowSeconds: 40 },
    trades: []
  };
}

function normalizeCoins(c) {
  return {
    cp: Math.max(0, Number(c?.cp) || 0),
    sp: Math.max(0, Number(c?.sp) || 0),
    ep: Math.max(0, Number(c?.ep) || 0),
    gp: Math.max(0, Number(c?.gp) || 0),
    pp: Math.max(0, Number(c?.pp) || 0)
  };
}

function coinsToCopper(c) {
  const n = normalizeCoins(c);
  return n.cp + n.sp * 10 + n.ep * 50 + n.gp * 100 + n.pp * 1000;
}

function formatCoinsText(c) {
  const n = normalizeCoins(c);
  const parts = [
    n.pp ? `${n.pp} PL` : '',
    n.gp ? `${n.gp} PO` : '',
    n.ep ? `${n.ep} PE` : '',
    n.sp ? `${n.sp} PP` : '',
    n.cp ? `${n.cp} PC` : ''
  ].filter(Boolean);
  return parts.join(', ') || '0 PO';
}

function addCoinsToChar(ch, delta) {
  const cur = normalizeCoins(ch.currency);
  const d = normalizeCoins(delta);
  ch.currency = {
    cp: cur.cp + d.cp,
    sp: cur.sp + d.sp,
    ep: cur.ep + d.ep,
    gp: cur.gp + d.gp,
    pp: cur.pp + d.pp
  };
}

function deductCoinsFromChar(ch, cost) {
  const cur = normalizeCoins(ch.currency);
  const totalCurCp = coinsToCopper(cur);
  const totalCostCp = coinsToCopper(cost);
  if (totalCurCp < totalCostCp) return false;

  // Se cada moeda específica cobre sem troco, subtrai diretamente
  const c = normalizeCoins(cost);
  if (cur.cp >= c.cp && cur.sp >= c.sp && cur.ep >= c.ep && cur.gp >= c.gp && cur.pp >= c.pp) {
    ch.currency = {
      cp: cur.cp - c.cp,
      sp: cur.sp - c.sp,
      ep: cur.ep - c.ep,
      gp: cur.gp - c.gp,
      pp: cur.pp - c.pp
    };
    return true;
  }

  // Caso precise fazer troco automático em cobre -> converte troco para PO/PP/PC
  let rem = totalCurCp - totalCostCp;
  const pp = cur.pp > 0 ? Math.floor(rem / 1000) : 0;
  rem -= pp * 1000;
  const gp = Math.floor(rem / 100);
  rem -= gp * 100;
  const sp = Math.floor(rem / 10);
  rem -= sp * 10;
  ch.currency = { cp: rem, sp, ep: 0, gp, pp };
  return true;
}

function ensureInventoryItems(ch) {
  if (Array.isArray(ch.inventoryItems)) return [...ch.inventoryItems];
  return (ch.inventory || []).map((str, i) => ({
    id: `item-mig-${i}-${Date.now()}`,
    name: str,
    quantity: 1,
    weightKg: 1,
    category: 'Equipamento',
    equipped: false
  }));
}

function addItemToChar(ch, item) {
  const items = ensureInventoryItems(ch);
  const qtyToAdd = Math.max(1, Number(item.quantity) || 1);
  const existingIdx = items.findIndex((it) => it.name.toLowerCase() === item.name.toLowerCase());
  if (existingIdx >= 0) {
    items[existingIdx] = {
      ...items[existingIdx],
      quantity: (Number(items[existingIdx].quantity) || 1) + qtyToAdd
    };
  } else {
    items.push({
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: item.name,
      quantity: qtyToAdd,
      weightKg: Number(item.weightKg) || 0,
      category: item.category || 'Equipamento',
      value: item.value || '',
      description: item.description || '',
      equipped: false
    });
  }
  ch.inventoryItems = items;
  ch.inventory = items.map((it) => (it.quantity > 1 ? `${it.name} (x${it.quantity})` : it.name));
}

function removeItemFromChar(ch, itemName, qtyToRemove) {
  const items = ensureInventoryItems(ch);
  const idx = items.findIndex((it) => it.name.toLowerCase() === itemName.toLowerCase());
  if (idx === -1) return false;
  const currentQty = Number(items[idx].quantity) || 1;
  const qty = Math.max(1, Number(qtyToRemove) || 1);
  if (currentQty < qty) return false;

  if (currentQty === qty) {
    items.splice(idx, 1);
  } else {
    items[idx] = { ...items[idx], quantity: currentQty - qty };
  }
  ch.inventoryItems = items;
  ch.inventory = items.map((it) => (it.quantity > 1 ? `${it.name} (x${it.quantity})` : it.name));
  return true;
}

function canUserSeeMessage(msg, role, userName) {
  if (msg.recipient) {
    const isRecipientDm = msg.recipient === 'Mestre' && role === 'dm';
    return msg.sender === userName || msg.recipient === userName || isRecipientDm;
  }
  if (msg.isSecret && role !== 'dm') {
    return false;
  }
  return true;
}

// Filtra o estado da sala baseado no papel (DM vs Player) e usuário (para sussurros)
function getRoomStateForRole(room, role, userName = '') {
  ensureRoomScenes(room);
  const sceneMeta = room.scenes.map((s) => ({ id: s.id, name: s.name }));
  const filteredChat = room.chat
    .filter((m) => canUserSeeMessage(m, role, userName))
    .slice(-100);

  if (role === 'dm') {
    return {
      id: room.id,
      name: room.name,
      hasPassword: Boolean(room.dmPassword),
      map: room.map,
      tokens: room.tokens,
      drawings: room.drawings || [],
      scenes: sceneMeta,
      activeSceneId: room.activeSceneId,
      characters: room.characters,
      playerCharLimits: room.playerCharLimits || {},
      allowMultiCharAll: Boolean(room.allowMultiCharAll),
      rollLimit: room.rollLimit || { enabled: true, maxRolls: 2, windowSeconds: 40 },
      trades: (room.trades || []).slice(-30),
      initiative: room.initiative,
      chat: filteredChat,
      dmNotes: room.dmNotes
    };
  }

  // Visão estritamente filtrada para Jogadores
  return {
    id: room.id,
    name: room.name,
    hasPassword: Boolean(room.dmPassword),
    map: room.map,
    tokens: room.tokens
      .filter((t) => !t.hidden)
      .map((t) => (t.type === 'pc' ? t : { ...t, hp: 0, maxHp: 0 })),
    drawings: room.drawings || [],
    scenes: sceneMeta,
    activeSceneId: room.activeSceneId,
    characters: room.characters.filter((c) => !c.isNpc),
    playerCharLimits: room.playerCharLimits || {},
    allowMultiCharAll: Boolean(room.allowMultiCharAll),
    rollLimit: room.rollLimit || { enabled: true, maxRolls: 2, windowSeconds: 40 },
    trades: (room.trades || []).filter((t) => t.playerName === userName).slice(-30),
    initiative: {
      round: room.initiative.round,
      activeIndex: room.initiative.activeIndex,
      entries: room.initiative.entries
        .filter((e) => !e.hidden)
        .map((e) => (e.isNpc ? { ...e, hp: 0, maxHp: 0 } : e))
    },
    chat: filteredChat,
    dmNotes: ''
  };
}

function broadcastRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.updatedAt = Date.now();

  const connectedSockets = io.sockets.adapter.rooms.get(roomId);
  if (!connectedSockets) return;

  const onlineUsers = [];
  for (const socketId of connectedSockets) {
    const s = io.sockets.sockets.get(socketId);
    if (s?.data?.user) {
      onlineUsers.push(s.data.user);
    }
  }

  for (const socketId of connectedSockets) {
    const s = io.sockets.sockets.get(socketId);
    if (!s) continue;
    const isDm = s.data?.role === 'dm';
    const uName = s.data?.user?.name || '';
    s.emit('room:state', {
      state: getRoomStateForRole(room, isDm ? 'dm' : 'player', uName),
      onlineUsers
    });
  }
}

function getRoomsSummary() {
  return Array.from(rooms.values())
    .map((r) => ({
      id: r.id,
      name: r.name,
      hasPassword: Boolean(r.dmPassword),
      onlineCount: io.sockets.adapter.rooms.get(r.id)?.size || 0,
      characterCount: Array.isArray(r.characters) ? r.characters.length : 0,
      sceneCount: Array.isArray(r.scenes) ? r.scenes.length : 1,
      createdAt: r.createdAt || Date.now(),
      updatedAt: r.updatedAt || r.createdAt || Date.now()
    }))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function getNetworkIps() {
  const ifaces = os.networkInterfaces();
  const list = [];
  for (const [ifaceName, entries] of Object.entries(ifaces)) {
    for (const info of entries || []) {
      if (info.family !== 'IPv4' || info.internal) continue;
      const ip = info.address;
      let kind = 'Rede Local / VPN';
      if (ip.startsWith('26.')) {
        kind = 'Radmin VPN';
      } else if (/^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./.test(ip)) {
        kind = 'Tailscale VPN';
      } else if (ip.startsWith('192.168.') || ip.startsWith('10.')) {
        kind = 'Rede Local (Wi-Fi / Cabo)';
      }
      list.push({ ip, label: `${kind} (${ifaceName})` });
    }
  }
  return list;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, roomsCount: rooms.size });
});

registerBestiaryRoutes(app);

function buildNetworkPayload() {
  return {
    port: Number(PORT),
    ips: getNetworkIps(),
    tunnel: getTunnelState()
  };
}

function broadcastNetworkUpdate() {
  io.emit('network:updated', buildNetworkPayload());
}

function getTunnelTargetUrl() {
  return fs.existsSync(path.join(__dirname, '..', 'client', 'dist'))
    ? `http://127.0.0.1:${PORT}`
    : 'http://127.0.0.1:5173';
}

app.get('/api/network-info', (_req, res) => {
  res.json(buildNetworkPayload());
});

app.post('/api/tunnel/restart', (_req, res) => {
  const tunnel = startTunnel(getTunnelTargetUrl(), broadcastNetworkUpdate);
  res.json({ ok: true, tunnel });
});

app.post('/api/tunnel/stop', (_req, res) => {
  const tunnel = stopTunnel();
  res.json({ ok: true, tunnel });
});

app.get('/api/rooms', (_req, res) => {
  res.json({ rooms: getRoomsSummary() });
});

app.get('/api/rooms/:id', (req, res) => {
  const roomId = req.params.id.toUpperCase();
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ exists: false });
  }
  res.json({
    exists: true,
    id: room.id,
    name: room.name,
    hasPassword: Boolean(room.dmPassword)
  });
});

app.delete('/api/rooms/:id', (req, res) => {
  const cleanId = (req.params.id || '').toUpperCase().trim();
  const room = rooms.get(cleanId);
  if (!room) {
    return res.status(404).json({ ok: false, error: 'Sala não encontrada.' });
  }
  const pass = String(req.body?.dmPassword ?? req.query?.dmPassword ?? '');
  if (room.dmPassword && room.dmPassword !== pass) {
    return res.status(403).json({ ok: false, error: 'Senha do Mestre incorreta para apagar esta sala.' });
  }

  rooms.delete(cleanId);
  try {
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(Object.fromEntries(rooms.entries()), null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao persistir exclusão de sala:', err);
  }
  io.to(cleanId).emit('room:deleted', { roomId: cleanId });
  io.emit('rooms:updated');
  res.json({ ok: true });
});

io.on('connection', (socket) => {
  socket.on('room:create', ({ roomId, roomName, userName, dmPassword }, cb) => {
    const cleanId = (roomId || Math.random().toString(36).substring(2, 7)).toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!cleanId) {
      return cb?.({ ok: false, error: 'Código de sala inválido.' });
    }

    if (rooms.has(cleanId)) {
      return cb?.({ ok: false, error: 'Já existe uma sala com esse código. Tente entrar nela.' });
    }

    const room = createDefaultRoom(cleanId, roomName || `Mesa ${cleanId}`, dmPassword || '');
    rooms.set(cleanId, room);
    scheduleSave();

    socket.join(cleanId);
    socket.data.roomId = cleanId;
    socket.data.role = 'dm';
    socket.data.user = { id: socket.id, name: userName || 'Mestre', role: 'dm' };

    cb?.({ ok: true, roomId: cleanId, role: 'dm' });
    broadcastRoomState(cleanId);
    io.emit('rooms:updated');
  });

  socket.on('room:join', ({ roomId, userName, role, dmPassword, silent }, cb) => {
    const cleanId = (roomId || '').toUpperCase().trim();
    const room = rooms.get(cleanId);

    if (!room) {
      return cb?.({ ok: false, error: 'Sala não encontrada. Verifique o código ou crie uma nova mesa.' });
    }

    const desiredRole = role === 'dm' ? 'dm' : 'player';
    if (desiredRole === 'dm' && room.dmPassword && room.dmPassword !== (dmPassword || '')) {
      return cb?.({ ok: false, error: 'Senha do Mestre incorreta!' });
    }

    socket.join(cleanId);
    socket.data.roomId = cleanId;
    socket.data.role = desiredRole;
    socket.data.user = {
      id: socket.id,
      name: userName || (desiredRole === 'dm' ? 'Mestre' : 'Aventureiro'),
      role: desiredRole
    };

    if (!silent) {
      room.chat.push({
        id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        sender: 'Sistema',
        role: 'system',
        type: 'system',
        text: `${socket.data.user.name} entrou como ${desiredRole === 'dm' ? 'Mestre' : 'Jogador'}.`,
        isSecret: false
      });
      scheduleSave();
    }

    cb?.({ ok: true, roomId: cleanId, role: desiredRole });
    broadcastRoomState(cleanId);
    io.emit('rooms:updated');
  });

  // Atualizações de Mapa & Fog of War (apenas Mestre)
  socket.on('map:update', (patch) => {
    const { roomId, role } = socket.data;
    if (role !== 'dm') return;
    const room = rooms.get(roomId);
    if (!room) return;

    const nextMap = { ...room.map, ...patch };
    if (patch.baseCols == null || patch.baseCols <= 0) delete nextMap.baseCols;
    if (patch.baseRows == null || patch.baseRows <= 0) delete nextMap.baseRows;
    room.map = nextMap;
    syncActiveScene(room);
    scheduleSave();
    broadcastRoomState(roomId);
  });

  socket.on('fog:toggleCells', ({ cells, covered }) => {
    const { roomId, role } = socket.data;
    if (role !== 'dm') return;
    const room = rooms.get(roomId);
    if (!room) return;

    for (const key of cells) {
      if (covered) {
        room.map.fogCells[key] = true;
      } else {
        delete room.map.fogCells[key];
      }
    }
    syncActiveScene(room);
    scheduleSave();
    broadcastRoomState(roomId);
  });

  socket.on('fog:fillAll', ({ covered }) => {
    const { roomId, role } = socket.data;
    if (role !== 'dm') return;
    const room = rooms.get(roomId);
    if (!room) return;

    if (!covered) {
      room.map.fogCells = {};
    } else {
      const next = {};
      for (let c = 0; c < room.map.cols; c++) {
        for (let r = 0; r < room.map.rows; r++) {
          next[`${c},${r}`] = true;
        }
      }
      room.map.fogCells = next;
    }
    syncActiveScene(room);
    scheduleSave();
    broadcastRoomState(roomId);
  });

  // Gerenciador de Cenas / Mapas (apenas Mestre)
  socket.on('scene:create', ({ name, presetId, imageUrl, cols, rows, gridColor }) => {
    const { roomId, role } = socket.data;
    if (role !== 'dm') return;
    const room = rooms.get(roomId);
    if (!room) return;

    syncActiveScene(room);
    const newScene = {
      id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: (name || '').trim() || `Cena ${room.scenes.length + 1}`,
      map: {
        presetId: presetId || 'dungeon',
        imageUrl: imageUrl || '',
        gridSize: 52,
        cols: Number(cols) || 26,
        rows: Number(rows) || 18,
        gridColor: gridColor || (imageUrl ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.14)'),
        fogEnabled: true,
        fogCells: {}
      },
      tokens: [],
      drawings: []
    };
    room.scenes.push(newScene);
    room.activeSceneId = newScene.id;
    room.map = newScene.map;
    room.tokens = newScene.tokens;
    room.drawings = newScene.drawings;

    scheduleSave();
    broadcastRoomState(roomId);
  });

  socket.on('scene:switch', ({ sceneId }) => {
    const { roomId, role } = socket.data;
    if (role !== 'dm') return;
    const room = rooms.get(roomId);
    if (!room) return;

    syncActiveScene(room);
    const target = room.scenes.find((s) => s.id === sceneId);
    if (!target) return;

    room.activeSceneId = target.id;
    room.map = target.map;
    room.tokens = target.tokens || [];
    room.drawings = target.drawings || [];

    scheduleSave();
    broadcastRoomState(roomId);
  });

  socket.on('scene:rename', ({ sceneId, name }) => {
    const { roomId, role } = socket.data;
    if (role !== 'dm') return;
    const room = rooms.get(roomId);
    if (!room) return;

    ensureRoomScenes(room);
    const target = room.scenes.find((s) => s.id === sceneId);
    if (!target || !name?.trim()) return;
    target.name = name.trim();
    scheduleSave();
    broadcastRoomState(roomId);
  });

  socket.on('scene:delete', ({ sceneId }) => {
    const { roomId, role } = socket.data;
    if (role !== 'dm') return;
    const room = rooms.get(roomId);
    if (!room) return;

    ensureRoomScenes(room);
    if (room.scenes.length <= 1) return;
    room.scenes = room.scenes.filter((s) => s.id !== sceneId);
    if (room.activeSceneId === sceneId) {
      const fallback = room.scenes[0];
      room.activeSceneId = fallback.id;
      room.map = fallback.map;
      room.tokens = fallback.tokens || [];
      room.drawings = fallback.drawings || [];
    }
    scheduleSave();
    broadcastRoomState(roomId);
  });

  // Desenhos & Pings no Tabuleiro
  socket.on('drawing:add', (drawing) => {
    const { roomId } = socket.data;
    const room = rooms.get(roomId);
    if (!room || !drawing?.points?.length) return;

    ensureRoomScenes(room);
    room.drawings.push({
      id: drawing.id || `drw-${Date.now()}`,
      color: drawing.color || '#fbbf24',
      width: drawing.width || 3,
      points: drawing.points
    });
    if (room.drawings.length > 200) {
      room.drawings = room.drawings.slice(-200);
    }
    syncActiveScene(room);
    scheduleSave();
    broadcastRoomState(roomId);
  });

  socket.on('drawing:clear', () => {
    const { roomId, role } = socket.data;
    if (role !== 'dm') return;
    const room = rooms.get(roomId);
    if (!room) return;

    room.drawings = [];
    syncActiveScene(room);
    scheduleSave();
    broadcastRoomState(roomId);
  });

  socket.on('map:ping', ({ x, y, color }) => {
    const { roomId, user } = socket.data;
    if (!roomId) return;
    io.to(roomId).emit('map:ping', {
      id: `ping-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      x,
      y,
      color: color || '#fbbf24',
      sender: user?.name || 'Jogador',
      timestamp: Date.now()
    });
  });

  // Tokens
  socket.on('token:add', (token) => {
    const { roomId, role, user } = socket.data;
    const room = rooms.get(roomId);
    if (!room) return;

    if (role !== 'dm') {
      const char = room.characters.find((c) => c.id === token.characterId);
      if (!char || char.ownerName !== user?.name) {
        socket.emit('action:error', {
          message: 'Você só pode colocar o token do seu próprio personagem no tabuleiro.'
        });
        return;
      }
    }

    const newToken = {
      ...token,
      id: token.id || `tok-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      hidden: role === 'dm' ? Boolean(token.hidden) : false,
      ownerName: role === 'dm' ? token.ownerName ?? '' : user?.name || '',
      type: role === 'dm' ? token.type || 'npc' : 'pc'
    };
    room.tokens.push(newToken);
    syncActiveScene(room);
    scheduleSave();
    broadcastRoomState(roomId);
  });

  socket.on('token:update', ({ id, patch }) => {
    const { roomId, role, user } = socket.data;
    const room = rooms.get(roomId);
    if (!room) return;

    const idx = room.tokens.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const existing = room.tokens[idx];
    // Jogador só pode mover/editar exclusivamente o token do próprio personagem
    if (role !== 'dm') {
      if (!existing.ownerName || existing.ownerName !== user?.name) {
        socket.emit('action:error', {
          message: 'Você só pode movimentar e editar o token do seu próprio personagem!'
        });
        return;
      }
      const safePatch = { ...patch };
      delete safePatch.hidden;
      delete safePatch.ownerName;
      room.tokens[idx] = { ...existing, ...safePatch };
    } else {
      room.tokens[idx] = { ...existing, ...patch };
    }

    const updatedToken = room.tokens[idx];
    // Sincroniza HP/AC/condições de volta com a ficha vinculada
    if (updatedToken.characterId) {
      room.characters = room.characters.map((c) =>
        c.id === updatedToken.characterId
          ? {
              ...c,
              hp: updatedToken.hp,
              maxHp: updatedToken.maxHp,
              ac: updatedToken.ac,
              conditions: Array.isArray(updatedToken.conditions)
                ? updatedToken.conditions
                : c.conditions || []
            }
          : c
      );
    }
    // Mantém iniciativa sincronizada se HP/AC mudou
    if (room.initiative?.entries?.length) {
      room.initiative.entries = room.initiative.entries.map((e) =>
        e.tokenId === id
          ? { ...e, hp: updatedToken.hp, maxHp: updatedToken.maxHp, ac: updatedToken.ac }
          : e
      );
    }

    syncActiveScene(room);
    scheduleSave();
    broadcastRoomState(roomId);
  });

  socket.on('token:updateMany', ({ updates }) => {
    const { roomId, role, user } = socket.data;
    const room = rooms.get(roomId);
    if (!room || !Array.isArray(updates) || updates.length === 0) return;

    let changed = false;
    for (const item of updates) {
      if (!item || !item.id || !item.patch) continue;
      const idx = room.tokens.findIndex((t) => t.id === item.id);
      if (idx === -1) continue;

      const existing = room.tokens[idx];
      if (role !== 'dm') {
        if (!existing.ownerName || existing.ownerName !== user?.name) continue;
        const safePatch = { ...item.patch };
        delete safePatch.hidden;
        delete safePatch.ownerName;
        room.tokens[idx] = { ...existing, ...safePatch };
      } else {
        room.tokens[idx] = { ...existing, ...item.patch };
      }

      const updatedToken = room.tokens[idx];
      if (room.initiative?.entries?.length) {
        room.initiative.entries = room.initiative.entries.map((e) =>
          e.tokenId === item.id
            ? { ...e, hp: updatedToken.hp, maxHp: updatedToken.maxHp, ac: updatedToken.ac }
            : e
        );
      }
      changed = true;
    }

    if (!changed) return;
    syncActiveScene(room);
    scheduleSave();
    broadcastRoomState(roomId);
  });

  socket.on('token:delete', ({ id }) => {
    const { roomId, role, user } = socket.data;
    const room = rooms.get(roomId);
    if (!room) return;

    const target = room.tokens.find((t) => t.id === id);
    if (!target) return;
    if (role !== 'dm' && (!target.ownerName || target.ownerName !== user?.name)) return;

    room.tokens = room.tokens.filter((t) => t.id !== id);
    syncActiveScene(room);
    scheduleSave();
    broadcastRoomState(roomId);
  });

  // Fichas de Personagem & NPCs (com limite de 1 ficha por jogador salvo permissão do Mestre)
  socket.on('character:save', (charData) => {
    const { roomId, role, user } = socket.data;
    const room = rooms.get(roomId);
    if (!room) return;

    const userName = user?.name || '';
    const existingIdx = room.characters.findIndex((c) => c.id === charData.id);

    if (role !== 'dm') {
      if (existingIdx >= 0) {
        if (room.characters[existingIdx].ownerName !== userName) {
          socket.emit('action:error', {
            message: 'Você só pode editar a sua própria ficha de personagem.'
          });
          return;
        }
      } else {
        const ownedCount = room.characters.filter(
          (c) => !c.isNpc && c.ownerName === userName
        ).length;
        const allowedLimit = room.allowMultiCharAll
          ? 99
          : room.playerCharLimits?.[userName] ?? 1;
        if (ownedCount >= allowedLimit) {
          socket.emit('action:error', {
            message: `Limite de ${allowedLimit} ficha(s) por jogador atingido. Peça ao Mestre para liberar mais um personagem.`
          });
          return;
        }
      }
    }

    const isSecretNpc = role === 'dm' ? Boolean(charData.isSecretNpc) : false;
    const cleanChar = {
      ...charData,
      isSecretNpc,
      isNpc: role === 'dm' ? Boolean(charData.isNpc) : false,
      ownerName: role === 'dm' ? charData.ownerName || userName : userName
    };

    if (existingIdx >= 0) {
      room.characters[existingIdx] = cleanChar;
    } else {
      room.characters.push(cleanChar);
    }

    // Sincroniza HP/AC/condições/imagem com tokens vinculados e iniciativa
    const linkedTokenIds = new Set();
    room.tokens = room.tokens.map((t) => {
      if (t.characterId === cleanChar.id) {
        linkedTokenIds.add(t.id);
        return {
          ...t,
          name: cleanChar.name,
          hp: cleanChar.hp,
          maxHp: cleanChar.maxHp,
          ac: cleanChar.ac,
          ownerName: cleanChar.ownerName || t.ownerName,
          avatar: cleanChar.avatar || t.avatar,
          imageUrl: cleanChar.imageUrl || t.imageUrl,
          conditions: Array.isArray(cleanChar.conditions)
            ? cleanChar.conditions
            : t.conditions || []
        };
      }
      return t;
    });

    if (room.initiative?.entries?.length && linkedTokenIds.size > 0) {
      room.initiative.entries = room.initiative.entries.map((e) =>
        e.tokenId && linkedTokenIds.has(e.tokenId)
          ? { ...e, name: cleanChar.name, hp: cleanChar.hp, maxHp: cleanChar.maxHp, ac: cleanChar.ac }
          : e
      );
    }

    syncActiveScene(room);
    scheduleSave();
    broadcastRoomState(roomId);
  });

  // Permissões do Mestre: limite de fichas por jogador
  socket.on('dm:setPlayerCharLimit', ({ playerName, limit, allowAll }) => {
    const { roomId, role } = socket.data;
    if (role !== 'dm') return;
    const room = rooms.get(roomId);
    if (!room) return;

    ensureRoomScenes(room);
    if (allowAll !== undefined) {
      room.allowMultiCharAll = Boolean(allowAll);
    }
    if (playerName && typeof limit === 'number') {
      room.playerCharLimits[playerName] = Math.max(1, Math.min(10, Math.round(limit)));
    }
    scheduleSave();
    broadcastRoomState(roomId);
  });

  // Baú de Recompensas do Mestre: dar itens & moedas aos jogadores
  socket.on('dm:grantReward', ({ targetCharIds, item, coins }) => {
    const { roomId, role } = socket.data;
    if (role !== 'dm') return;
    const room = rooms.get(roomId);
    if (!room || !Array.isArray(targetCharIds) || targetCharIds.length === 0) return;

    const grantedNames = [];
    for (const charId of targetCharIds) {
      const idx = room.characters.findIndex((c) => c.id === charId);
      if (idx === -1) continue;
      const ch = { ...room.characters[idx] };

      if (item && item.name) {
        addItemToChar(ch, item);
      }

      if (coins) {
        addCoinsToChar(ch, coins);
      }

      room.characters[idx] = ch;
      grantedNames.push(ch.name);
    }

    if (grantedNames.length > 0) {
      const parts = [];
      if (item?.name) parts.push(`${item.quantity || 1}× ${item.name}`);
      if (coins && coinsToCopper(coins) > 0) parts.push(formatCoinsText(coins));
      if (parts.length > 0) {
        room.chat.push({
          id: `sys-rwd-${Date.now()}`,
          timestamp: Date.now(),
          sender: 'Sistema',
          role: 'system',
          type: 'system',
          text: `🎁 O Mestre concedeu [${parts.join(' + ')}] para ${grantedNames.join(', ')}!`,
          isSecret: false
        });
      }
    }

    scheduleSave();
    broadcastRoomState(roomId);
  });

  // Comércio & Troca de Itens <-> Moedas entre Jogadores e Mestre
  socket.on('trade:create', ({ direction, characterId, item, coins, note }) => {
    const { roomId, role, user } = socket.data;
    const room = rooms.get(roomId);
    if (!room) return;

    ensureRoomScenes(room);
    const char = room.characters.find((c) => c.id === characterId);
    if (!char) return;

    const userName = user?.name || '';
    if (role !== 'dm' && char.ownerName !== userName) {
      socket.emit('action:error', { message: 'Você só pode negociar com a sua própria ficha.' });
      return;
    }

    const cleanCoins = normalizeCoins(coins);
    const cleanDir =
      role === 'dm'
        ? 'dm_to_player'
        : direction === 'sell_to_dm'
        ? 'sell_to_dm'
        : 'buy_from_dm';

    if (cleanDir === 'sell_to_dm') {
      if (!item?.name) return;
      const items = ensureInventoryItems(char);
      const owned = items.find((i) => i.name.toLowerCase() === item.name.toLowerCase());
      const reqQty = Math.max(1, Number(item.quantity) || 1);
      if (!owned || (owned.quantity || 1) < reqQty) {
        socket.emit('action:error', { message: 'Quantidade insuficiente desse item na mochila.' });
        return;
      }
    }

    if (cleanDir === 'buy_from_dm') {
      if (coinsToCopper(char.currency) < coinsToCopper(cleanCoins)) {
        socket.emit('action:error', { message: 'Moedas insuficientes na sua carteira para essa oferta!' });
        return;
      }
    }

    const trade = {
      id: `trd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      direction: cleanDir,
      playerName: char.ownerName || userName,
      characterId: char.id,
      characterName: char.name,
      item: item?.name
        ? {
            id: item.id || `trd-it-${Date.now()}`,
            name: item.name,
            quantity: Math.max(1, Number(item.quantity) || 1),
            weightKg: Number(item.weightKg) || 0,
            category: item.category || 'Equipamento',
            value: item.value || '',
            description: item.description || ''
          }
        : undefined,
      coins: cleanCoins,
      status: 'pending',
      note: note ? String(note).trim() : ''
    };

    room.trades.push(trade);
    if (room.trades.length > 50) {
      room.trades = room.trades.slice(-50);
    }

    const coinStr = formatCoinsText(cleanCoins);
    const itemStr = trade.item ? `${trade.item.quantity}× ${trade.item.name}` : 'Item';
    const summaryText =
      cleanDir === 'sell_to_dm'
        ? `💰 ${char.name} propôs VENDER [${itemStr}] ao Mestre por ${coinStr}.`
        : cleanDir === 'buy_from_dm'
        ? `🛒 ${char.name} enviou ${coinStr} ao Mestre pedindo [${itemStr}].`
        : `🏪 O Mestre ofereceu [${itemStr}] para ${char.name} por ${coinStr}.`;

    room.chat.push({
      id: `sys-trd-${Date.now()}`,
      timestamp: Date.now(),
      sender: 'Sistema',
      role: 'system',
      type: 'system',
      text: summaryText,
      isSecret: false
    });

    scheduleSave();
    broadcastRoomState(roomId);
  });

  socket.on('trade:counter', ({ tradeId, counterCoins, counterNote }) => {
    const { roomId, role } = socket.data;
    if (role !== 'dm') return;
    const room = rooms.get(roomId);
    if (!room) return;

    ensureRoomScenes(room);
    const tIdx = room.trades.findIndex((t) => t.id === tradeId);
    if (tIdx === -1) return;
    const trade = room.trades[tIdx];
    if (
      (trade.status !== 'pending' && trade.status !== 'countered') ||
      trade.direction === 'dm_to_player'
    ) {
      return;
    }

    const cleanCounter = normalizeCoins(counterCoins);
    const cleanNote = counterNote ? String(counterNote).trim() : '';
    room.trades[tIdx] = {
      ...trade,
      status: 'countered',
      counterCoins: cleanCounter,
      counterNote: cleanNote
    };

    const itemStr = trade.item ? `${trade.item.quantity}× ${trade.item.name}` : 'Item';
    const coinStr = formatCoinsText(cleanCounter);
    room.chat.push({
      id: `sys-trd-ctr-${Date.now()}`,
      timestamp: Date.now(),
      sender: 'Sistema',
      role: 'system',
      type: 'system',
      text:
        trade.direction === 'sell_to_dm'
          ? `⚖️ Contraproposta do Mestre para ${trade.characterName}: pagar ${coinStr} por [${itemStr}]${cleanNote ? ` (${cleanNote})` : ''}.`
          : `⚖️ Contraproposta do Mestre para ${trade.characterName}: cobrar ${coinStr} por [${itemStr}]${cleanNote ? ` (${cleanNote})` : ''}.`,
      isSecret: false
    });

    scheduleSave();
    broadcastRoomState(roomId);
  });

  socket.on('trade:respond', ({ tradeId, accept, counterCoins }) => {
    const { roomId, role, user } = socket.data;
    const room = rooms.get(roomId);
    if (!room) return;

    ensureRoomScenes(room);
    const tIdx = room.trades.findIndex((t) => t.id === tradeId);
    if (tIdx === -1) return;
    const trade = room.trades[tIdx];
    if (trade.status !== 'pending' && trade.status !== 'countered') return;

    const userName = user?.name || '';
    if (trade.status === 'countered') {
      // Na contraproposta: apenas o jogador pode aceitar; jogador ou Mestre podem cancelar/recusar
      if (accept) {
        if (trade.playerName !== userName) return;
      } else {
        if (role !== 'dm' && trade.playerName !== userName) return;
      }
    } else if (trade.direction === 'dm_to_player') {
      if (role !== 'dm' && trade.playerName !== userName) return;
    } else {
      if (role !== 'dm') return;
    }

    if (!accept) {
      room.trades[tIdx] = { ...trade, status: 'rejected' };
      room.chat.push({
        id: `sys-trd-rej-${Date.now()}`,
        timestamp: Date.now(),
        sender: 'Sistema',
        role: 'system',
        type: 'system',
        text: `❌ Proposta de troca com ${trade.characterName} (${trade.item?.name || 'Comércio'}) foi recusada.`,
        isSecret: false
      });
      scheduleSave();
      broadcastRoomState(roomId);
      return;
    }

    const cIdx = room.characters.findIndex((c) => c.id === trade.characterId);
    if (cIdx === -1) return;
    const ch = { ...room.characters[cIdx] };
    const finalCoins =
      trade.status === 'countered' && trade.counterCoins
        ? normalizeCoins(trade.counterCoins)
        : counterCoins
        ? normalizeCoins(counterCoins)
        : normalizeCoins(trade.coins);

    if (trade.direction === 'sell_to_dm') {
      if (!trade.item?.name || !removeItemFromChar(ch, trade.item.name, trade.item.quantity)) {
        socket.emit('action:error', { message: 'O jogador não possui mais a quantidade desse item!' });
        return;
      }
      addCoinsToChar(ch, finalCoins);
    } else {
      // buy_from_dm ou dm_to_player: jogador paga moedas e recebe o item
      if (!deductCoinsFromChar(ch, finalCoins)) {
        socket.emit('action:error', { message: `${ch.name} não possui moedas suficientes (${formatCoinsText(finalCoins)})!` });
        return;
      }
      if (trade.item?.name) {
        addItemToChar(ch, trade.item);
      }
    }

    room.characters[cIdx] = ch;
    room.trades[tIdx] = { ...trade, coins: finalCoins, status: 'accepted' };

    const itemStr = trade.item ? `${trade.item.quantity}× ${trade.item.name}` : 'Item';
    const coinStr = formatCoinsText(finalCoins);
    room.chat.push({
      id: `sys-trd-ok-${Date.now()}`,
      timestamp: Date.now(),
      sender: 'Sistema',
      role: 'system',
      type: 'system',
      text:
        trade.direction === 'sell_to_dm'
          ? `🤝 Troca concluída: ${ch.name} entregou [${itemStr}] ao Mestre e recebeu ${coinStr}!`
          : `🤝 Troca concluída: ${ch.name} pagou ${coinStr} ao Mestre e recebeu [${itemStr}]!`,
      isSecret: false
    });

    scheduleSave();
    broadcastRoomState(roomId);
  });

  socket.on('trade:clearResolved', () => {
    const { roomId, role } = socket.data;
    if (role !== 'dm') return;
    const room = rooms.get(roomId);
    if (!room) return;
    room.trades = (room.trades || []).filter(
      (t) => t.status === 'pending' || t.status === 'countered'
    );
    scheduleSave();
    broadcastRoomState(roomId);
  });

  socket.on('character:delete', ({ id }) => {
    const { roomId, role, user } = socket.data;
    const room = rooms.get(roomId);
    if (!room) return;

    const char = room.characters.find((c) => c.id === id);
    if (!char) return;
    if (role !== 'dm' && char.ownerName !== user?.name) return;

    room.characters = room.characters.filter((c) => c.id !== id);
    scheduleSave();
    broadcastRoomState(roomId);
  });

  // Iniciativa (Combate)
  socket.on('initiative:update', (initiativeState) => {
    const { roomId, role } = socket.data;
    if (role !== 'dm') return;
    const room = rooms.get(roomId);
    if (!room) return;

    room.initiative = initiativeState;
    scheduleSave();
    broadcastRoomState(roomId);
  });

  // Configuração do Mestre: limite de rolagens por jogador em janela de tempo
  socket.on('dm:setRollLimit', ({ enabled, maxRolls, windowSeconds }) => {
    const { roomId, role } = socket.data;
    if (role !== 'dm') return;
    const room = rooms.get(roomId);
    if (!room) return;

    ensureRoomScenes(room);
    room.rollLimit = {
      enabled: enabled !== undefined ? Boolean(enabled) : room.rollLimit.enabled,
      maxRolls: Math.max(1, Math.min(20, Math.round(Number(maxRolls) || room.rollLimit.maxRolls || 2))),
      windowSeconds: Math.max(5, Math.min(300, Math.round(Number(windowSeconds) || room.rollLimit.windowSeconds || 40)))
    };

    if (!room.rollLimit.enabled) {
      for (const k of Array.from(roomRollTimestamps.keys())) {
        if (k.startsWith(`${roomId}:`)) roomRollTimestamps.delete(k);
      }
    }

    scheduleSave();
    broadcastRoomState(roomId);
  });

  // Chat & Rolagem de Dados + Sussurros
  socket.on('chat:message', (msg) => {
    const { roomId, role, user } = socket.data;
    const room = rooms.get(roomId);
    if (!room) return;

    const msgType = msg.type || 'chat';
    if (msgType === 'roll' && role !== 'dm') {
      ensureRoomScenes(room);
      const cfg = room.rollLimit || { enabled: true, maxRolls: 2, windowSeconds: 40 };
      if (cfg.enabled) {
        const windowMs = Math.max(5, Number(cfg.windowSeconds) || 40) * 1000;
        const maxRolls = Math.max(1, Number(cfg.maxRolls) || 2);
        const key = `${roomId}:${user?.name || msg.sender || socket.id}`;
        const now = Date.now();
        const recent = (roomRollTimestamps.get(key) || []).filter((ts) => now - ts < windowMs);
        if (recent.length >= maxRolls) {
          const waitSec = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
          socket.emit('action:error', {
            message: `Limite de rolagens atingido (${maxRolls} a cada ${cfg.windowSeconds}s). Aguarde ${waitSec}s.`
          });
          return;
        }
        recent.push(now);
        roomRollTimestamps.set(key, recent);
      }
    }

    const isSecret = role === 'dm' && Boolean(msg.isSecret);
    const fullMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      sender: msg.sender || user?.name || 'Anônimo',
      role: role || 'player',
      type: msgType,
      text: msg.text || '',
      isSecret,
      recipient: msg.recipient ? String(msg.recipient).trim() : undefined,
      rollData: msg.rollData || null
    };

    room.chat.push(fullMsg);
    if (room.chat.length > 200) {
      room.chat = room.chat.slice(-200);
    }

    scheduleSave();
    broadcastRoomState(roomId);
  });

  // Backup / Restauração de Campanha (apenas Mestre autenticado)
  socket.on('room:exportBackup', (cb) => {
    const { roomId, role } = socket.data;
    if (role !== 'dm') return cb?.({ ok: false });
    const room = rooms.get(roomId);
    if (!room) return cb?.({ ok: false });
    syncActiveScene(room);
    cb?.({
      ok: true,
      backup: {
        name: room.name,
        scenes: room.scenes,
        activeSceneId: room.activeSceneId,
        characters: room.characters,
        dmNotes: room.dmNotes,
        exportedAt: new Date().toISOString()
      }
    });
  });

  socket.on('room:importBackup', (backup) => {
    const { roomId, role } = socket.data;
    if (role !== 'dm') return;
    const room = rooms.get(roomId);
    if (!room || !backup || typeof backup !== 'object') return;

    if (Array.isArray(backup.characters)) room.characters = backup.characters;
    if (typeof backup.dmNotes === 'string') room.dmNotes = backup.dmNotes;
    if (Array.isArray(backup.scenes) && backup.scenes.length > 0) {
      room.scenes = backup.scenes;
      room.activeSceneId = backup.activeSceneId || backup.scenes[0].id;
      const active =
        room.scenes.find((s) => s.id === room.activeSceneId) || room.scenes[0];
      room.map = active.map;
      room.tokens = active.tokens || [];
      room.drawings = active.drawings || [];
    } else if (backup.map) {
      room.map = backup.map;
      room.tokens = Array.isArray(backup.tokens) ? backup.tokens : room.tokens;
      room.drawings = Array.isArray(backup.drawings) ? backup.drawings : [];
      syncActiveScene(room);
    }

    scheduleSave();
    broadcastRoomState(roomId);
  });

  // Notas Secretas do Mestre
  socket.on('dm:updateNotes', ({ notes }) => {
    const { roomId, role } = socket.data;
    if (role !== 'dm') return;
    const room = rooms.get(roomId);
    if (!room) return;

    room.dmNotes = notes;
    scheduleSave();
    // Não precisa dar broadcast para jogadores, apenas confirma para DM se necessário
  });

  socket.on('disconnect', () => {
    const { roomId } = socket.data;
    if (roomId) {
      broadcastRoomState(roomId);
      io.emit('rooms:updated');
    }
  });
});

// Serve frontend em produção caso já tenha sido buildado
const distPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🎲 Servidor Aetheria VTT rodando em http://localhost:${PORT}`);
  startTunnel(getTunnelTargetUrl(), broadcastNetworkUpdate);
});

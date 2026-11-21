import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Crown,
  Shield,
  MessageSquare,
  ScrollText,
  Swords,
  Settings,
  Copy,
  Check,
  LogOut,
  Users,
  Globe,
  X,
  RefreshCw,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';
import {
  CharacterSheet,
  MapPing,
  NetworkInfo,
  OnlineUser,
  Role,
  RollData,
  RollMode,
  RoomState,
  RoomSummary,
  Token
} from './types/rpg';
import { executeRollFormula, playDiceSound, rollDie } from './utils/dice';
import { Lobby } from './components/Lobby';
import { TabletopCanvas } from './components/TabletopCanvas';
import { DiceBar } from './components/DiceBar';
import { DiceToastItem, DiceTray3D } from './components/DiceRoller3D';
import { ChatPanel } from './components/ChatPanel';
import { CharacterSheetPanel } from './components/CharacterSheet';
import { CharacterBuilder } from './components/CharacterBuilder';
import { DmPanel } from './components/DmPanel';
import { InitiativeTracker } from './components/InitiativeTracker';
import { BestiaryBookModal } from './components/BestiaryBookModal';

type RightTab = 'chat' | 'sheets' | 'combat' | 'dm';

export function App() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [role, setRole] = useState<Role>('player');
  const [userName, setUserName] = useState('');

  const [rightTab, setRightTab] = useState<RightTab>('chat');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showBestiary, setShowBestiary] = useState(false);
  const [pings, setPings] = useState<MapPing[]>([]);
  const [actionError, setActionError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [roomsList, setRoomsList] = useState<RoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedInviteKey, setCopiedInviteKey] = useState<string | null>(null);
  const [initialJoinCode] = useState(
    () => new URLSearchParams(window.location.search).get('room')?.toUpperCase() || ''
  );
  const [diceToasts, setDiceToasts] = useState<DiceToastItem[]>([]);
  const [rollMode, setRollMode] = useState<RollMode>('normal');
  const [myRollTimestamps, setMyRollTimestamps] = useState<number[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const seenRollIdsRef = useRef<Set<string>>(new Set());
  const hasInitializedRollsRef = useRef(false);
  const activeSessionRef = useRef<{
    roomId: string;
    userName: string;
    role: Role;
    dmPassword: string;
  } | null>(null);

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRoomsList(Array.isArray(data.rooms) ? data.rooms : []);
      }
    } catch {
      // ignora em caso de queda temporária
    } finally {
      setLoadingRooms(false);
    }
  };

  const fetchNetworkInfo = async () => {
    try {
      const res = await fetch('/api/network-info');
      if (res.ok) {
        const data = await res.json();
        setNetworkInfo(data);
      }
    } catch {
      // ignora
    }
  };

  const handleRestartTunnel = async () => {
    try {
      const res = await fetch('/api/tunnel/restart', { method: 'POST' });
      if (res.ok) {
        await fetchNetworkInfo();
      }
    } catch {
      // ignora
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchNetworkInfo();

    const socket = io({
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Reconexão automática para amigos em redes instáveis
      if (activeSessionRef.current) {
        socket.emit('room:join', { ...activeSessionRef.current, silent: true });
      }
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('rooms:updated', () => {
      fetchRooms();
    });
    socket.on('network:updated', (info: NetworkInfo) => {
      setNetworkInfo(info);
    });
    socket.on('room:deleted', () => {
      activeSessionRef.current = null;
      seenRollIdsRef.current.clear();
      hasInitializedRollsRef.current = false;
      setDiceToasts([]);
      setMyRollTimestamps([]);
      setRoomState(null);
      setActionError('A sala atual foi encerrada/apagada.');
      window.setTimeout(() => setActionError(''), 4000);
    });

    socket.on('room:state', ({ state, onlineUsers: users }: { state: RoomState; onlineUsers: OnlineUser[] }) => {
      if (!hasInitializedRollsRef.current) {
        state.chat.forEach((m) => {
          if (m.type === 'roll') seenRollIdsRef.current.add(m.id);
        });
        hasInitializedRollsRef.current = true;
      } else {
        const newRolls = state.chat.filter(
          (m) => m.type === 'roll' && m.rollData && !seenRollIdsRef.current.has(m.id)
        );
        if (newRolls.length > 0) {
          newRolls.forEach((m) => seenRollIdsRef.current.add(m.id));
          const lastR = newRolls[newRolls.length - 1];
          playDiceSound(lastR.rollData!.isCrit, lastR.rollData!.isFumble);
          const additions: DiceToastItem[] = newRolls.map((m) => ({
            id: m.id,
            sender: m.sender,
            rollData: m.rollData!,
            isSecret: m.isSecret
          }));
          setDiceToasts((prev) => [...prev, ...additions].slice(-4));
          additions.forEach((item) => {
            window.setTimeout(() => {
              setDiceToasts((prev) => prev.filter((t) => t.id !== item.id));
            }, 5200);
          });
        }
      }

      setRoomState(state);
      setOnlineUsers(users || []);
    });

    socket.on('map:ping', (ping: MapPing) => {
      setPings((prev) => [...prev.filter((p) => Date.now() - p.timestamp < 3200), ping]);
      window.setTimeout(() => {
        setPings((prev) => prev.filter((p) => p.id !== ping.id));
      }, 3200);
    });

    socket.on('action:error', ({ message }: { message: string }) => {
      setActionError(message);
      window.setTimeout(() => setActionError(''), 4000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleCreateRoom = (data: {
    roomId: string;
    roomName: string;
    userName: string;
    dmPassword: string;
  }): Promise<string | null> => {
    return new Promise((resolve) => {
      socketRef.current?.emit(
        'room:create',
        data,
        (res: { ok: boolean; roomId?: string; error?: string }) => {
          if (res.ok) {
            activeSessionRef.current = {
              roomId: res.roomId || data.roomId.toUpperCase(),
              userName: data.userName,
              role: 'dm',
              dmPassword: data.dmPassword
            };
            setRole('dm');
            setUserName(data.userName);
            resolve(null);
          } else {
            resolve(res.error || 'Erro ao criar sala.');
          }
        }
      );
    });
  };

  const handleJoinRoom = (data: {
    roomId: string;
    userName: string;
    role: Role;
    dmPassword: string;
  }): Promise<string | null> => {
    return new Promise((resolve) => {
      socketRef.current?.emit(
        'room:join',
        data,
        (res: { ok: boolean; roomId?: string; error?: string }) => {
          if (res.ok) {
            activeSessionRef.current = {
              roomId: res.roomId || data.roomId.toUpperCase(),
              userName: data.userName,
              role: data.role,
              dmPassword: data.dmPassword
            };
            setRole(data.role);
            setUserName(data.userName);
            resolve(null);
          } else {
            resolve(res.error || 'Erro ao entrar na sala.');
          }
        }
      );
    });
  };

  useEffect(() => {
    if (myRollTimestamps.length === 0) return;
    const windowMs = Math.max(5, roomState?.rollLimit?.windowSeconds ?? 40) * 1000;
    const iv = window.setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      setMyRollTimestamps((prev) => prev.filter((ts) => now - ts < windowMs));
    }, 500);
    return () => window.clearInterval(iv);
  }, [myRollTimestamps.length, roomState?.rollLimit?.windowSeconds]);

  const handleLeaveRoom = () => {
    activeSessionRef.current = null;
    seenRollIdsRef.current.clear();
    hasInitializedRollsRef.current = false;
    setDiceToasts([]);
    setMyRollTimestamps([]);
    socketRef.current?.disconnect();
    socketRef.current?.connect();
    setRoomState(null);
    setShowInviteModal(false);
    setRightTab('chat');
    fetchRooms();
  };

  const handleDeleteRoom = async (roomId: string, dmPassword?: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dmPassword: dmPassword || '' })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return data.error || 'Não foi possível apagar a sala.';
      }
      await fetchRooms();
      return null;
    } catch {
      return 'Erro de conexão ao apagar sala.';
    }
  };

  const handleCopyCode = () => {
    if (!roomState) return;
    navigator.clipboard.writeText(roomState.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRoll = (
    formula: string,
    mode: RollMode = 'normal',
    label?: string,
    isSecret = false
  ): RollData | null => {
    const rollLimitCfg = roomState?.rollLimit || { enabled: true, maxRolls: 2, windowSeconds: 40 };
    if (role !== 'dm' && rollLimitCfg.enabled) {
      const now = Date.now();
      const windowMs = Math.max(5, rollLimitCfg.windowSeconds) * 1000;
      const active = myRollTimestamps.filter((ts) => now - ts < windowMs);
      if (active.length >= rollLimitCfg.maxRolls) {
        const waitSec = Math.max(1, Math.ceil((active[0] + windowMs - now) / 1000));
        setActionError(
          `Limite de rolagens atingido (${rollLimitCfg.maxRolls} a cada ${rollLimitCfg.windowSeconds}s). Aguarde ${waitSec}s.`
        );
        window.setTimeout(() => setActionError(''), 3500);
        return null;
      }
      setNowMs(now);
      setMyRollTimestamps([...active, now]);
    }

    const rollData = executeRollFormula(formula, mode, label);
    if (!rollData) {
      socketRef.current?.emit('chat:message', {
        sender: userName,
        type: 'chat',
        text: `⚠️ Fórmula de dado inválida: "${formula}"`,
        isSecret: true
      });
      return null;
    }

    socketRef.current?.emit('chat:message', {
      sender: userName,
      type: 'roll',
      text: `${label || formula}: ${rollData.total}`,
      isSecret: role === 'dm' ? isSecret : false,
      rollData
    });
    return rollData;
  };

  const handleSendMessage = (text: string, isSecret: boolean, recipient?: string) => {
    socketRef.current?.emit('chat:message', {
      sender: userName,
      type: 'chat',
      text,
      isSecret: role === 'dm' ? isSecret : false,
      recipient
    });
  };

  const buildCharTokenPayload = (char: CharacterSheet, x: number, y: number) => ({
    name: char.name,
    x,
    y,
    size: char.race.toLowerCase().includes('grande') ? 2 : 1,
    color: char.isNpc ? '#ef4444' : '#3b82f6',
    avatar: char.avatar || '🛡️',
    imageUrl: char.imageUrl,
    hp: char.hp,
    maxHp: char.maxHp,
    ac: char.ac,
    hidden: role === 'dm' && Boolean(char.isSecretNpc),
    ownerName: char.ownerName || userName,
    characterId: char.id,
    type: char.isNpc ? 'npc' : 'pc',
    conditions: char.conditions || [],
    modelSlug: char.modelSlug,
    modelNameEn:
      char.modelNameEn ||
      (!char.isNpc ? `${char.subrace || char.race} ${char.className}`.trim() : undefined),
    modelType: char.modelType || (char.isNpc ? undefined : 'humanoid')
  });

  const handleSaveCharacter = (char: CharacterSheet, spawnToken = false) => {
    socketRef.current?.emit('character:save', char);
    if (spawnToken) {
      socketRef.current?.emit(
        'token:add',
        buildCharTokenPayload(char, 3 + Math.floor(Math.random() * 4), 6 + Math.floor(Math.random() * 4))
      );
    }
  };

  const handleSpawnTokenFromChar = (char: CharacterSheet) => {
    socketRef.current?.emit(
      'token:add',
      buildCharTokenPayload(char, 4 + Math.floor(Math.random() * 5), 5 + Math.floor(Math.random() * 5))
    );
  };

  const handleAddMonsterFromBook = (
    char: CharacterSheet,
    spawnMode: 'hidden' | 'visible' | 'sheet-only',
    quantity: number
  ) => {
    socketRef.current?.emit('character:save', char);
    if (spawnMode === 'sheet-only') return;

    const isLarge =
      char.race.toLowerCase().includes('grande') ||
      char.race.toLowerCase().includes('enorme');
    const isHuge = char.race.toLowerCase().includes('enorme') || char.race.toLowerCase().includes('imenso');
    const size = isHuge ? 3 : isLarge ? 2 : 1;

    for (let i = 0; i < quantity; i++) {
      socketRef.current?.emit('token:add', {
        name: quantity > 1 ? `${char.name} #${i + 1}` : char.name,
        x: 6 + (i % 4) * size,
        y: 5 + Math.floor(i / 4) * size,
        size,
        color: spawnMode === 'hidden' ? '#a855f7' : '#ef4444',
        avatar: char.avatar || '👹',
        imageUrl: char.imageUrl,
        hp: char.hp,
        maxHp: char.maxHp,
        ac: char.ac,
        hidden: spawnMode === 'hidden',
        ownerName: 'Mestre',
        characterId: char.id,
        type: 'monster',
        conditions: [],
        modelSlug: char.modelSlug,
        modelNameEn: char.modelNameEn,
        modelType: char.modelType
      });
    }
  };

  const handleExportBackup = () => {
    socketRef.current?.emit('room:exportBackup', (res: { ok: boolean; backup?: any }) => {
      if (!res?.ok || !res.backup) return;
      const blob = new Blob([JSON.stringify(res.backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campanha-${roomState?.id || 'mesa'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleAddToInitiative = (input: Token | Token[]) => {
    if (!roomState || role !== 'dm') return;
    const list = Array.isArray(input) ? input : [input];
    if (list.length === 0) return;
    const replaceIds = new Set(list.map((t) => t.id));
    const added = list.map((token, idx) => ({
      id: `init-${token.id}-${Date.now()}-${idx}`,
      name: token.name,
      roll: rollDie(20),
      hp: token.hp,
      maxHp: token.maxHp,
      ac: token.ac,
      isNpc: token.type !== 'pc',
      hidden: token.hidden,
      tokenId: token.id
    }));
    const nextEntries = [
      ...roomState.initiative.entries.filter((e) => !e.tokenId || !replaceIds.has(e.tokenId)),
      ...added
    ].sort((a, b) => b.roll - a.roll);

    socketRef.current?.emit('initiative:update', {
      ...roomState.initiative,
      entries: nextEntries
    });
    setRightTab('combat');
  };

  if (!roomState) {
    return (
      <Lobby
        rooms={roomsList}
        networkInfo={networkInfo}
        loadingRooms={loadingRooms}
        initialJoinCode={initialJoinCode}
        onRefreshRooms={fetchRooms}
        onRestartTunnel={handleRestartTunnel}
        onDeleteRoom={handleDeleteRoom}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
      />
    );
  }

  const npcs = roomState.characters.filter((c) => c.isNpc);
  const playerCharacters = roomState.characters.filter((c) => !c.isNpc);
  const myCharCount = roomState.characters.filter(
    (c) => !c.isNpc && c.ownerName === userName
  ).length;
  const myCharLimit = roomState.allowMultiCharAll
    ? 99
    : roomState.playerCharLimits?.[userName] ?? 1;
  const canCreateCharacter = role === 'dm' || myCharCount < myCharLimit;
  const creationLimitLabel =
    role === 'dm'
      ? undefined
      : roomState.allowMultiCharAll
      ? `Suas fichas: ${myCharCount} (Criação livre pelo Mestre)`
      : `Suas fichas: ${myCharCount} / ${myCharLimit}`;
  const sortedInitiative = [...roomState.initiative.entries].sort((a, b) => b.roll - a.roll);
  const activeTokenId =
    sortedInitiative.length > 0
      ? sortedInitiative[roomState.initiative.activeIndex % sortedInitiative.length]?.tokenId
      : undefined;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Cabeçalho Superior */}
      <header className="min-h-12 shrink-0 bg-slate-900/95 border-b border-slate-800 px-2.5 sm:px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
          <span className="font-fantasy font-bold text-amber-400 text-base tracking-wide hidden sm:inline shrink-0">
            Aetheria VTT
          </span>
          <div className="h-4 w-px bg-slate-800 hidden sm:block shrink-0" />
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[110px] sm:max-w-[180px] md:max-w-xs">
            {roomState.name}
          </span>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 hover:border-amber-500/50 text-xs font-mono text-amber-300 transition cursor-pointer whitespace-nowrap shrink-0"
            title="Copiar código da sala para enviar aos amigos"
          >
            <span>{roomState.id}</span>
            {copiedCode ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400" />
            )}
          </button>

          <button
            onClick={() => {
              fetchNetworkInfo();
              setShowInviteModal(true);
            }}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 text-xs font-semibold text-emerald-300 transition cursor-pointer whitespace-nowrap shrink-0"
            title="Abrir links de convite e link público na internet para jogar com amigos"
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>
              {networkInfo?.tunnel?.status === 'connected' ? 'Online' : 'Convidar'}
            </span>
            {networkInfo?.tunnel?.status === 'connected' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Jogadores Online */}
          <div
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 whitespace-nowrap shrink-0"
            title={onlineUsers.map((u) => `${u.name} (${u.role === 'dm' ? 'Mestre' : 'Jogador'})`).join(', ')}
          >
            <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              {onlineUsers.length}
              <span className="hidden sm:inline"> online</span>
            </span>
          </div>

          {/* Indicador de Visão (Mestre vs Jogador) */}
          <div
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-bold whitespace-nowrap shrink-0 ${
              role === 'dm'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-sky-500/15 border-sky-500/40 text-sky-300'
            }`}
          >
            {role === 'dm' ? (
              <Crown className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Shield className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="max-w-[110px] sm:max-w-[180px] truncate">
              {role === 'dm' ? 'Mestre' : userName}
            </span>
          </div>

          <button
            onClick={() => setShowSidebar((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
              showSidebar
                ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
            }`}
            title={showSidebar ? 'Ocultar painel lateral para ampliar o mapa' : 'Mostrar painel lateral (Chat, Fichas, Combate, Mestre)'}
          >
            {showSidebar ? (
              <PanelRightClose className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="hidden sm:inline">{showSidebar ? 'Ocultar Menu' : 'Menu'}</span>
          </button>

          <div
            className={`w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-emerald-400' : 'bg-rose-500'}`}
            title={connected ? 'Conectado em tempo real' : 'Reconectando...'}
          />

          <button
            onClick={handleLeaveRoom}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition cursor-pointer shrink-0"
            title="Sair da Mesa"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Coluna Esquerda: Tabuleiro + Barra de Dados */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          <div className="flex-1 min-h-0 relative">
            <TabletopCanvas
              map={roomState.map}
              tokens={roomState.tokens}
              drawings={roomState.drawings || []}
              pings={pings}
              activeTokenId={activeTokenId}
              role={role}
              userName={userName}
              onMoveToken={(id, x, y) =>
                socketRef.current?.emit('token:update', { id, patch: { x, y } })
              }
              onUpdateToken={(id, patch) =>
                socketRef.current?.emit('token:update', { id, patch })
              }
              onUpdateTokens={(updates) =>
                socketRef.current?.emit('token:updateMany', { updates })
              }
              onDeleteToken={(id) => socketRef.current?.emit('token:delete', { id })}
              onToggleFogCells={(cells, covered) =>
                socketRef.current?.emit('fog:toggleCells', { cells, covered })
              }
              onAddToInitiative={handleAddToInitiative}
              onAddDrawing={(drawing) => socketRef.current?.emit('drawing:add', drawing)}
              onClearDrawings={() => socketRef.current?.emit('drawing:clear')}
              onPing={(x, y, color) => socketRef.current?.emit('map:ping', { x, y, color })}
            />

            {/* Animações 3D de Rolagem de Dados (separadas por jogador sem sobreposição) */}
            <DiceTray3D toasts={diceToasts} />
          </div>

          <DiceBar
            role={role}
            mode={rollMode}
            onChangeMode={setRollMode}
            rollQuota={(() => {
              const cfg = roomState.rollLimit || { enabled: true, maxRolls: 2, windowSeconds: 40 };
              const windowMs = Math.max(5, cfg.windowSeconds) * 1000;
              const active = myRollTimestamps.filter((ts) => nowMs - ts < windowMs);
              const waitSec =
                active.length >= cfg.maxRolls
                  ? Math.max(1, Math.ceil((active[0] + windowMs - nowMs) / 1000))
                  : 0;
              return {
                enabled: cfg.enabled,
                maxRolls: cfg.maxRolls,
                windowSeconds: cfg.windowSeconds,
                used: active.length,
                waitSec
              };
            })()}
            onRoll={handleRoll}
          />
        </div>

        {/* Barra Lateral Direita */}
        {showSidebar && (
          <aside className="w-full md:w-[330px] lg:w-[385px] xl:w-[420px] h-[46vh] md:h-full shrink-0 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col bg-slate-900/80 min-h-0">
          {/* Navegação da Sidebar */}
          <div className="grid grid-flow-col auto-cols-fr border-b border-slate-800 bg-slate-950/80 text-xs">
            <SidebarTabBtn
              active={rightTab === 'chat'}
              onClick={() => setRightTab('chat')}
              icon={<MessageSquare className="w-3.5 h-3.5" />}
              label="Chat"
            />
            <SidebarTabBtn
              active={rightTab === 'sheets'}
              onClick={() => setRightTab('sheets')}
              icon={<ScrollText className="w-3.5 h-3.5" />}
              label={`Fichas (${roomState.characters.length})`}
              badge={
                role !== 'dm'
                  ? (roomState.trades || []).filter(
                      (t) =>
                        t.playerName === userName &&
                        (t.status === 'countered' ||
                          (t.status === 'pending' && t.direction === 'dm_to_player'))
                    ).length
                  : 0
              }
            />
            <SidebarTabBtn
              active={rightTab === 'combat'}
              onClick={() => setRightTab('combat')}
              icon={<Swords className="w-3.5 h-3.5" />}
              label="Combate"
            />
            {role === 'dm' && (
              <SidebarTabBtn
                active={rightTab === 'dm'}
                onClick={() => setRightTab('dm')}
                icon={<Settings className="w-3.5 h-3.5" />}
                label="Mestre"
                badge={
                  (roomState.trades || []).filter(
                    (t) => t.status === 'pending' && t.direction !== 'dm_to_player'
                  ).length
                }
              />
            )}
          </div>

          {/* Conteúdo da Aba */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {rightTab === 'chat' && (
              <ChatPanel
                messages={roomState.chat}
                role={role}
                userName={userName}
                onlineUsers={onlineUsers}
                onSendMessage={handleSendMessage}
                onRollFormula={handleRoll}
              />
            )}

            {rightTab === 'sheets' && (
              <CharacterSheetPanel
                characters={roomState.characters}
                role={role}
                userName={userName}
                canCreateCharacter={canCreateCharacter}
                creationLimitLabel={creationLimitLabel}
                trades={roomState.trades || []}
                onOpenBuilder={() => {
                  if (canCreateCharacter) setShowBuilder(true);
                }}
                onSaveCharacter={(char) => handleSaveCharacter(char, false)}
                onDeleteCharacter={(id) => socketRef.current?.emit('character:delete', { id })}
                onSpawnToken={handleSpawnTokenFromChar}
                rollMode={rollMode}
                onChangeRollMode={setRollMode}
                onRoll={handleRoll}
                onCreateTrade={(payload) => socketRef.current?.emit('trade:create', payload)}
                onRespondTrade={(tradeId, accept) =>
                  socketRef.current?.emit('trade:respond', { tradeId, accept })
                }
              />
            )}

            {rightTab === 'combat' && (
              <InitiativeTracker
                initiative={roomState.initiative}
                role={role}
                tokens={roomState.tokens}
                characters={roomState.characters}
                onUpdate={(next) => socketRef.current?.emit('initiative:update', next)}
              />
            )}

            {rightTab === 'dm' && role === 'dm' && (
              <DmPanel
                map={roomState.map}
                dmNotes={roomState.dmNotes}
                npcs={npcs}
                playerCharacters={playerCharacters}
                onlineUsers={onlineUsers}
                playerCharLimits={roomState.playerCharLimits || {}}
                allowMultiCharAll={Boolean(roomState.allowMultiCharAll)}
                rollLimit={roomState.rollLimit || { enabled: true, maxRolls: 2, windowSeconds: 40 }}
                scenes={roomState.scenes || [{ id: 'scene-1', name: 'Cena Principal' }]}
                activeSceneId={roomState.activeSceneId}
                onUpdateMap={(patch) => socketRef.current?.emit('map:update', patch)}
                onFillFog={(covered) => socketRef.current?.emit('fog:fillAll', { covered })}
                onAddToken={(token) => socketRef.current?.emit('token:add', token)}
                onSaveCharacter={(char) => handleSaveCharacter(char, false)}
                onUpdateDmNotes={(notes) => socketRef.current?.emit('dm:updateNotes', { notes })}
                onOpenBestiaryBook={() => setShowBestiary(true)}
                onCreateScene={(name, presetId, imageUrl, cols, rows) =>
                  socketRef.current?.emit('scene:create', {
                    name,
                    presetId,
                    imageUrl,
                    cols,
                    rows
                  })
                }
                onSwitchScene={(sceneId) => socketRef.current?.emit('scene:switch', { sceneId })}
                onDeleteScene={(sceneId) => socketRef.current?.emit('scene:delete', { sceneId })}
                onExportBackup={handleExportBackup}
                onImportBackup={(data) => socketRef.current?.emit('room:importBackup', data)}
                onSetPlayerCharLimit={(payload) =>
                  socketRef.current?.emit('dm:setPlayerCharLimit', payload)
                }
                onSetRollLimit={(cfg) => socketRef.current?.emit('dm:setRollLimit', cfg)}
                onGrantReward={(payload) =>
                  socketRef.current?.emit('dm:grantReward', payload)
                }
                trades={roomState.trades || []}
                onCreateTrade={(payload) => socketRef.current?.emit('trade:create', payload)}
                onRespondTrade={(tradeId, accept, counterCoins) =>
                  socketRef.current?.emit('trade:respond', { tradeId, accept, counterCoins })
                }
                onCounterTrade={(tradeId, counterCoins, counterNote) =>
                  socketRef.current?.emit('trade:counter', { tradeId, counterCoins, counterNote })
                }
                onClearResolvedTrades={() => socketRef.current?.emit('trade:clearResolved')}
              />
            )}
          </div>
          </aside>
        )}
      </div>

      {/* Modal de Criação de Personagem */}
      {showBuilder && (
        <CharacterBuilder
          ownerName={userName}
          isDm={role === 'dm'}
          onClose={() => setShowBuilder(false)}
          onSave={(char, spawnToken) => {
            handleSaveCharacter(char, spawnToken);
            setShowBuilder(false);
            setRightTab('sheets');
          }}
        />
      )}

      {/* Livro dos Monstros (Bestiário Completo) */}
      {showBestiary && role === 'dm' && (
        <BestiaryBookModal
          onClose={() => setShowBestiary(false)}
          onAddMonster={handleAddMonsterFromBook}
        />
      )}

      {/* Modal Convidar Amigos / Jogar Online */}
      {showInviteModal && roomState && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-xs">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                <Globe className="w-4 h-4" />
                Convidar Amigos & Jogar Online
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="text-[11px] text-slate-400 uppercase font-bold">
                  Código da Mesa
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-black text-lg text-amber-300 tracking-wider">
                    {roomState.id}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(roomState.id);
                      setCopiedInviteKey('code');
                      setTimeout(() => setCopiedInviteKey(null), 1800);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedInviteKey === 'code' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copiar Código
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Link Público Automático na Internet */}
              <div className="bg-slate-950/90 border border-emerald-500/45 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] text-emerald-300 uppercase font-bold flex items-center gap-1.5">
                    {networkInfo?.tunnel?.status === 'connected' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                    Link Público na Internet (Porta Aberta para Amigos)
                  </div>
                  <button
                    onClick={handleRestartTunnel}
                    className="text-[11px] text-slate-300 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${
                        networkInfo?.tunnel?.status === 'starting' ? 'animate-spin text-amber-300' : ''
                      }`}
                    />
                    {networkInfo?.tunnel?.status === 'connected' ? 'Gerar novo' : 'Abrir porta'}
                  </button>
                </div>

                {networkInfo?.tunnel?.status === 'connected' && networkInfo.tunnel.publicUrl ? (
                  (() => {
                    const publicInvite = `${networkInfo.tunnel.publicUrl}/?room=${roomState.id}`;
                    return (
                      <div className="flex items-center justify-between gap-2 bg-slate-900 border border-emerald-500/30 rounded-lg px-2.5 py-2">
                        <span className="font-mono text-emerald-200 truncate">{publicInvite}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(publicInvite);
                            setCopiedInviteKey('public-tunnel');
                            setTimeout(() => setCopiedInviteKey(null), 1800);
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shrink-0 cursor-pointer"
                        >
                          {copiedInviteKey === 'public-tunnel' ? '✓ Copiado!' : 'Copiar Link Público'}
                        </button>
                      </div>
                    );
                  })()
                ) : networkInfo?.tunnel?.status === 'starting' ? (
                  <div className="text-amber-300 flex items-center gap-2 py-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Abrindo túnel público na internet... aguarde alguns segundos.
                  </div>
                ) : (
                  <div className="text-rose-300">
                    {networkInfo?.tunnel?.error || 'Túnel fechado. Clique em "Abrir porta" acima.'}
                  </div>
                )}
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="text-[11px] text-slate-400 uppercase font-bold">
                  Link Direto de Convite (Mesmo Endereço)
                </div>
                {(() => {
                  const directLink = `${window.location.origin}/?room=${roomState.id}`;
                  return (
                    <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2">
                      <span className="font-mono text-slate-200 truncate">{directLink}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(directLink);
                          setCopiedInviteKey('origin');
                          setTimeout(() => setCopiedInviteKey(null), 1800);
                        }}
                        className="px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shrink-0 cursor-pointer"
                      >
                        {copiedInviteKey === 'origin' ? '✓ Copiado' : 'Copiar Link'}
                      </button>
                    </div>
                  );
                })()}
              </div>

              {networkInfo && networkInfo.ips.length > 0 && (
                <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3 space-y-2">
                  <div className="text-[11px] text-emerald-300 uppercase font-bold">
                    Links Detectados (Radmin VPN / Tailscale / Wi-Fi)
                  </div>
                  <div className="space-y-1.5">
                    {networkInfo.ips.map((entry) => {
                      const portStr = window.location.port
                        ? `:${window.location.port}`
                        : `:${networkInfo.port}`;
                      const link = `http://${entry.ip}${portStr}/?room=${roomState.id}`;
                      return (
                        <div
                          key={entry.ip}
                          className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5"
                        >
                          <div className="min-w-0">
                            <div className="text-[10px] text-emerald-300 font-semibold">
                              {entry.label}
                            </div>
                            <div className="font-mono text-[11px] text-slate-200 truncate">
                              {link}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(link);
                              setCopiedInviteKey(entry.ip);
                              setTimeout(() => setCopiedInviteKey(null), 1800);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold shrink-0 cursor-pointer"
                          >
                            {copiedInviteKey === entry.ip ? '✓ Copiado' : 'Copiar'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                <div className="font-bold text-amber-300">Como seus amigos entram pela Internet:</div>
                <div>
                  1. <strong>Com Radmin VPN / Tailscale / ZeroTier:</strong> conectem na mesma rede virtual e envie o link da VPN acima.
                </div>
                <div>
                  2. <strong>Qualquer lugar sem VPN (Túnel):</strong> execute{' '}
                  <code className="text-amber-300">npm run start:prod</code> e abra um túnel público com{' '}
                  <code className="text-emerald-300">npx cloudflared tunnel --url http://localhost:3001</code>{' '}
                  (ou Port Forwarding no VS Code / ngrok). Depois envie o link gerado +{' '}
                  <code className="text-slate-200">/?room={roomState.id}</code>.
                </div>
                <div>
                  3. <strong>Hospedagem 24h (Render / Railway):</strong> basta subir o projeto usando build{' '}
                  <code className="text-amber-300">npm run build</code> e start{' '}
                  <code className="text-amber-300">npm start</code>.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de Permissão / Limite */}
      {actionError && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-rose-950/95 border border-rose-500 text-rose-100 px-4 py-2 rounded-xl shadow-2xl text-xs font-semibold">
          ⚠️ {actionError}
        </div>
      )}
    </div>
  );
}

function SidebarTabBtn({
  active,
  onClick,
  icon,
  label,
  badge
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1 py-2.5 px-1.5 font-semibold border-b-2 transition cursor-pointer min-w-0 ${
        active
          ? 'border-amber-500 text-amber-300 bg-slate-900/60'
          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black leading-4">
          {badge}
        </span>
      )}
    </button>
  );
}

export default App;

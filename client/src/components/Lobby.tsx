import React, { useEffect, useRef, useState } from 'react';
import {
  Crown,
  Sword,
  Shield,
  Sparkles,
  Users,
  KeyRound,
  DoorOpen,
  RefreshCw,
  Trash2,
  Lock,
  Clock,
  Globe,
  Copy,
  Check,
  Play
} from 'lucide-react';
import { NetworkInfo, Role, RoomSummary } from '../types/rpg';

interface LobbyProps {
  rooms: RoomSummary[];
  networkInfo: NetworkInfo | null;
  loadingRooms?: boolean;
  initialJoinCode?: string;
  onRefreshRooms: () => void;
  onRestartTunnel: () => void;
  onDeleteRoom: (roomId: string, dmPassword?: string) => Promise<string | null>;
  onCreateRoom: (data: {
    roomId: string;
    roomName: string;
    userName: string;
    dmPassword: string;
  }) => Promise<string | null>;
  onJoinRoom: (data: {
    roomId: string;
    userName: string;
    role: Role;
    dmPassword: string;
  }) => Promise<string | null>;
}

function formatDateTimePt(ts: number): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(ts));
  } catch {
    return '';
  }
}

export const Lobby: React.FC<LobbyProps> = ({
  rooms,
  networkInfo,
  loadingRooms = false,
  initialJoinCode = '',
  onRefreshRooms,
  onRestartTunnel,
  onDeleteRoom,
  onCreateRoom,
  onJoinRoom
}) => {
  const [tab, setTab] = useState<'create' | 'join'>(initialJoinCode ? 'join' : 'create');
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('A Mina Perdida de Phandelver');
  const [roomId, setRoomId] = useState(() => `MESA-${Math.floor(100 + Math.random() * 899)}`);
  const [joinCode, setJoinCode] = useState(() => initialJoinCode.toUpperCase());
  const [joinRole, setJoinRole] = useState<Role>('player');
  const [dmPassword, setDmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialJoinCode) {
      setTab('join');
      setJoinCode(initialJoinCode.toUpperCase());
    }
  }, [initialJoinCode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!userName.trim()) {
      setError('Digite seu nome de Mestre.');
      return;
    }
    setLoading(true);
    const err = await onCreateRoom({
      roomId: roomId.trim() || `MESA-${Math.floor(100 + Math.random() * 899)}`,
      roomName: roomName.trim() || 'Nova Campanha D&D',
      userName: userName.trim(),
      dmPassword
    });
    setLoading(false);
    if (err) setError(err);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!userName.trim()) {
      setError('Digite seu nome de jogador ou personagem.');
      return;
    }
    if (!joinCode.trim()) {
      setError('Digite o código da mesa.');
      return;
    }
    setLoading(true);
    const err = await onJoinRoom({
      roomId: joinCode.trim().toUpperCase(),
      userName: userName.trim(),
      role: joinRole,
      dmPassword
    });
    setLoading(false);
    if (err) setError(err);
  };

  const handleQuickSelectRoom = (id: string, asRole: Role) => {
    setError('');
    setTab('join');
    setJoinCode(id);
    setJoinRole(asRole);
    setTimeout(() => nameInputRef.current?.focus(), 40);
  };

  const handleConfirmDelete = async (r: RoomSummary) => {
    setError('');
    const err = await onDeleteRoom(r.id, r.hasPassword ? deletePassword : undefined);
    if (err) {
      setError(err);
    } else {
      setConfirmDeleteId(null);
      setDeletePassword('');
    }
  };

  const currentPort = window.location.port;
  const buildInviteBase = (ip: string) =>
    `http://${ip}${currentPort ? `:${currentPort}` : networkInfo?.port ? `:${networkInfo.port}` : ''}`;

  const copyText = (txt: string, key: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedIp(key);
    setTimeout(() => setCopiedIp(null), 1800);
  };

  return (
    <div className="h-screen w-full bg-slate-950 relative overflow-y-auto overflow-x-hidden">
      {/* Fundo decorativo */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(217,119,6,0.16),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(59,130,246,0.12),_transparent_55%)] pointer-events-none" />
      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />

      <div className="relative z-10 min-h-full w-full flex items-center justify-center p-3 sm:p-5">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch my-2">
        {/* Painel Esquerdo: Apresentação + Como Jogar Online */}
        <div className="lg:col-span-2 bg-slate-900/75 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-md shadow-2xl space-y-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              D&D 5e Virtual Tabletop
            </div>
            <h1 className="text-3xl font-bold text-amber-400 tracking-wide mb-2">
              Aetheria VTT
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed mb-5">
              Tabuleiro online para jogar RPG de mesa com seus amigos. Controle total do Mestre,
              névoa de guerra, rolagem 3D, miniaturas 3D exclusivas do bestiário e comércio em grupo.
            </p>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <Crown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-100">Visão Mestre vs Jogador</div>
                  <div className="text-slate-400">
                    Monstros ocultos, Névoa de Guerra, notas secretas e contrapropostas no comércio.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <Sword className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-100">Bestiário & Modelos 3D</div>
                  <div className="text-slate-400">
                    Mais de 720 criaturas com modelos 3D únicos, fichas D&D 5e e mapas prontos.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bloco Jogar Online com Amigos */}
          <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> Jogar Online com Amigos
              </div>
              {networkInfo?.tunnel?.status === 'connected' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Porta Aberta
                </span>
              )}
            </div>

            {/* Túnel Público Automático */}
            <div className="bg-slate-900/95 border border-emerald-500/35 rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Link Público na Internet (Qualquer Lugar)
                </span>
                <button
                  type="button"
                  onClick={onRestartTunnel}
                  className="text-[10px] text-slate-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  title="Gerar / reiniciar link público"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${
                      networkInfo?.tunnel?.status === 'starting' ? 'animate-spin text-amber-300' : ''
                    }`}
                  />
                  {networkInfo?.tunnel?.status === 'connected' ? 'Novo link' : 'Abrir'}
                </button>
              </div>

              {networkInfo?.tunnel?.status === 'connected' && networkInfo.tunnel.publicUrl ? (
                <div className="flex items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded px-2 py-1.5">
                  <span className="font-mono text-[11px] text-emerald-200 truncate">
                    {networkInfo.tunnel.publicUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(networkInfo.tunnel!.publicUrl!, 'public-tunnel')}
                    className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedIp === 'public-tunnel' ? (
                      <>
                        <Check className="w-3 h-3" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copiar
                      </>
                    )}
                  </button>
                </div>
              ) : networkInfo?.tunnel?.status === 'starting' ? (
                <div className="text-[11px] text-amber-300 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Abrindo túnel seguro automaticamente...
                </div>
              ) : networkInfo?.tunnel?.status === 'disabled' ? (
                <div className="text-[11px] text-slate-400">
                  Use a URL do navegador para convidar jogadores.
                </div>
              ) : (
                <div className="text-[11px] text-rose-300">
                  {networkInfo?.tunnel?.error || 'Túnel aguardando inicialização.'}
                </div>
              )}
            </div>

            {networkInfo && networkInfo.ips.length > 0 && (
              <div className="space-y-1.5 pt-0.5">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">
                  Ou via VPN / Rede Local:
                </div>
                {networkInfo.ips.map((entry) => {
                  const url = buildInviteBase(entry.ip);
                  return (
                    <div
                      key={entry.ip}
                      className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <div className="text-[10px] text-sky-300/90 font-semibold truncate">
                          {entry.label}
                        </div>
                        <div className="font-mono text-[11px] text-slate-200 truncate">{url}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(url, entry.ip)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedIp === entry.ip ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copiar
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Painel Direito: Formulário + Mesas Existentes */}
        <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-2xl flex flex-col gap-5">
          <div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-5">
              <button
                type="button"
                onClick={() => {
                  setTab('create');
                  setError('');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  tab === 'create'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Crown className="w-4 h-4" />
                Criar Mesa (Mestre)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('join');
                  setError('');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  tab === 'join'
                    ? 'bg-sky-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <DoorOpen className="w-4 h-4" />
                Entrar em Mesa
              </button>
            </div>

            {error && (
              <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-sm">
                {error}
              </div>
            )}

            {tab === 'create' ? (
              <form onSubmit={handleCreate} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Seu Nome (Mestre)
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Ex: Mestre Lucas"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Nome da Campanha
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Ex: A Maldição de Strahd"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Código da Sala
                    </label>
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                      placeholder="EX: MESA-101"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono uppercase focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5" />
                      Senha do Mestre (Opcional)
                    </label>
                    <input
                      type="password"
                      value={dmPassword}
                      onChange={(e) => setDmPassword(e.target.value)}
                      placeholder="Protege a visão do Mestre"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Criando Mesa...' : 'Abrir Mesa e Iniciar Sessão'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Seu Nome
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Ex: Thiago / Eldrin"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Código da Sala
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Ex: MESA-101"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sky-300 font-mono uppercase placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Entrar Como
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setJoinRole('player')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-medium transition cursor-pointer ${
                        joinRole === 'player'
                          ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                      Jogador
                    </button>
                    <button
                      type="button"
                      onClick={() => setJoinRole('dm')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-medium transition cursor-pointer ${
                        joinRole === 'dm'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Crown className="w-4 h-4" />
                      Mestre
                    </button>
                  </div>
                </div>

                {joinRole === 'dm' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Senha do Mestre (se houver)
                    </label>
                    <input
                      type="password"
                      value={dmPassword}
                      onChange={(e) => setDmPassword(e.target.value)}
                      placeholder="Digite a senha da sala"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-6 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-slate-950 font-bold text-sm shadow-lg shadow-sky-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Conectando...' : 'Entrar na Aventura'}
                </button>
              </form>
            )}
          </div>

          {/* Lista de Salas Salvas / Continuar Sessão */}
          <div className="pt-4 border-t border-slate-800/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Play className="w-3.5 h-3.5" />
                Mesas Existentes — Continuar Sessão ({rooms.length})
              </div>
              <button
                type="button"
                onClick={onRefreshRooms}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 cursor-pointer"
                title="Atualizar lista de salas"
              >
                <RefreshCw className={`w-3 h-3 ${loadingRooms ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            {rooms.length === 0 ? (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-center text-xs text-slate-400">
                Nenhuma mesa salva no momento. Crie uma nova mesa acima para começar sua campanha!
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {rooms.map((r) => (
                  <div
                    key={r.id}
                    className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 rounded-xl p-3 space-y-2 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-100 truncate">
                            {r.name}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 font-mono text-[11px] text-amber-300">
                            {r.id}
                          </span>
                          {r.hasPassword && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]"
                              title="Protegida por senha do Mestre"
                            >
                              <Lock className="w-2.5 h-2.5" /> Senha
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              r.onlineCount > 0 ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                r.onlineCount > 0 ? 'bg-emerald-400' : 'bg-slate-600'
                              }`}
                            />
                            {r.onlineCount > 0 ? `${r.onlineCount} online` : 'Salva'}
                          </span>
                          <span>• {r.characterCount} ficha(s)</span>
                          <span>• {r.sceneCount} cena(s)</span>
                          <span className="inline-flex items-center gap-1">
                            • <Clock className="w-3 h-3" /> {formatDateTimePt(r.updatedAt)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteId((cur) => (cur === r.id ? null : r.id));
                          setDeletePassword('');
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer shrink-0"
                        title="Apagar esta mesa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {confirmDeleteId === r.id ? (
                      <div className="flex items-center gap-2 bg-rose-950/30 border border-rose-500/40 rounded-lg p-2 text-[11px]">
                        {r.hasPassword && (
                          <input
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="Senha do Mestre..."
                            className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                          />
                        )}
                        {!r.hasPassword && (
                          <span className="flex-1 text-rose-200 font-medium">
                            Confirmar exclusão de {r.id}?
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(r)}
                          className="px-2.5 py-1 rounded bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold cursor-pointer"
                        >
                          Apagar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteId(null);
                            setDeletePassword('');
                          }}
                          className="px-2 py-1 rounded bg-slate-800 text-slate-300 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickSelectRoom(r.id, 'dm')}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Crown className="w-3.5 h-3.5" /> Continuar (Mestre)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickSelectRoom(r.id, 'player')}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Shield className="w-3.5 h-3.5" /> Entrar (Jogador)
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

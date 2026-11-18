import React, { useEffect, useRef, useState } from 'react';
import { Send, EyeOff, Dices, Crown, Shield, MessageSquareLock } from 'lucide-react';
import { ChatMessage, OnlineUser, Role, RollMode } from '../types/rpg';

interface ChatPanelProps {
  messages: ChatMessage[];
  role: Role;
  userName: string;
  onlineUsers: OnlineUser[];
  onSendMessage: (text: string, isSecret: boolean, recipient?: string) => void;
  onRollFormula: (formula: string, mode: RollMode, label?: string, isSecret?: boolean) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  role,
  userName,
  onlineUsers,
  onSendMessage,
  onRollFormula
}) => {
  const [input, setInput] = useState('');
  const [secretChat, setSecretChat] = useState(false);
  const [whisperTarget, setWhisperTarget] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const otherUsers = onlineUsers.filter((u) => u.name !== userName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    // Suporte a comando /r ou /roll
    if (trimmed.startsWith('/r ') || trimmed.startsWith('/roll ')) {
      const expr = trimmed.replace(/^\/(r|roll)\s+/, '');
      onRollFormula(expr, 'normal', `Comando ${expr}`, role === 'dm' ? secretChat : false);
      setInput('');
      return;
    }

    // Suporte a /w <Nome> <mensagem>
    if (trimmed.startsWith('/w ')) {
      const rest = trimmed.slice(3).trim();
      const spaceIdx = rest.indexOf(' ');
      if (spaceIdx > 0) {
        const target = rest.slice(0, spaceIdx).trim();
        const msgText = rest.slice(spaceIdx + 1).trim();
        if (msgText) {
          onSendMessage(msgText, false, target);
          setInput('');
          return;
        }
      }
    }

    if (whisperTarget) {
      onSendMessage(trimmed, false, whisperTarget);
    } else {
      onSendMessage(trimmed, role === 'dm' ? secretChat : false);
    }
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50">
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <div
                key={msg.id}
                className="text-[11px] text-center text-slate-400 bg-slate-950/60 border border-slate-800/70 rounded-lg py-1.5 px-2.5"
              >
                {msg.text}
              </div>
            );
          }

          if (msg.type === 'roll' && msg.rollData) {
            const { formula, rolls, discarded, modifier, total, mode, label, isCrit, isFumble } =
              msg.rollData;
            return (
              <div
                key={msg.id}
                className={`rounded-xl p-2.5 border transition ${
                  msg.isSecret
                    ? 'bg-purple-950/40 border-purple-500/40'
                    : isCrit
                    ? 'bg-emerald-950/40 border-emerald-500/50'
                    : isFumble
                    ? 'bg-rose-950/40 border-rose-500/50'
                    : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    {msg.role === 'dm' ? (
                      <Crown className="w-3 h-3 text-amber-400" />
                    ) : (
                      <Shield className="w-3 h-3 text-sky-400" />
                    )}
                    <span>{msg.sender}</span>
                    {msg.isSecret && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-purple-500/25 text-purple-300 text-[10px]">
                        <EyeOff className="w-2.5 h-2.5" /> Secreto
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                {label && <div className="text-xs text-amber-300/90 font-medium mb-1">{label}</div>}

                <div className="flex items-center justify-between gap-2 bg-slate-900/90 rounded-lg px-2.5 py-1.5 border border-slate-800/80">
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-1">
                    <Dices className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-mono text-slate-300">{formula}</span>
                    <span>→</span>
                    <span className="font-mono text-slate-200">[{rolls.join(', ')}]</span>
                    {discarded && discarded.length > 0 && (
                      <span className="font-mono text-slate-500 line-through">
                        ({discarded.join(', ')})
                      </span>
                    )}
                    {modifier !== 0 && (
                      <span className="font-mono text-slate-400">
                        {modifier > 0 ? `+${modifier}` : modifier}
                      </span>
                    )}
                    {mode !== 'normal' && (
                      <span
                        className={`text-[10px] px-1 rounded ${
                          mode === 'advantage'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {mode === 'advantage' ? 'Vantagem' : 'Desvantagem'}
                      </span>
                    )}
                  </div>

                  <div
                    className={`text-lg font-extrabold font-mono px-2 py-0.5 rounded-lg ${
                      isCrit
                        ? 'text-emerald-300 bg-emerald-500/20'
                        : isFumble
                        ? 'text-rose-300 bg-rose-500/20'
                        : 'text-amber-300 bg-amber-500/10'
                    }`}
                  >
                    {total}
                  </div>
                </div>

                {isCrit && (
                  <div className="text-[11px] font-bold text-emerald-400 mt-1">
                    ✨ ACERTO CRÍTICO! (20 Natural)
                  </div>
                )}
                {isFumble && (
                  <div className="text-[11px] font-bold text-rose-400 mt-1">
                    💀 FALHA CRÍTICA! (1 Natural)
                  </div>
                )}
              </div>
            );
          }

          const isWhisper = Boolean(msg.recipient);
          return (
            <div
              key={msg.id}
              className={`rounded-xl px-3 py-2 text-xs border ${
                isWhisper
                  ? 'bg-teal-950/35 border-teal-500/40'
                  : msg.isSecret
                  ? 'bg-purple-950/35 border-purple-500/40'
                  : 'bg-slate-950/70 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold text-slate-200 flex items-center gap-1 flex-wrap">
                  {msg.role === 'dm' ? (
                    <Crown className="w-3 h-3 text-amber-400" />
                  ) : (
                    <Shield className="w-3 h-3 text-sky-400" />
                  )}
                  {msg.sender}
                  {isWhisper && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-teal-300 bg-teal-500/20 px-1.5 rounded">
                      <MessageSquareLock className="w-2.5 h-2.5" /> Sussurro → {msg.recipient}
                    </span>
                  )}
                  {msg.isSecret && (
                    <span className="text-[10px] text-purple-300 bg-purple-500/20 px-1 rounded">
                      Mestre
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <p className="text-slate-300 whitespace-pre-wrap break-words">{msg.text}</p>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input do Chat + Sussurros */}
      <form onSubmit={handleSubmit} className="p-2.5 border-t border-slate-800 bg-slate-950/70 space-y-1.5">
        <div className="flex items-center justify-between gap-1.5 px-0.5">
          <div className="flex items-center gap-1">
            <select
              value={whisperTarget}
              onChange={(e) => setWhisperTarget(e.target.value)}
              className={`text-[11px] rounded-lg px-2 py-0.5 border bg-slate-900 ${
                whisperTarget
                  ? 'border-teal-500/60 text-teal-300 font-semibold'
                  : 'border-slate-700 text-slate-300'
              }`}
              title="Enviar mensagem privada (Sussurro)"
            >
              <option value="">Para: Todos</option>
              {role !== 'dm' && <option value="Mestre">Sussurrar p/ Mestre</option>}
              {otherUsers.map((u) => (
                <option key={u.id} value={u.name}>
                  Sussurrar p/ {u.name}
                </option>
              ))}
            </select>

            {role === 'dm' && !whisperTarget && (
              <button
                type="button"
                onClick={() => setSecretChat((s) => !s)}
                className={`text-[11px] flex items-center gap-1 px-2 py-0.5 rounded-lg transition cursor-pointer ${
                  secretChat
                    ? 'bg-purple-500/25 text-purple-300 font-semibold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <EyeOff className="w-3 h-3" />
                {secretChat ? 'Só Mestre' : 'Público'}
              </button>
            )}
          </div>
          <span className="text-[10px] text-slate-500">/r 1d20 • /w Nome</span>
        </div>

        <div className="flex gap-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              whisperTarget
                ? `Sussurrar para ${whisperTarget}...`
                : 'Mensagem, /r 1d20+5 ou /w Nome...'
            }
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer"
            title="Enviar"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

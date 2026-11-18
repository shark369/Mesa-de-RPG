import React from 'react';
import { EyeOff, Sparkles, Skull, User } from 'lucide-react';
import { RollData } from '../types/rpg';

export interface DiceToastItem {
  id: string;
  sender: string;
  rollData: RollData;
  isSecret: boolean;
}

interface DiceRoller3DProps {
  toast: DiceToastItem;
  compact?: boolean;
}

const SENDER_BADGE_COLORS = [
  'bg-sky-500/20 border-sky-400/50 text-sky-200',
  'bg-emerald-500/20 border-emerald-400/50 text-emerald-200',
  'bg-violet-500/20 border-violet-400/50 text-violet-200',
  'bg-rose-500/20 border-rose-400/50 text-rose-200',
  'bg-amber-500/20 border-amber-400/50 text-amber-200',
  'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
];

function getSenderColorClass(sender: string): string {
  let hash = 0;
  for (let i = 0; i < sender.length; i++) {
    hash = (hash * 31 + sender.charCodeAt(i)) >>> 0;
  }
  return SENDER_BADGE_COLORS[hash % SENDER_BADGE_COLORS.length];
}

export const DiceRoller3D: React.FC<DiceRoller3DProps> = ({ toast, compact = false }) => {
  const { sender, rollData, isSecret } = toast;
  const diceMatch = rollData.formula.match(/(\d+)?d(\d+)/i);
  const sides = diceMatch ? parseInt(diceMatch[2], 10) : 20;
  const shownRolls = rollData.rolls.slice(0, compact ? 4 : 6);

  const cubeSizeClass = compact ? 'w-11 h-11' : 'w-14 h-14';
  const depthPx = compact ? 22 : 28;

  const accentBorder = isSecret
    ? 'border-purple-400/70 shadow-purple-500/30'
    : rollData.isCrit
    ? 'border-emerald-400 shadow-emerald-500/40'
    : rollData.isFumble
    ? 'border-rose-500 shadow-rose-500/40'
    : 'border-amber-400/70 shadow-amber-500/30';

  const faceBg = isSecret
    ? 'from-purple-900 via-purple-950 to-slate-950 border-purple-400 text-purple-100'
    : rollData.isCrit
    ? 'from-emerald-700 via-emerald-900 to-slate-950 border-emerald-300 text-emerald-100'
    : rollData.isFumble
    ? 'from-rose-800 via-rose-950 to-slate-950 border-rose-400 text-rose-100'
    : 'from-amber-900 via-slate-900 to-slate-950 border-amber-400 text-amber-200';

  const faceStyle = (transform: string): React.CSSProperties => ({
    transform,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden'
  });

  const senderBadgeClass = getSenderColorClass(sender);

  return (
    <div className="flex flex-col items-center justify-end gap-1.5 max-w-[260px]">
      {/* Dados 3D rolando em espaço próprio para este jogador */}
      <div className={`flex flex-wrap items-center justify-center ${compact ? 'gap-2.5' : 'gap-4'} py-1`}>
        {shownRolls.map((val, idx) => (
          <div key={idx} className="dice-3d-scene relative flex flex-col items-center">
            <div
              className={`dice-3d-cube relative ${cubeSizeClass}`}
              style={{ animationDelay: `${idx * 70}ms` }}
            >
              {/* Frente (Resultado Final) */}
              <div
                className={`absolute inset-0 rounded-xl bg-gradient-to-br border-2 flex flex-col items-center justify-center shadow-2xl ${faceBg}`}
                style={faceStyle(`translateZ(${depthPx}px)`)}
              >
                <span className="text-[8px] uppercase font-bold opacity-75 leading-none">
                  d{sides}
                </span>
                <span className={`${compact ? 'text-base' : 'text-xl'} font-black font-mono leading-tight`}>
                  {val}
                </span>
              </div>

              {/* Verso */}
              <div
                className={`absolute inset-0 rounded-xl bg-gradient-to-br border flex items-center justify-center ${faceBg}`}
                style={faceStyle(`rotateY(180deg) translateZ(${depthPx}px)`)}
              >
                <span className="text-xs font-bold opacity-60">d{sides}</span>
              </div>

              {/* Direita */}
              <div
                className={`absolute inset-0 rounded-xl bg-gradient-to-br border flex items-center justify-center ${faceBg}`}
                style={faceStyle(`rotateY(90deg) translateZ(${depthPx}px)`)}
              >
                <span className="text-xs font-bold opacity-60">✦</span>
              </div>

              {/* Esquerda */}
              <div
                className={`absolute inset-0 rounded-xl bg-gradient-to-br border flex items-center justify-center ${faceBg}`}
                style={faceStyle(`rotateY(-90deg) translateZ(${depthPx}px)`)}
              >
                <span className="text-xs font-bold opacity-60">✦</span>
              </div>

              {/* Topo */}
              <div
                className={`absolute inset-0 rounded-xl bg-gradient-to-br border flex items-center justify-center ${faceBg}`}
                style={faceStyle(`rotateX(90deg) translateZ(${depthPx}px)`)}
              >
                <span className="text-[11px] font-bold opacity-60">{sides}</span>
              </div>

              {/* Base */}
              <div
                className={`absolute inset-0 rounded-xl bg-gradient-to-br border ${faceBg}`}
                style={faceStyle(`rotateX(-90deg) translateZ(${depthPx}px)`)}
              />
            </div>

            {/* Sombra no tabuleiro durante o quique */}
            <div
              className={`dice-3d-shadow ${compact ? 'w-9 h-2' : 'w-12 h-2.5'} rounded-full bg-black/70 blur-[3px] mt-1`}
              style={{ animationDelay: `${idx * 70}ms` }}
            />
          </div>
        ))}
      </div>

      {/* Placa de Resultado individual por jogador */}
      <div
        className={`animate-dice-pop px-3.5 py-2 rounded-2xl border bg-slate-950/92 backdrop-blur-md shadow-2xl flex items-center gap-2.5 ${accentBorder}`}
      >
        <div className="min-w-0">
          <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${senderBadgeClass}`}
            >
              <User className="w-2.5 h-2.5" />
              {sender}
            </span>
            <span className="text-amber-300 font-semibold truncate max-w-[130px]">
              {rollData.label || rollData.formula}
            </span>
            {isSecret && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-purple-500/25 text-purple-300 text-[10px]">
                <EyeOff className="w-2.5 h-2.5" /> Secreto
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            [{rollData.rolls.join(', ')}]
            {rollData.discarded && rollData.discarded.length > 0 && (
              <span className="line-through text-slate-500 ml-1">
                ({rollData.discarded.join(', ')})
              </span>
            )}
            {rollData.modifier !== 0 &&
              (rollData.modifier > 0 ? ` +${rollData.modifier}` : ` ${rollData.modifier}`)}
            {rollData.isCrit && (
              <span className="ml-1.5 text-emerald-400 font-bold inline-flex items-center gap-0.5">
                <Sparkles className="w-3 h-3" /> CRÍTICO!
              </span>
            )}
            {rollData.isFumble && (
              <span className="ml-1.5 text-rose-400 font-bold inline-flex items-center gap-0.5">
                <Skull className="w-3 h-3" /> FALHA CRÍTICA!
              </span>
            )}
          </div>
        </div>
        <div className="text-xl font-black font-mono text-amber-300 pl-2 border-l border-slate-800 shrink-0">
          {rollData.total}
        </div>
      </div>
    </div>
  );
};

export const DiceTray3D: React.FC<{ toasts: DiceToastItem[] }> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-4 z-30 flex flex-wrap items-end justify-center gap-4">
      {toasts.map((toast) => (
        <DiceRoller3D key={toast.id} toast={toast} compact={toasts.length > 1} />
      ))}
    </div>
  );
};

import React, { useState } from 'react';
import { Dices, EyeOff, Plus, Minus, Clock } from 'lucide-react';
import { Role, RollMode } from '../types/rpg';

interface DiceBarProps {
  role: Role;
  rollQuota?: {
    enabled: boolean;
    maxRolls: number;
    windowSeconds: number;
    used: number;
    waitSec: number;
  };
  onRoll: (formula: string, mode: RollMode, label?: string, isSecret?: boolean) => void;
}

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];

export const DiceBar: React.FC<DiceBarProps> = ({ role, rollQuota, onRoll }) => {
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [mode, setMode] = useState<RollMode>('normal');
  const [isSecret, setIsSecret] = useState(false);

  const isCoolingDown =
    role !== 'dm' &&
    Boolean(rollQuota?.enabled) &&
    (rollQuota?.used ?? 0) >= (rollQuota?.maxRolls ?? 2) &&
    (rollQuota?.waitSec ?? 0) > 0;

  const handleQuickRoll = (sides: number) => {
    const modStr = modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : `${modifier}`;
    const formula = `${count}d${sides}${modStr}`;
    const effectiveMode = sides === 20 && count === 1 ? mode : 'normal';
    onRoll(formula, effectiveMode, `Dado Rápido (${formula})`, role === 'dm' ? isSecret : false);
  };

  return (
    <div className="bg-slate-900/95 border-t border-slate-800 px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-1.5">
      {/* Dados Poliédricos */}
      <div className="flex items-center gap-1 flex-wrap">
        <div className="flex items-center gap-1 text-amber-400 text-xs font-semibold mr-0.5">
          <Dices className="w-4 h-4" />
          <span className="hidden sm:inline">Dados:</span>
        </div>

        {DICE_TYPES.map((sides) => (
          <button
            key={sides}
            disabled={isCoolingDown}
            onClick={() => handleQuickRoll(sides)}
            className={`px-2 py-1 rounded-lg font-mono text-xs font-bold border transition cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
              sides === 20
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500 hover:text-slate-950'
                : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-500'
            }`}
          >
            d{sides}
          </button>
        ))}

        {role !== 'dm' && rollQuota?.enabled && (
          <span
            className={`ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold ${
              isCoolingDown
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
            title={`Limite definido pelo Mestre: ${rollQuota.maxRolls} rolagens a cada ${rollQuota.windowSeconds}s`}
          >
            <Clock className="w-3 h-3" />
            {isCoolingDown
              ? `Aguarde ${rollQuota.waitSec}s`
              : `${Math.min(rollQuota.used, rollQuota.maxRolls)}/${rollQuota.maxRolls} (${rollQuota.windowSeconds}s)`}
          </span>
        )}
      </div>

      {/* Controles de Quantidade, Modificador, Vantagem e Segredo */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {/* Quantidade */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-1.5 py-1">
          <span className="text-slate-400 mr-1.5">Qtd:</span>
          <button
            onClick={() => setCount((c) => Math.max(1, c - 1))}
            className="p-0.5 hover:text-amber-400 text-slate-400 cursor-pointer"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-5 text-center font-mono font-bold text-slate-100">{count}</span>
          <button
            onClick={() => setCount((c) => Math.min(20, c + 1))}
            className="p-0.5 hover:text-amber-400 text-slate-400 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Modificador */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-1.5 py-1">
          <span className="text-slate-400 mr-1.5">Mod:</span>
          <button
            onClick={() => setModifier((m) => Math.max(-20, m - 1))}
            className="p-0.5 hover:text-amber-400 text-slate-400 cursor-pointer"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-7 text-center font-mono font-bold text-slate-100">
            {modifier >= 0 ? `+${modifier}` : modifier}
          </span>
          <button
            onClick={() => setModifier((m) => Math.min(30, m + 1))}
            className="p-0.5 hover:text-amber-400 text-slate-400 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Vantagem / Desvantagem */}
        <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
          {(['normal', 'advantage', 'disadvantage'] as RollMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                mode === m
                  ? m === 'advantage'
                    ? 'bg-emerald-500/25 text-emerald-300'
                    : m === 'disadvantage'
                    ? 'bg-rose-500/25 text-rose-300'
                    : 'bg-slate-800 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title={
                m === 'advantage'
                  ? 'Vantagem (2d20 pega o maior)'
                  : m === 'disadvantage'
                  ? 'Desvantagem (2d20 pega o menor)'
                  : 'Rolagem Normal'
              }
            >
              {m === 'normal' ? 'Normal' : m === 'advantage' ? 'Vant.' : 'Desv.'}
            </button>
          ))}
        </div>

        {/* Rolagem Secreta do Mestre */}
        {role === 'dm' && (
          <button
            onClick={() => setIsSecret((s) => !s)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
              isSecret
                ? 'bg-purple-500/25 border-purple-500 text-purple-200 shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Apenas o Mestre verá as rolagens feitas com esta opção ativa"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Oculto</span>
          </button>
        )}
      </div>
    </div>
  );
};

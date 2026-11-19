import React, { useState } from 'react';
import { Swords, SkipForward, RotateCcw, Plus, Trash2, Eye, EyeOff, Dices } from 'lucide-react';
import { CharacterSheet, InitiativeState, Role, Token } from '../types/rpg';
import { getAbilityMod } from '../data/dnd5e';
import { rollDie } from '../utils/dice';

interface InitiativeTrackerProps {
  initiative: InitiativeState;
  role: Role;
  tokens: Token[];
  characters: CharacterSheet[];
  onUpdate: (next: InitiativeState) => void;
}

export const InitiativeTracker: React.FC<InitiativeTrackerProps> = ({
  initiative,
  role,
  tokens,
  characters,
  onUpdate
}) => {
  const [name, setName] = useState('');
  const [roll, setRoll] = useState('10');

  const sortedEntries = [...initiative.entries].sort((a, b) => b.roll - a.roll);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'dm' || !name.trim()) return;
    const nextEntries = [
      ...initiative.entries,
      {
        id: `init-${Date.now()}`,
        name: name.trim(),
        roll: parseInt(roll, 10) || 10,
        hp: 10,
        maxHp: 10,
        ac: 10,
        isNpc: false,
        hidden: false
      }
    ].sort((a, b) => b.roll - a.roll);
    onUpdate({ ...initiative, entries: nextEntries });
    setName('');
  };

  const handleRollAllTokens = () => {
    if (role !== 'dm' || tokens.length === 0) return;
    const entries = tokens.map((tok) => {
      const char = characters.find((c) => c.id === tok.characterId);
      const dexMod = char ? getAbilityMod(char.abilities.dex) : 0;
      const total = rollDie(20) + dexMod;
      return {
        id: `init-${tok.id}`,
        name: tok.name,
        roll: total,
        hp: tok.hp,
        maxHp: tok.maxHp,
        ac: tok.ac,
        isNpc: tok.type !== 'pc',
        hidden: tok.hidden,
        tokenId: tok.id
      };
    });
    entries.sort((a, b) => b.roll - a.roll);
    onUpdate({ round: 1, activeIndex: 0, entries });
  };

  const handleNextTurn = () => {
    if (role !== 'dm' || sortedEntries.length === 0) return;
    let nextIdx = initiative.activeIndex + 1;
    let nextRound = initiative.round;
    if (nextIdx >= sortedEntries.length) {
      nextIdx = 0;
      nextRound += 1;
    }
    onUpdate({ ...initiative, activeIndex: nextIdx, round: nextRound, entries: sortedEntries });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 p-3 space-y-3">
      <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-100">
            Combate — Rodada {initiative.round}
          </span>
        </div>

        {role === 'dm' && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleRollAllTokens}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 font-semibold text-xs cursor-pointer"
              title="Rolar 1d20 + DES para todos os tokens no mapa"
            >
              <Dices className="w-3.5 h-3.5" /> Todos
            </button>
            <button
              onClick={handleNextTurn}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Próx.
            </button>
            <button
              onClick={() => onUpdate({ round: 1, activeIndex: 0, entries: [] })}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title="Limpar Combate"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {role === 'dm' && (
        <form onSubmit={handleAdd} className="flex gap-1.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do combatente..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
          />
          <input
            type="number"
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-center text-amber-300"
            title="Valor da Iniciativa"
          />
          <button
            type="submit"
            className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto space-y-1.5">
        {sortedEntries.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-8">
            Nenhum combatente na iniciativa.
            {role === 'dm' &&
              ' Clique em "Todos" para rolar a iniciativa dos tokens do mapa ou adicione acima.'}
          </div>
        ) : (
          sortedEntries.map((entry, idx) => {
            const isActive = idx === initiative.activeIndex;
            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-500 shadow-sm'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                      isActive
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-900 text-amber-300 border border-slate-700'
                    }`}
                  >
                    {entry.roll}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100 truncate">
                      {isActive && '▶ '}
                      {entry.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      CA {entry.ac}
                      {(role === 'dm' || !entry.isNpc) && ` • PV ${entry.hp}/${entry.maxHp}`}
                    </div>
                  </div>
                </div>

                {role === 'dm' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const updated = initiative.entries.map((it) =>
                          it.id === entry.id ? { ...it, hidden: !it.hidden } : it
                        );
                        onUpdate({ ...initiative, entries: updated });
                      }}
                      className={`p-1 rounded cursor-pointer ${
                        entry.hidden ? 'text-purple-300 bg-purple-500/20' : 'text-slate-400'
                      }`}
                      title={entry.hidden ? 'Oculto dos jogadores' : 'Visível aos jogadores'}
                    >
                      {entry.hidden ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        const updated = initiative.entries.filter((it) => it.id !== entry.id);
                        onUpdate({ ...initiative, entries: updated });
                      }}
                      className="p-1 rounded text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

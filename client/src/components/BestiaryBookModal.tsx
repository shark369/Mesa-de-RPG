import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FilePlus,
  Loader2,
  Search,
  Shield,
  Heart,
  Sparkles,
  X
} from 'lucide-react';
import {
  ABILITY_LABELS,
  formatMod,
  getAbilityMod
} from '../data/dnd5e';
import {
  AbilityKey,
  BestiaryIndexItem,
  BestiaryStatEntry,
  CharacterSheet
} from '../types/rpg';
import { MonsterModelViewer3D } from './MonsterModelViewer3D';

interface BestiaryBookModalProps {
  onClose: () => void;
  onAddMonster: (
    char: CharacterSheet,
    spawnMode: 'hidden' | 'visible' | 'sheet-only',
    quantity: number
  ) => void;
}

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const TYPE_LABELS_PT: Record<string, string> = {
  aberration: 'Aberração',
  beast: 'Besta',
  celestial: 'Celestial',
  construct: 'Constructo',
  dragon: 'Dragão',
  elemental: 'Elemental',
  fey: 'Fada',
  fiend: 'Corruptor',
  giant: 'Gigante',
  humanoid: 'Humanoide',
  monstrosity: 'Monstruosidade',
  ooze: 'Limo',
  plant: 'Planta',
  undead: 'Morto-Vivo'
};

function parseCrValue(cr: string): number {
  if (!cr) return 0;
  if (cr.includes('/')) {
    const [a, b] = cr.split('/').map(Number);
    return b ? a / b : 0;
  }
  return parseFloat(cr) || 0;
}

export const BestiaryBookModal: React.FC<BestiaryBookModalProps> = ({
  onClose,
  onAddMonster
}) => {
  const [catalog, setCatalog] = useState<BestiaryIndexItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'pdf' | 'pocketdm'>('all');
  const [crFilter, setCrFilter] = useState<'all' | 'low' | 'mid' | 'high' | 'epic'>('all');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeEntry, setActiveEntry] = useState<BestiaryStatEntry | null>(null);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [entryError, setEntryError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState('');

  // Carrega índice completo (PDF + PocketDM)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingCatalog(true);
        const res = await fetch('/api/bestiary');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setCatalog(data.items || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setCatalogError(err?.message || 'Erro ao carregar catálogo do Bestiário.');
        }
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((item) => {
      if (q) {
        const matchesName =
          item.namePt.toLowerCase().includes(q) ||
          item.nameEn.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q);
        if (!matchesName) return false;
      }
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (sourceFilter === 'pdf' && item.source !== 'pdf' && item.source !== 'both') return false;
      if (sourceFilter === 'pocketdm' && item.source !== 'pocketdm' && item.source !== 'both') return false;

      if (crFilter !== 'all') {
        const v = parseCrValue(item.cr);
        if (crFilter === 'low' && v > 0.5) return false;
        if (crFilter === 'mid' && (v <= 0.5 || v > 4)) return false;
        if (crFilter === 'high' && (v <= 4 || v > 10)) return false;
        if (crFilter === 'epic' && v <= 10) return false;
      }
      return true;
    });
  }, [catalog, search, typeFilter, sourceFilter, crFilter]);

  const safeIndex = filtered.length > 0 ? Math.min(currentIndex, filtered.length - 1) : 0;
  const currentItem = filtered[safeIndex] || null;

  // Carrega detalhes completos da página atual do livro
  useEffect(() => {
    if (!currentItem) {
      setActiveEntry(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingEntry(true);
        setEntryError('');
        const res = await fetch(`/api/bestiary/${encodeURIComponent(currentItem.slug)}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        const entry: BestiaryStatEntry = await res.json();
        if (!cancelled) {
          setActiveEntry(entry);
        }
      } catch (err: any) {
        if (!cancelled) {
          setEntryError(err?.message || 'Falha ao abrir página da criatura.');
          setActiveEntry(null);
        }
      } finally {
        if (!cancelled) setLoadingEntry(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentItem?.slug]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentIndex(0);
  };

  const buildCharacterFromEntry = (
    entry: BestiaryStatEntry,
    isSecret: boolean
  ): CharacterSheet => {
    const saveKeys: AbilityKey[] = [];
    if (entry.savingThrows) {
      const map: Record<string, AbilityKey> = {
        STR: 'str',
        FOR: 'str',
        DEX: 'dex',
        DES: 'dex',
        CON: 'con',
        INT: 'int',
        WIS: 'wis',
        SAB: 'wis',
        CHA: 'cha',
        CAR: 'cha'
      };
      Object.keys(entry.savingThrows).forEach((k) => {
        const mapped = map[k.toUpperCase()];
        if (mapped) saveKeys.push(mapped);
      });
    }

    const traitsBlocks: string[] = [];
    if (entry.senses) traitsBlocks.push(`Sentidos: ${entry.senses}`);
    if (entry.languages) traitsBlocks.push(`Idiomas: ${entry.languages}`);
    if (entry.damageResistances) traitsBlocks.push(`Resistências: ${entry.damageResistances}`);
    if (entry.damageImmunities) traitsBlocks.push(`Imunidades: ${entry.damageImmunities}`);
    if (entry.conditionImmunities) traitsBlocks.push(`Imun. Condições: ${entry.conditionImmunities}`);
    entry.specialAbilities?.forEach((sa) => traitsBlocks.push(`• ${sa.name}: ${sa.desc}`));
    entry.actions?.forEach((act) => traitsBlocks.push(`⚔️ ${act.name}: ${act.desc}`));
    entry.legendaryActions?.forEach((la) => traitsBlocks.push(`👑 Lendária — ${la.name}: ${la.desc}`));

    const crNum = Math.max(1, Math.round(parseCrValue(entry.cr)));

    return {
      id: `npc-${entry.slug}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: entry.name,
      isNpc: true,
      isSecretNpc: isSecret,
      ownerName: 'Mestre',
      race: `${TYPE_LABELS_PT[entry.type] || entry.type} (${entry.size})`,
      className: 'Bestiário',
      level: crNum,
      background: entry.source === 'pdf' ? 'Livro do Jogador' : 'PocketDM / SRD',
      alignment: entry.alignment,
      avatar: entry.avatar || '👹',
      imageUrl: entry.tokenUrl || undefined,
      abilities: entry.abilities,
      savingThrowProficiencies: saveKeys,
      skillProficiencies: [],
      hp: entry.hp,
      maxHp: entry.hp,
      tempHp: 0,
      ac: entry.ac,
      speed: entry.speed,
      hitDice: entry.hpFormula || `${crNum}d8`,
      hitDiceRemaining: crNum,
      deathSaves: { successes: 0, failures: 0 },
      conditions: [],
      exhaustion: 0,
      cr: `${entry.cr}${entry.xp ? ` (${entry.xp} XP)` : ''}`,
      attacks:
        entry.parsedAttacks && entry.parsedAttacks.length > 0
          ? entry.parsedAttacks
          : [
              {
                id: `atk-base-${Date.now()}`,
                name: 'Ataque Básico',
                attackBonus: getAbilityMod(entry.abilities.str) + 2,
                damageFormula: `1d6${formatMod(getAbilityMod(entry.abilities.str))}`,
                damageType: 'Físico'
              }
            ],
      spells: [],
      inventory: [],
      traits: traitsBlocks.join('\n'),
      notes: entry.notes || '',
      modelSlug: entry.slug,
      modelNameEn: entry.nameEn,
      modelType: entry.type
    };
  };

  const handleImport = (mode: 'hidden' | 'visible' | 'sheet-only') => {
    if (!activeEntry) return;
    const char = buildCharacterFromEntry(activeEntry, mode === 'hidden');
    onAddMonster(char, mode, mode === 'sheet-only' ? 1 : quantity);
    setAddedFeedback(
      `${quantity > 1 && mode !== 'sheet-only' ? `${quantity}x ` : ''}${activeEntry.name} adicionado!`
    );
    setTimeout(() => setAddedFeedback(''), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border-2 border-amber-600/40 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Lombada / Cabeçalho do Livro */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-amber-950/60 via-slate-950 to-amber-950/60 border-b border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-amber-300 tracking-wide">
                Livro dos Monstros — Bestiário Completo
              </h2>
              <p className="text-[11px] text-slate-400">
                Livro do Jogador (Apêndice D) + Catálogo PocketDM ({catalog.length} criaturas)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Páginas Abertas (Esquerda: Índice / Direita: Página da Criatura) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
          {/* PÁGINA ESQUERDA: Busca & Índice do Livro */}
          <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-amber-500/20 bg-slate-950/70 flex flex-col min-h-0">
            <div className="p-3 border-b border-slate-800 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Procurar criatura (ex: Goblin, Dragão, Aboleth)..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <select
                  value={sourceFilter}
                  onChange={(e) => {
                    setSourceFilter(e.target.value as any);
                    setCurrentIndex(0);
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200"
                >
                  <option value="all">Todas Fontes</option>
                  <option value="pdf">PDF (Apênd. D)</option>
                  <option value="pocketdm">PocketDM</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentIndex(0);
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200"
                >
                  <option value="all">Todos Tipos</option>
                  {Object.entries(TYPE_LABELS_PT).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>

                <select
                  value={crFilter}
                  onChange={(e) => {
                    setCrFilter(e.target.value as any);
                    setCurrentIndex(0);
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200"
                >
                  <option value="all">Qualquer ND</option>
                  <option value="low">ND 0 – 1/2</option>
                  <option value="mid">ND 1 – 4</option>
                  <option value="high">ND 5 – 10</option>
                  <option value="epic">ND 11+</option>
                </select>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
                <span>{filtered.length} criaturas encontradas</span>
                {filtered.length > 0 && (
                  <span>
                    Página {safeIndex + 1} de {filtered.length}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingCatalog ? (
                <div className="flex items-center justify-center py-12 text-slate-400 gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  Abrindo páginas do Bestiário...
                </div>
              ) : catalogError ? (
                <div className="text-xs text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-xl p-3">
                  {catalogError}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-10">
                  Nenhuma criatura encontrada com esse filtro.
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const isActive = idx === safeIndex;
                  return (
                    <button
                      key={item.slug}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-full text-left px-3 py-2 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-500/70 text-amber-100'
                          : 'bg-slate-900/50 border-slate-800/80 text-slate-300 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{item.namePt}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {TYPE_LABELS_PT[item.type] || item.type}
                          {item.nameEn && item.nameEn !== item.namePt ? ` • ${item.nameEn}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(item.source === 'pdf' || item.source === 'both') && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                            PDF
                          </span>
                        )}
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-amber-300">
                          ND {item.cr}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* PÁGINA DIREITA: Ficha da Criatura (Folheável) */}
          <div className="md:col-span-7 flex flex-col min-h-0 bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {loadingEntry ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 text-xs py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  Consultando ficha da criatura...
                </div>
              ) : entryError ? (
                <div className="text-xs text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-xl p-4">
                  {entryError}
                </div>
              ) : activeEntry ? (
                <>
                  {/* Cabeçalho da Página do Monstro */}
                  <div className="flex items-start justify-between gap-4 pb-3 border-b-2 border-amber-500/30">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-16 h-16 rounded-2xl bg-slate-950 border-2 border-amber-500/50 flex items-center justify-center text-3xl overflow-hidden shrink-0 shadow-lg">
                        {activeEntry.tokenUrl ? (
                          <img
                            src={activeEntry.tokenUrl}
                            alt={activeEntry.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{activeEntry.avatar}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xl font-extrabold text-amber-300 truncate">
                          {activeEntry.name}
                        </h3>
                        <p className="text-xs text-slate-300 italic">
                          {TYPE_LABELS_PT[activeEntry.type] || activeEntry.type} {activeEntry.size} •{' '}
                          {activeEntry.alignment}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-bold">
                            ND {activeEntry.cr} {activeEntry.xp ? `(${activeEntry.xp.toLocaleString('pt-BR')} XP)` : ''}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {activeEntry.source === 'pdf'
                              ? 'Livro do Jogador (PDF)'
                              : activeEntry.source === 'both'
                              ? 'PDF + PocketDM'
                              : 'PocketDM SRD'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Miniatura 3D Interativa do Monstro */}
                  <MonsterModelViewer3D
                    input={{
                      slug: activeEntry.slug,
                      name: activeEntry.name,
                      nameEn: activeEntry.nameEn,
                      type: activeEntry.type,
                      tokenType: 'monster'
                    }}
                    heightClass="h-52"
                  />

                  {/* Bloco CA / PV / Deslocamento */}
                  <div className="grid grid-cols-3 gap-2.5 text-xs">
                    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-sky-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Classe Armadura</div>
                        <div className="font-mono font-bold text-base text-slate-100">
                          {activeEntry.ac}
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Pontos de Vida</div>
                        <div className="font-mono font-bold text-base text-slate-100">
                          {activeEntry.hp}{' '}
                          <span className="text-[10px] font-normal text-slate-400">
                            ({activeEntry.hpFormula})
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5">
                      <div className="text-[10px] text-emerald-400 uppercase font-semibold">
                        Deslocamento
                      </div>
                      <div className="text-xs font-semibold text-slate-200 mt-0.5">
                        {activeEntry.speed}
                      </div>
                    </div>
                  </div>

                  {/* 6 Atributos */}
                  <div className="grid grid-cols-6 gap-2 text-center">
                    {ABILITY_KEYS.map((k) => {
                      const val = activeEntry.abilities[k];
                      const mod = getAbilityMod(val);
                      return (
                        <div
                          key={k}
                          className="bg-slate-950/80 border border-slate-800 rounded-xl py-2 px-1"
                        >
                          <div className="text-[10px] font-bold text-rose-400">
                            {ABILITY_LABELS[k].short}
                          </div>
                          <div className="text-sm font-bold font-mono text-amber-200">
                            {val} ({formatMod(mod)})
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Propriedades secundárias */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1 text-slate-300">
                    {activeEntry.savingThrows && Object.keys(activeEntry.savingThrows).length > 0 && (
                      <div>
                        <strong className="text-amber-300">Salvaguardas:</strong>{' '}
                        {Object.entries(activeEntry.savingThrows)
                          .map(([k, v]) => `${k} +${v}`)
                          .join(', ')}
                      </div>
                    )}
                    {activeEntry.skills && Object.keys(activeEntry.skills).length > 0 && (
                      <div>
                        <strong className="text-amber-300">Perícias:</strong>{' '}
                        {Object.entries(activeEntry.skills)
                          .map(([k, v]) => `${k} +${v}`)
                          .join(', ')}
                      </div>
                    )}
                    {activeEntry.damageResistances && (
                      <div>
                        <strong className="text-amber-300">Resistências a Dano:</strong>{' '}
                        {activeEntry.damageResistances}
                      </div>
                    )}
                    {activeEntry.damageImmunities && (
                      <div>
                        <strong className="text-amber-300">Imunidades a Dano:</strong>{' '}
                        {activeEntry.damageImmunities}
                      </div>
                    )}
                    {activeEntry.conditionImmunities && (
                      <div>
                        <strong className="text-amber-300">Imunidade a Condições:</strong>{' '}
                        {activeEntry.conditionImmunities}
                      </div>
                    )}
                    {activeEntry.senses && (
                      <div>
                        <strong className="text-amber-300">Sentidos:</strong> {activeEntry.senses}
                      </div>
                    )}
                    {activeEntry.languages && (
                      <div>
                        <strong className="text-amber-300">Idiomas:</strong> {activeEntry.languages}
                      </div>
                    )}
                  </div>

                  {/* Traços Especiais */}
                  {activeEntry.specialAbilities && activeEntry.specialAbilities.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold uppercase text-amber-400 border-b border-amber-500/20 pb-1 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Traços & Habilidades
                      </h4>
                      {activeEntry.specialAbilities.map((sa, i) => (
                        <p key={i} className="text-xs text-slate-300 leading-relaxed">
                          <strong className="text-slate-100 italic">{sa.name}.</strong> {sa.desc}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Ações */}
                  {activeEntry.actions && activeEntry.actions.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold uppercase text-rose-400 border-b border-rose-500/20 pb-1">
                        Ações
                      </h4>
                      {activeEntry.actions.map((act, i) => (
                        <p key={i} className="text-xs text-slate-300 leading-relaxed">
                          <strong className="text-slate-100 italic">{act.name}.</strong> {act.desc}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Ações Lendárias */}
                  {activeEntry.legendaryActions && activeEntry.legendaryActions.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold uppercase text-purple-400 border-b border-purple-500/20 pb-1">
                        Ações Lendárias
                      </h4>
                      {activeEntry.legendaryActions.map((la, i) => (
                        <p key={i} className="text-xs text-slate-300 leading-relaxed">
                          <strong className="text-slate-100 italic">{la.name}.</strong> {la.desc}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-xs text-slate-500 py-16">
                  Selecione uma criatura na página esquerda para ler sua ficha.
                </div>
              )}
            </div>

            {/* Rodapé do Livro: Folhear Página a Página + Botões de Adicionar */}
            <div className="p-3 bg-slate-950/95 border-t border-slate-800 space-y-2.5">
              {activeEntry && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl p-0.5 text-xs">
                    {[1, 2, 3, 4].map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuantity(q)}
                        className={`px-2 py-1 rounded-lg font-bold cursor-pointer ${
                          quantity === q
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {q}×
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 flex-1 justify-end">
                    <button
                      onClick={() => handleImport('sheet-only')}
                      className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      <FilePlus className="w-3.5 h-3.5" /> Só Ficha
                    </button>
                    <button
                      onClick={() => handleImport('hidden')}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-xs font-bold cursor-pointer"
                    >
                      <EyeOff className="w-3.5 h-3.5" /> + Ficha & Token Oculto
                    </button>
                    <button
                      onClick={() => handleImport('visible')}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> + Ficha & Token Visível
                    </button>
                  </div>
                </div>
              )}

              {addedFeedback && (
                <div className="text-center text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-lg py-1">
                  ✓ {addedFeedback}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                <button
                  disabled={safeIndex <= 0}
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-35 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Página Anterior
                </button>

                <span className="text-slate-400 font-mono">
                  {filtered.length > 0 ? `${safeIndex + 1} / ${filtered.length}` : '0 / 0'}
                </span>

                <button
                  disabled={safeIndex >= filtered.length - 1}
                  onClick={() => setCurrentIndex((i) => Math.min(filtered.length - 1, i + 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-35 cursor-pointer"
                >
                  Próxima Página <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

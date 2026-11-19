import React, { useRef, useState } from 'react';
import {
  Plus,
  Minus,
  Upload,
  Download,
  Heart,
  Shield,
  Sparkles,
  MapPin,
  Trash2,
  Eye,
  EyeOff,
  FileJson,
  Star,
  Flame,
  Moon,
  Sun,
  Skull,
  Wand2,
  Coins,
  ArrowUpCircle,
  Brain,
  Scale,
  Backpack,
  Lock,
  ArrowLeftRight
} from 'lucide-react';
import {
  AbilityKey,
  CharacterSheet as CharacterSheetType,
  Currency,
  InventoryItem,
  Role,
  RollMode,
  SpellItem,
  TradeOffer
} from '../types/rpg';
import {
  ABILITY_LABELS,
  DND_ARMORS,
  DND_CLASSES,
  DND_CONDITIONS,
  DND_ITEMS,
  DND_SKILLS,
  DND_SPELLS,
  DND_WEAPONS,
  EXHAUSTION_LEVELS,
  SUBCLASSES_BY_CLASS,
  XP_TABLE,
  calcArmorClass,
  formatMod,
  getAbilityMod,
  getCoinsWeightKg,
  getEncumbranceInfo,
  getInventoryItems,
  getNextLevelXp,
  getProficiencyBonus,
  getSpellSlotsForClass,
  getTotalCarryWeightKg,
  getTotalGoldEquivalent
} from '../data/dnd5e';
import { rollDie } from '../utils/dice';
import {
  downloadSampleCharacterTemplate,
  exportCharacterAsJson,
  parseImportedCharacterJson
} from '../utils/importer';

interface CharacterSheetPanelProps {
  characters: CharacterSheetType[];
  trades: TradeOffer[];
  role: Role;
  userName: string;
  canCreateCharacter: boolean;
  creationLimitLabel?: string;
  onOpenBuilder: () => void;
  onSaveCharacter: (char: CharacterSheetType) => void;
  onDeleteCharacter: (id: string) => void;
  onSpawnToken: (char: CharacterSheetType) => void;
  onRoll: (formula: string, mode: RollMode, label: string, isSecret?: boolean) => void;
  onCreateTrade: (payload: {
    direction: 'sell_to_dm' | 'buy_from_dm';
    characterId: string;
    item?: Partial<InventoryItem>;
    coins: Partial<Currency>;
    note?: string;
  }) => void;
  onRespondTrade: (tradeId: string, accept: boolean) => void;
}

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const CharacterSheetPanel: React.FC<CharacterSheetPanelProps> = ({
  characters,
  trades,
  role,
  userName,
  canCreateCharacter,
  creationLimitLabel,
  onOpenBuilder,
  onSaveCharacter,
  onDeleteCharacter,
  onSpawnToken,
  onRoll,
  onCreateTrade,
  onRespondTrade
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(characters[0]?.id || null);
  const [subTab, setSubTab] = useState<'combat' | 'skills' | 'spells' | 'gear'>('combat');
  const [sheetRollMode, setSheetRollMode] = useState<RollMode>('normal');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [importError, setImportError] = useState('');
  const [newAttackName, setNewAttackName] = useState('');
  const [newAttackBonus, setNewAttackBonus] = useState('4');
  const [newAttackDamage, setNewAttackDamage] = useState('1d8+2');
  const [selectedSpellToAdd, setSelectedSpellToAdd] = useState(DND_SPELLS[0].id);
  const [selectedWeaponToAdd, setSelectedWeaponToAdd] = useState(DND_WEAPONS[0].name);
  const [selectedItemToAdd, setSelectedItemToAdd] = useState(DND_ITEMS[0].id);
  const [newItemText, setNewItemText] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemWeight, setNewItemWeight] = useState('0.5');
  const [tradeMode, setTradeMode] = useState<'sell_to_dm' | 'buy_from_dm'>('sell_to_dm');
  const [sellItemId, setSellItemId] = useState('');
  const [buyItemId, setBuyItemId] = useState(DND_ITEMS[0].id);
  const [tradeQty, setTradeQty] = useState(1);
  const [tradeGp, setTradeGp] = useState(10);
  const [tradeSp, setTradeSp] = useState(0);
  const [tradeCp, setTradeCp] = useState(0);
  const [tradeSentMsg, setTradeSentMsg] = useState('');
  const [hpDeltaInput, setHpDeltaInput] = useState('5');
  const [hpEditDraft, setHpEditDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleCharacters =
    role === 'dm' ? characters : characters.filter((c) => !c.isNpc);

  const selected =
    visibleCharacters.find((c) => c.id === selectedId) || visibleCharacters[0] || null;

  React.useEffect(() => {
    if (selected) {
      setHpEditDraft(String(selected.hp));
    }
  }, [selected?.id, selected?.hp]);

  const canEdit = (char: CharacterSheetType) => {
    if (role === 'dm') return true;
    return Boolean(char.ownerName) && char.ownerName === userName;
  };

  const updateInventoryList = (char: CharacterSheetType, items: InventoryItem[]) => {
    onSaveCharacter({
      ...char,
      inventoryItems: items,
      inventory: items.map((it) => (it.quantity > 1 ? `${it.name} (x${it.quantity})` : it.name))
    });
  };

  const handleAddCatalogItem = () => {
    if (!selected || !canEdit(selected)) return;
    const catItem = DND_ITEMS.find((i) => i.id === selectedItemToAdd);
    if (!catItem) return;
    const current = getInventoryItems(selected);
    const existingIdx = current.findIndex(
      (i) => i.name.toLowerCase() === catItem.name.toLowerCase()
    );
    let next: InventoryItem[];
    if (existingIdx >= 0) {
      next = current.map((it, idx) =>
        idx === existingIdx ? { ...it, quantity: it.quantity + 1 } : it
      );
    } else {
      next = [
        ...current,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          name: catItem.name,
          quantity: 1,
          weightKg: catItem.weightKg,
          category: catItem.category,
          value: catItem.value,
          description: catItem.description,
          equipped: false
        }
      ];
    }
    updateInventoryList(selected, next);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseImportedCharacterJson(text, {
        isNpcDefault: role === 'dm',
        ownerName: userName
      });
      for (const char of imported) {
        onSaveCharacter(char);
        setSelectedId(char.id);
      }
    } catch {
      setImportError('Arquivo JSON inválido. Verifique o formato da ficha.');
    } finally {
      e.target.value = '';
    }
  };

  const handleAddAttack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !newAttackName.trim()) return;
    const updated: CharacterSheetType = {
      ...selected,
      attacks: [
        ...selected.attacks,
        {
          id: `atk-${Date.now()}`,
          name: newAttackName.trim(),
          attackBonus: parseInt(newAttackBonus, 10) || 0,
          damageFormula: newAttackDamage.trim() || '1d6',
          damageType: 'Físico'
        }
      ]
    };
    onSaveCharacter(updated);
    setNewAttackName('');
  };

  const handleAddCatalogWeapon = () => {
    if (!selected) return;
    const wp = DND_WEAPONS.find((w) => w.name === selectedWeaponToAdd);
    if (!wp) return;
    const prof = getProficiencyBonus(selected.level);
    const mod = getAbilityMod(selected.abilities[wp.ability]);
    const updated: CharacterSheetType = {
      ...selected,
      attacks: [
        ...selected.attacks,
        {
          id: `atk-${Date.now()}`,
          name: wp.name,
          attackBonus: mod + prof,
          damageFormula: `${wp.damageFormula}${mod >= 0 ? `+${mod}` : mod}`,
          damageType: wp.damageType
        }
      ]
    };
    onSaveCharacter(updated);
  };

  const handleShortRest = () => {
    if (!selected || !canEdit(selected)) return;
    const remaining = selected.hitDiceRemaining ?? selected.level;
    const dieMatch = selected.hitDice.match(/d(\d+)/i);
    const dieSize = dieMatch ? parseInt(dieMatch[1], 10) : 8;
    const conMod = getAbilityMod(selected.abilities.con);

    let healed = 0;
    let nextRemaining = remaining;
    if (remaining > 0 && selected.hp < selected.maxHp) {
      const rollVal = rollDie(dieSize);
      healed = Math.max(1, rollVal + conMod);
      nextRemaining = remaining - 1;
      onRoll(
        `1d${dieSize}${formatMod(conMod)}`,
        'normal',
        `Descanso Curto — Dado de Vida (${selected.name})`,
        role === 'dm' && selected.isSecretNpc
      );
    }

    // Bruxo recupera todos os espaços de Pacto em Descanso Curto
    const isWarlock = selected.className.toLowerCase().includes('bruxo');
    const nextSlots = { ...(selected.spellSlots || {}) };
    if (isWarlock) {
      Object.keys(nextSlots).forEach((lvl) => {
        const n = Number(lvl);
        nextSlots[n] = { ...nextSlots[n], used: 0 };
      });
    }

    onSaveCharacter({
      ...selected,
      hp: Math.min(selected.maxHp, selected.hp + healed),
      hitDiceRemaining: nextRemaining,
      spellSlots: isWarlock ? nextSlots : selected.spellSlots
    });
  };

  const handleLongRest = () => {
    if (!selected || !canEdit(selected)) return;
    const currentRemaining = selected.hitDiceRemaining ?? selected.level;
    const recoverDice = Math.max(1, Math.floor(selected.level / 2));
    const nextSlots: Record<number, { max: number; used: number }> = {};
    Object.entries(selected.spellSlots || {}).forEach(([lvl, slot]) => {
      nextSlots[Number(lvl)] = { max: slot.max, used: 0 };
    });

    onSaveCharacter({
      ...selected,
      hp: selected.maxHp,
      hitDiceRemaining: Math.min(selected.level, currentRemaining + recoverDice),
      deathSaves: { successes: 0, failures: 0 },
      exhaustion: Math.max(0, (selected.exhaustion || 0) - 1),
      spellSlots: nextSlots
    });
  };

  const handleRollDeathSave = () => {
    if (!selected || !canEdit(selected)) return;
    const roll = rollDie(20);
    const ds = selected.deathSaves || { successes: 0, failures: 0 };
    onRoll(
      `1d20`,
      'normal',
      `Salvaguarda contra a Morte (${selected.name}) [Tirou ${roll}]`,
      role === 'dm' && selected.isSecretNpc
    );

    if (roll === 20) {
      onSaveCharacter({
        ...selected,
        hp: 1,
        deathSaves: { successes: 0, failures: 0 }
      });
    } else if (roll === 1) {
      onSaveCharacter({
        ...selected,
        deathSaves: { successes: ds.successes, failures: Math.min(3, ds.failures + 2) }
      });
    } else if (roll >= 10) {
      onSaveCharacter({
        ...selected,
        deathSaves: { successes: Math.min(3, ds.successes + 1), failures: ds.failures }
      });
    } else {
      onSaveCharacter({
        ...selected,
        deathSaves: { successes: ds.successes, failures: Math.min(3, ds.failures + 1) }
      });
    }
  };

  const toggleCondition = (condId: string) => {
    if (!selected || !canEdit(selected)) return;
    const current = selected.conditions || [];
    const next = current.includes(condId)
      ? current.filter((c) => c !== condId)
      : [...current, condId];
    onSaveCharacter({ ...selected, conditions: next });
  };

  const toggleSkillStatus = (skillId: string) => {
    if (!selected || !canEdit(selected)) return;
    const hasProf = selected.skillProficiencies.includes(skillId);
    const hasExp = (selected.expertiseSkills || []).includes(skillId);

    // Ciclo: Sem Prof -> Proficiente -> Especialização (2x) -> Sem Prof
    if (!hasProf) {
      onSaveCharacter({
        ...selected,
        skillProficiencies: [...selected.skillProficiencies, skillId]
      });
    } else if (!hasExp) {
      onSaveCharacter({
        ...selected,
        expertiseSkills: [...(selected.expertiseSkills || []), skillId]
      });
    } else {
      onSaveCharacter({
        ...selected,
        skillProficiencies: selected.skillProficiencies.filter((s) => s !== skillId),
        expertiseSkills: (selected.expertiseSkills || []).filter((s) => s !== skillId)
      });
    }
  };

  const toggleSpellSlot = (circle: number, slotIndex: number) => {
    if (!selected || !canEdit(selected)) return;
    const currentSlots = { ...(selected.spellSlots || {}) };
    const slot = currentSlots[circle];
    if (!slot) return;
    const nextUsed = slotIndex < slot.used ? slotIndex : slotIndex + 1;
    currentSlots[circle] = { ...slot, used: Math.min(slot.max, Math.max(0, nextUsed)) };
    onSaveCharacter({ ...selected, spellSlots: currentSlots });
  };

  const handleAddSpellFromCatalog = () => {
    if (!selected) return;
    const sp = DND_SPELLS.find((s) => s.id === selectedSpellToAdd);
    if (!sp) return;
    const existingList = selected.spellList || [];
    if (existingList.some((s) => s.id === sp.id)) return;
    onSaveCharacter({
      ...selected,
      spellList: [...existingList, sp],
      spells: selected.spells.includes(sp.name) ? selected.spells : [...selected.spells, sp.name]
    });
  };

  const handleCastSpell = (sp: SpellItem) => {
    if (!selected) return;
    const secret = role === 'dm' && selected.isSecretNpc;
    const castKey = selected.spellcastingAbility;
    const castMod = castKey ? getAbilityMod(selected.abilities[castKey]) : 0;
    const prof = getProficiencyBonus(selected.level);

    if (sp.isAttack) {
      const atkBonus = castMod + prof;
      onRoll(
        `1d20${formatMod(atkBonus)}`,
        sheetRollMode,
        `Magia (Ataque): ${sp.name} (${selected.name})`,
        secret
      );
    }
    if (sp.damageFormula) {
      const bonus =
        sp.damageType === 'Cura' && castMod !== 0 ? formatMod(castMod) : '';
      onRoll(
        `${sp.damageFormula}${bonus}`,
        'normal',
        `Magia (${sp.damageType || 'Efeito'}): ${sp.name}`,
        secret
      );
    }
    // Se tiver círculo > 0 e espaços disponíveis, gasta 1 espaço e marca concentração
    const nextSlots = { ...(selected.spellSlots || {}) };
    let changed = false;
    if (sp.level > 0 && canEdit(selected)) {
      const slot = nextSlots[sp.level];
      if (slot && slot.used < slot.max) {
        nextSlots[sp.level] = { ...slot, used: slot.used + 1 };
        changed = true;
      }
    }
    if (sp.concentration && canEdit(selected)) {
      changed = true;
    }
    if (changed) {
      onSaveCharacter({
        ...selected,
        spellSlots: nextSlots,
        concentratingOn: sp.concentration ? sp.name : selected.concentratingOn
      });
    }
  };

  const handleLevelUp = (hpMode: 'avg' | 'roll') => {
    if (!selected || !canEdit(selected) || selected.level >= 20) return;
    const nextLevel = selected.level + 1;
    const cls = DND_CLASSES.find(
      (c) => c.name.toLowerCase() === selected.className.toLowerCase()
    );
    const dieSize = cls?.hitDie || 8;
    const conMod = getAbilityMod(selected.abilities.con);
    const rolled = hpMode === 'roll' ? rollDie(dieSize) : Math.floor(dieSize / 2) + 1;
    const hpGain = Math.max(1, rolled + conMod);

    if (hpMode === 'roll') {
      onRoll(
        `1d${dieSize}${formatMod(conMod)}`,
        'normal',
        `Level Up Nv.${nextLevel} PV (${selected.name})`,
        role === 'dm' && selected.isSecretNpc
      );
    }

    const nextSlots = getSpellSlotsForClass(selected.className, nextLevel);
    const minXp = XP_TABLE[nextLevel - 1] ?? 0;

    onSaveCharacter({
      ...selected,
      level: nextLevel,
      xp: Math.max(selected.xp || 0, minXp),
      hp: selected.hp + hpGain,
      maxHp: selected.maxHp + hpGain,
      hitDice: `${nextLevel}d${dieSize}`,
      hitDiceRemaining: (selected.hitDiceRemaining ?? selected.level) + 1,
      spellSlots: Object.keys(nextSlots).length > 0 ? nextSlots : selected.spellSlots
    });
    setShowLevelUp(false);
  };

  // Valores derivados da ficha selecionada
  const profBonus = selected ? getProficiencyBonus(selected.level) : 2;
  const passivePerception = selected
    ? 10 +
      getAbilityMod(selected.abilities.wis) +
      (selected.skillProficiencies.includes('perception') ? profBonus : 0) +
      ((selected.expertiseSkills || []).includes('perception') ? profBonus : 0)
    : 10;

  const spellAbility = selected?.spellcastingAbility || null;
  const spellSaveDc =
    selected && spellAbility
      ? 8 + profBonus + getAbilityMod(selected.abilities[spellAbility])
      : null;
  const spellAttackBonus =
    selected && spellAbility
      ? profBonus + getAbilityMod(selected.abilities[spellAbility])
      : null;

  return (
    <div className="flex flex-col h-full bg-slate-900/50">
      {/* Barra superior: Criar / Importar / Lista */}
      <div className="p-2.5 border-b border-slate-800 bg-slate-950/70 space-y-2">
        <div className="flex items-center gap-1.5">
          <button
            disabled={!canCreateCharacter}
            onClick={onOpenBuilder}
            title={
              canCreateCharacter
                ? 'Criar novo personagem D&D 5e'
                : 'Limite de fichas atingido. Peça ao Mestre para liberar mais um personagem.'
            }
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs transition cursor-pointer disabled:cursor-not-allowed"
          >
            {canCreateCharacter ? <Plus className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
            Criar Personagem
          </button>
          <button
            disabled={!canCreateCharacter}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed"
            title={
              canCreateCharacter
                ? 'Importar Ficha ou NPC (.json)'
                : 'Limite de fichas atingido'
            }
          >
            <Upload className="w-3.5 h-3.5" />
            Importar
          </button>
          <button
            type="button"
            onClick={downloadSampleCharacterTemplate}
            className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            title="Baixar arquivo JSON modelo de ficha pronta para preencher e importar"
          >
            <Download className="w-3.5 h-3.5" />
            Modelo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileImport}
            className="hidden"
          />
        </div>

        {creationLimitLabel && (
          <div
            className={`text-[10px] px-2.5 py-1 rounded-lg border flex items-center justify-between ${
              canCreateCharacter
                ? 'bg-slate-900/80 border-slate-800 text-slate-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}
          >
            <span>{creationLimitLabel}</span>
            {!canCreateCharacter && <span className="font-semibold">Aguardando Mestre</span>}
          </div>
        )}

        {importError && (
          <div className="text-[11px] text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-lg px-2.5 py-1">
            {importError}
          </div>
        )}

        {visibleCharacters.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {visibleCharacters.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                  selected?.id === c.id
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{c.avatar}</span>
                <span className="max-w-[110px] truncate">{c.name}</span>
                {c.isNpc && (
                  <span className="text-[9px] px-1 rounded bg-purple-500/25 text-purple-300">
                    NPC
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Corpo da Ficha */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
          <FileJson className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-sm font-semibold text-slate-300 mb-1">Nenhuma ficha na mesa ainda</p>
          <p className="text-xs text-slate-500 max-w-xs">
            Clique em <strong>Criar Personagem</strong> para montar um herói D&D 5e completo ou{' '}
            <strong>Importar JSON</strong> para carregar fichas prontas.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {/* Cabeçalho do Personagem */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                  {selected.imageUrl ? (
                    <img
                      src={selected.imageUrl}
                      alt={selected.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    selected.avatar
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-slate-100 text-sm truncate">{selected.name}</h3>
                    <button
                      disabled={!canEdit(selected)}
                      onClick={() =>
                        onSaveCharacter({ ...selected, inspiration: !selected.inspiration })
                      }
                      title="Inspiração D&D 5e"
                      className={`p-0.5 rounded transition cursor-pointer ${
                        selected.inspiration
                          ? 'text-amber-400 scale-110'
                          : 'text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${selected.inspiration ? 'fill-amber-400' : ''}`} />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {selected.subrace || selected.race} • {selected.className}
                    {selected.subclass ? ` (${selected.subclass})` : ''} Nv.{selected.level}
                    {selected.cr ? ` • ND ${selected.cr}` : ''}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                    <span>Prof: <strong className="text-amber-300">+{profBonus}</strong></span>
                    <span>•</span>
                    <span>Perc. Passiva: <strong className="text-emerald-300">{passivePerception}</strong></span>
                    {!selected.isNpc && (
                      <>
                        <span>•</span>
                        <span>XP: {(selected.xp ?? 0).toLocaleString('pt-BR')}/{getNextLevelXp(selected.level).toLocaleString('pt-BR')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {canEdit(selected) && (
                  <button
                    onClick={() => onSpawnToken(selected)}
                    className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
                    title="Colocar Token no Tabuleiro"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => exportCharacterAsJson(selected)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                  title="Exportar Ficha (.json)"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                {role === 'dm' && selected.isNpc && (
                  <button
                    onClick={() =>
                      onSaveCharacter({ ...selected, isSecretNpc: !selected.isSecretNpc })
                    }
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      selected.isSecretNpc
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                    title={
                      selected.isSecretNpc
                        ? 'NPC Secreto (só Mestre vê)'
                        : 'NPC Visível aos Jogadores'
                    }
                  >
                    {selected.isSecretNpc ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
                {canEdit(selected) && (
                  <button
                    onClick={() => onDeleteCharacter(selected.id)}
                    className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                    title="Excluir Ficha"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* PV / PV Temp / CA / Iniciativa / Deslocamento */}
            <div className="grid grid-cols-5 gap-1.5 text-center">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-1.5">
                <div className="text-[10px] text-rose-400 font-semibold flex items-center justify-center gap-0.5">
                  <Heart className="w-3 h-3" /> PV
                </div>
                <div className="flex items-center justify-center gap-0.5 mt-0.5">
                  <input
                    type="number"
                    min={0}
                    disabled={!canEdit(selected)}
                    value={canEdit(selected) ? hpEditDraft : selected.hp}
                    onChange={(e) => setHpEditDraft(e.target.value)}
                    onBlur={() => {
                      const parsed = parseInt(hpEditDraft, 10);
                      if (!Number.isNaN(parsed)) {
                        const nextHp = Math.max(0, parsed);
                        setHpEditDraft(String(nextHp));
                        if (nextHp !== selected.hp) {
                          onSaveCharacter({ ...selected, hp: nextHp });
                        }
                      } else {
                        setHpEditDraft(String(selected.hp));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className={`w-11 text-center bg-slate-950 border border-slate-700 rounded text-sm font-mono font-extrabold ${
                      selected.hp > selected.maxHp ? 'text-cyan-300' : 'text-slate-100'
                    }`}
                    title="Alterar vida atual diretamente (pode ultrapassar o máximo)"
                  />
                  <span className="text-[11px] font-mono text-slate-400">/{selected.maxHp}</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-1.5">
                <div className="text-[10px] text-cyan-400 font-semibold">Temp</div>
                <input
                  type="number"
                  disabled={!canEdit(selected)}
                  value={selected.tempHp || 0}
                  onChange={(e) =>
                    onSaveCharacter({
                      ...selected,
                      tempHp: Math.max(0, parseInt(e.target.value, 10) || 0)
                    })
                  }
                  className="w-10 text-center bg-slate-950 border border-slate-700 rounded text-xs font-mono font-bold text-cyan-200 mt-0.5"
                />
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-1.5">
                <div className="text-[10px] text-sky-400 font-semibold flex items-center justify-center gap-0.5">
                  <Shield className="w-3 h-3" /> CA
                </div>
                <input
                  type="number"
                  disabled={!canEdit(selected)}
                  value={selected.ac}
                  onChange={(e) =>
                    onSaveCharacter({
                      ...selected,
                      ac: parseInt(e.target.value, 10) || 10
                    })
                  }
                  className="w-11 text-center bg-slate-950 border border-slate-700 rounded text-sm font-mono font-extrabold text-slate-100 mt-0.5"
                />
              </div>

              <button
                onClick={() => {
                  const dexMod = getAbilityMod(selected.abilities.dex);
                  onRoll(
                    `1d20${formatMod(dexMod)}`,
                    'normal',
                    `Iniciativa (${selected.name})`,
                    role === 'dm' && selected.isSecretNpc
                  );
                }}
                className="bg-slate-900 hover:bg-amber-500/15 border border-slate-800 hover:border-amber-500/50 rounded-lg p-1.5 transition cursor-pointer"
                title="Clique para rolar Iniciativa"
              >
                <div className="text-[10px] text-amber-400 font-semibold">Inic.</div>
                <div className="text-sm font-mono font-bold text-slate-100">
                  {formatMod(getAbilityMod(selected.abilities.dex))}
                </div>
              </button>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-1.5">
                <div className="text-[10px] text-emerald-400 font-semibold">Desloc.</div>
                <div className="text-[11px] font-mono font-bold text-slate-200 mt-1 truncate">
                  {selected.speed}
                </div>
              </div>
            </div>

            {/* Ajuste Rápido de PV (1 em 1 e Dano / Cura, inclusive acima do máximo) */}
            {canEdit(selected) && (
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/70 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px]">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      onSaveCharacter({
                        ...selected,
                        hp: Math.max(0, selected.hp - 1)
                      })
                    }
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 transition cursor-pointer active:scale-95"
                    title="Diminuir 1 PV"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onSaveCharacter({
                        ...selected,
                        hp: selected.hp + 1
                      })
                    }
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 transition cursor-pointer active:scale-95"
                    title="Aumentar 1 PV"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1 ml-auto flex-1 justify-end">
                  <input
                    type="number"
                    min={1}
                    value={hpDeltaInput}
                    onChange={(e) => setHpDeltaInput(e.target.value)}
                    className="w-12 text-center bg-slate-950 border border-slate-700 rounded-lg px-1 py-1 font-mono font-bold text-slate-100"
                    title="Quantidade de dano ou cura"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const amt = Math.max(1, Math.abs(parseInt(hpDeltaInput, 10) || 0));
                      if (amt > 0) {
                        onSaveCharacter({ ...selected, hp: Math.max(0, selected.hp - amt) });
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-200 font-semibold cursor-pointer"
                  >
                    - Dano
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const amt = Math.max(1, Math.abs(parseInt(hpDeltaInput, 10) || 0));
                      if (amt > 0) {
                        onSaveCharacter({ ...selected, hp: selected.hp + amt });
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-200 font-semibold cursor-pointer"
                  >
                    + Cura
                  </button>
                </div>
              </div>
            )}

            {/* Barra de Descanso, Dados de Vida & Level Up */}
            {canEdit(selected) && (
              <div className="space-y-2 pt-1 border-t border-slate-800/80 text-[11px]">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-slate-400">
                    DV: <strong className="text-slate-200">{selected.hitDiceRemaining ?? selected.level}/{selected.level}</strong>{' '}
                    <span className="text-slate-500">({selected.hitDice})</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      onClick={handleShortRest}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 font-semibold cursor-pointer"
                      title="Gasta 1 Dado de Vida para curar (e recupera magia de Bruxo)"
                    >
                      <Sun className="w-3 h-3" /> Desc. Curto
                    </button>
                    <button
                      onClick={handleLongRest}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-200 font-semibold cursor-pointer"
                      title="Restaura PV máx, espaços de magia, metade dos DVs e reduz Exaustão"
                    >
                      <Moon className="w-3 h-3" /> Desc. Longo
                    </button>
                    {!selected.isNpc && selected.level < 20 && (
                      <button
                        onClick={() => setShowLevelUp((s) => !s)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-200 font-semibold cursor-pointer"
                        title="Avançar para o próximo nível"
                      >
                        <ArrowUpCircle className="w-3 h-3" /> Nv.{selected.level + 1}
                      </button>
                    )}
                  </div>
                </div>

                {showLevelUp && !selected.isNpc && selected.level < 20 && (
                  <div className="bg-emerald-950/35 border border-emerald-500/35 rounded-xl p-2.5 space-y-2">
                    <div className="font-bold text-emerald-200 flex items-center justify-between">
                      <span>Subir para Nível {selected.level + 1}</span>
                      <button
                        onClick={() => setShowLevelUp(false)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                    {[4, 8, 12, 16, 19].includes(selected.level + 1) && (
                      <div className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1">
                        ★ Nível de Aumento no Valor de Habilidade (+2 pontos em atributos ou 1 Talento)!
                      </div>
                    )}
                    {(SUBCLASSES_BY_CLASS[selected.className] || []).length > 0 && (
                      <select
                        value={selected.subclass || ''}
                        onChange={(e) =>
                          onSaveCharacter({ ...selected, subclass: e.target.value || undefined })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-100"
                      >
                        <option value="">Selecionar Subclasse / Arquétipo...</option>
                        {(SUBCLASSES_BY_CLASS[selected.className] || []).map((sc) => (
                          <option key={sc.name} value={sc.name}>
                            {sc.name} — {sc.summary}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleLevelUp('avg')}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer"
                      >
                        +PV Fixo (Média)
                      </button>
                      <button
                        onClick={() => handleLevelUp('roll')}
                        className="flex-1 py-1.5 rounded-lg bg-sky-500/25 hover:bg-sky-500/35 border border-sky-400/40 text-sky-200 font-bold cursor-pointer"
                      >
                        +Rolar Dado de Vida
                      </button>
                    </div>
                  </div>
                )}

                {selected.concentratingOn && (
                  <div className="flex items-center justify-between gap-2 bg-sky-950/50 border border-sky-500/40 rounded-lg px-2 py-1">
                    <span className="text-sky-200 flex items-center gap-1 truncate">
                      <Brain className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      Conc.: <strong>{selected.concentratingOn}</strong>
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() =>
                          onRoll(
                            `1d20${formatMod(getAbilityMod(selected.abilities.con))}`,
                            sheetRollMode,
                            `Teste de Concentração CD 10 (${selected.concentratingOn})`,
                            role === 'dm' && selected.isSecretNpc
                          )
                        }
                        className="px-1.5 py-0.5 rounded bg-sky-500/25 text-sky-200 hover:bg-sky-500/40 font-semibold cursor-pointer"
                      >
                        CON CD 10
                      </button>
                      <button
                        onClick={() => onSaveCharacter({ ...selected, concentratingOn: undefined })}
                        className="text-slate-400 hover:text-rose-300 px-1 cursor-pointer"
                        title="Encerrar concentração"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Salvaguardas contra a Morte (Aparece automaticamente com 0 PV) */}
            {selected.hp <= 0 && (
              <div className="bg-rose-950/40 border border-rose-500/40 rounded-lg p-2 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-300 flex items-center gap-1">
                    <Skull className="w-3.5 h-3.5" /> Testes contra a Morte (0 PV)
                  </span>
                  <button
                    onClick={handleRollDeathSave}
                    className="px-2 py-0.5 rounded bg-rose-500 hover:bg-rose-400 text-white font-bold text-[11px] cursor-pointer"
                  >
                    Rolar 1d20
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1 text-emerald-300">
                    <span>Sucessos:</span>
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        onClick={() =>
                          canEdit(selected) &&
                          onSaveCharacter({
                            ...selected,
                            deathSaves: {
                              successes: (selected.deathSaves?.successes || 0) >= n ? n - 1 : n,
                              failures: selected.deathSaves?.failures || 0
                            }
                          })
                        }
                        className={`w-3.5 h-3.5 rounded-full border cursor-pointer ${
                          (selected.deathSaves?.successes || 0) >= n
                            ? 'bg-emerald-500 border-emerald-300'
                            : 'border-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-rose-300">
                    <span>Falhas:</span>
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        onClick={() =>
                          canEdit(selected) &&
                          onSaveCharacter({
                            ...selected,
                            deathSaves: {
                              successes: selected.deathSaves?.successes || 0,
                              failures: (selected.deathSaves?.failures || 0) >= n ? n - 1 : n
                            }
                          })
                        }
                        className={`w-3.5 h-3.5 rounded-full border cursor-pointer ${
                          (selected.deathSaves?.failures || 0) >= n
                            ? 'bg-rose-500 border-rose-300'
                            : 'border-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Badges de Condições ativas / Exaustão */}
            {((selected.conditions && selected.conditions.length > 0) ||
              (selected.exhaustion || 0) > 0) && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {(selected.exhaustion || 0) > 0 && (
                  <span
                    title={EXHAUSTION_LEVELS[selected.exhaustion || 0]}
                    className="px-1.5 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-orange-200 text-[10px] font-semibold"
                  >
                    😫 Exaustão Nv.{selected.exhaustion}
                  </span>
                )}
                {(selected.conditions || []).map((cid) => {
                  const def = DND_CONDITIONS.find((c) => c.id === cid);
                  return (
                    <button
                      key={cid}
                      onClick={() => toggleCondition(cid)}
                      title={def?.summary || cid}
                      className="px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-200 text-[10px] font-semibold cursor-pointer hover:bg-rose-500/25"
                    >
                      {def?.icon} {cid} ×
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modo de Rolagem da Ficha (Normal / Vantagem / Desvantagem) */}
          <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-xl px-2.5 py-1 text-[11px]">
            <span className="text-slate-400 font-medium">Modo de Rolagem da Ficha:</span>
            <div className="flex gap-1">
              {(['normal', 'advantage', 'disadvantage'] as RollMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setSheetRollMode(m)}
                  className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                    sheetRollMode === m
                      ? m === 'advantage'
                        ? 'bg-emerald-500/25 text-emerald-300'
                        : m === 'disadvantage'
                        ? 'bg-rose-500/25 text-rose-300'
                        : 'bg-slate-800 text-amber-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {m === 'normal' ? 'Normal' : m === 'advantage' ? 'Vantagem' : 'Desvantagem'}
                </button>
              ))}
            </div>
          </div>

          {/* Atributos Clicáveis */}
          <div className="grid grid-cols-6 gap-1.5">
            {ABILITY_KEYS.map((k) => {
              const score = selected.abilities[k];
              const mod = getAbilityMod(score);
              return (
                <button
                  key={k}
                  onClick={() =>
                    onRoll(
                      `1d20${formatMod(mod)}`,
                      sheetRollMode,
                      `Teste de ${ABILITY_LABELS[k].name} (${selected.name})`,
                      role === 'dm' && selected.isSecretNpc
                    )
                  }
                  className="bg-slate-950/90 hover:bg-amber-500/15 border border-slate-800 hover:border-amber-500/60 rounded-xl py-2 px-1 text-center transition cursor-pointer group"
                  title={`Clique para rolar ${ABILITY_LABELS[k].name}`}
                >
                  <div className="text-[10px] font-bold text-slate-400 group-hover:text-amber-300">
                    {ABILITY_LABELS[k].short}
                  </div>
                  <div className="text-sm font-extrabold font-mono text-amber-300">
                    {formatMod(mod)}
                  </div>
                  <div className="text-[10px] text-slate-500">{score}</div>
                </button>
              );
            })}
          </div>

          {/* Sub-abas da ficha */}
          <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
            <button
              onClick={() => setSubTab('combat')}
              className={`py-1.5 rounded-lg font-medium cursor-pointer ${
                subTab === 'combat' ? 'bg-slate-800 text-amber-300' : 'text-slate-400'
              }`}
            >
              Combate
            </button>
            <button
              onClick={() => setSubTab('skills')}
              className={`py-1.5 rounded-lg font-medium cursor-pointer ${
                subTab === 'skills' ? 'bg-slate-800 text-amber-300' : 'text-slate-400'
              }`}
            >
              Perícias
            </button>
            <button
              onClick={() => setSubTab('spells')}
              className={`py-1.5 rounded-lg font-medium cursor-pointer ${
                subTab === 'spells' ? 'bg-slate-800 text-amber-300' : 'text-slate-400'
              }`}
            >
              Magias
            </button>
            <button
              onClick={() => setSubTab('gear')}
              className={`py-1.5 rounded-lg font-medium cursor-pointer flex items-center justify-center gap-1 ${
                subTab === 'gear' ? 'bg-slate-800 text-amber-300' : 'text-slate-400'
              }`}
            >
              <Backpack className="w-3 h-3" /> Mochila
            </button>
          </div>

          {subTab === 'combat' && (
            <div className="space-y-2.5">
              {/* Ataques */}
              {selected.attacks.map((atk) => {
                const modStr = atk.attackBonus >= 0 ? `+${atk.attackBonus}` : `${atk.attackBonus}`;
                return (
                  <div
                    key={atk.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-100 truncate">{atk.name}</div>
                      <div className="text-[10px] text-slate-400">{atk.damageType}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() =>
                          onRoll(
                            `1d20${modStr}`,
                            sheetRollMode,
                            `Ataque: ${atk.name} (${selected.name})`,
                            role === 'dm' && selected.isSecretNpc
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/35 border border-sky-500/40 text-sky-200 font-mono text-xs font-bold cursor-pointer"
                        title="Rolar Acerto"
                      >
                        {modStr}
                      </button>
                      <button
                        onClick={() =>
                          onRoll(
                            atk.damageFormula,
                            'normal',
                            `Dano: ${atk.name} (${atk.damageType})`,
                            role === 'dm' && selected.isSecretNpc
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-200 font-mono text-xs font-bold cursor-pointer"
                        title="Rolar Dano"
                      >
                        {atk.damageFormula}
                      </button>
                      {canEdit(selected) && (
                        <button
                          onClick={() =>
                            onSaveCharacter({
                              ...selected,
                              attacks: selected.attacks.filter((a) => a.id !== atk.id)
                            })
                          }
                          className="p-1 text-slate-600 hover:text-rose-400 cursor-pointer"
                          title="Remover ataque"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Adicionar arma rápida do PHB Cap. 5 */}
              {canEdit(selected) && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2 space-y-1.5">
                  <div className="flex gap-1.5">
                    <select
                      value={selectedWeaponToAdd}
                      onChange={(e) => setSelectedWeaponToAdd(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100"
                    >
                      {DND_WEAPONS.map((w) => (
                        <option key={w.name} value={w.name}>
                          {w.name} ({w.damageFormula} {w.damageType})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddCatalogWeapon}
                      className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 text-xs font-semibold hover:bg-sky-500/30 cursor-pointer"
                    >
                      + Arma PHB
                    </button>
                  </div>

                  <form onSubmit={handleAddAttack} className="flex flex-wrap gap-1.5">
                    <input
                      type="text"
                      placeholder="Ataque personalizado..."
                      value={newAttackName}
                      onChange={(e) => setNewAttackName(e.target.value)}
                      className="flex-1 min-w-[100px] bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="+4"
                      value={newAttackBonus}
                      onChange={(e) => setNewAttackBonus(e.target.value)}
                      className="w-11 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-center text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="1d8+2"
                      value={newAttackDamage}
                      onChange={(e) => setNewAttackDamage(e.target.value)}
                      className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-center text-slate-100"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 cursor-pointer"
                    >
                      + Add
                    </button>
                  </form>
                </div>
              )}

              {/* Condições & Exaustão (Apêndice A) */}
              {canEdit(selected) && (
                <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-purple-300 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" /> Condições (Apêndice A)
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">Exaustão:</span>
                      <select
                        value={selected.exhaustion || 0}
                        onChange={(e) =>
                          onSaveCharacter({
                            ...selected,
                            exhaustion: parseInt(e.target.value, 10)
                          })
                        }
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-orange-200"
                      >
                        {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            Nv. {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {(selected.exhaustion || 0) > 0 && (
                    <div className="text-[10px] text-orange-300 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/30">
                      {EXHAUSTION_LEVELS[selected.exhaustion || 0]}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {DND_CONDITIONS.map((cond) => {
                      const active = (selected.conditions || []).includes(cond.id);
                      return (
                        <button
                          key={cond.id}
                          onClick={() => toggleCondition(cond.id)}
                          title={cond.summary}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] border transition cursor-pointer ${
                            active
                              ? 'bg-purple-500/30 border-purple-400 text-purple-100 font-semibold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {cond.icon} {cond.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selected.traits && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-300 whitespace-pre-wrap">
                  <div className="font-semibold text-amber-300 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Traços & Habilidades
                  </div>
                  {selected.traits}
                </div>
              )}
            </div>
          )}

          {subTab === 'skills' && (
            <div className="space-y-2">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">
                  Testes de Resistência (Saving Throws)
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {ABILITY_KEYS.map((k) => {
                    const prof = selected.savingThrowProficiencies.includes(k);
                    const total =
                      getAbilityMod(selected.abilities[k]) + (prof ? profBonus : 0);
                    return (
                      <div key={k} className="flex items-center gap-1">
                        {canEdit(selected) && (
                          <button
                            onClick={() => {
                              const next = prof
                                ? selected.savingThrowProficiencies.filter((s) => s !== k)
                                : [...selected.savingThrowProficiencies, k];
                              onSaveCharacter({ ...selected, savingThrowProficiencies: next });
                            }}
                            title="Alternar proficiência"
                            className={`text-[10px] cursor-pointer ${
                              prof ? 'text-emerald-400' : 'text-slate-600'
                            }`}
                          >
                            {prof ? '●' : '○'}
                          </button>
                        )}
                        <button
                          onClick={() =>
                            onRoll(
                              `1d20${formatMod(total)}`,
                              sheetRollMode,
                              `Salvaguarda de ${ABILITY_LABELS[k].name} (${selected.name})`,
                              role === 'dm' && selected.isSecretNpc
                            )
                          }
                          className={`flex-1 px-2 py-1.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition ${
                            prof
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <span className="font-semibold">{ABILITY_LABELS[k].short}</span>
                          <span className="font-mono font-bold">{formatMod(total)}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase mb-1">
                  <span>Perícias (Clique p/ rolar)</span>
                  <span className="text-[9px] font-normal normal-case text-slate-500">
                    ● Prof • ★ Especializ. (2x)
                  </span>
                </div>
                {DND_SKILLS.map((sk) => {
                  const prof = selected.skillProficiencies.includes(sk.id);
                  const exp = (selected.expertiseSkills || []).includes(sk.id);
                  const total =
                    getAbilityMod(selected.abilities[sk.ability]) +
                    (prof ? profBonus : 0) +
                    (exp ? profBonus : 0);
                  return (
                    <div
                      key={sk.id}
                      className="flex items-center gap-1.5 hover:bg-slate-800/60 rounded-lg px-1.5 py-0.5"
                    >
                      {canEdit(selected) && (
                        <button
                          onClick={() => toggleSkillStatus(sk.id)}
                          title="Alternar: Normal → Proficiente (●) → Especialização 2x (★)"
                          className={`w-4 text-center text-xs cursor-pointer ${
                            exp
                              ? 'text-amber-400 font-bold'
                              : prof
                              ? 'text-emerald-400'
                              : 'text-slate-600 hover:text-slate-400'
                          }`}
                        >
                          {exp ? '★' : prof ? '●' : '○'}
                        </button>
                      )}
                      <button
                        onClick={() =>
                          onRoll(
                            `1d20${formatMod(total)}`,
                            sheetRollMode,
                            `${sk.name} (${selected.name})`,
                            role === 'dm' && selected.isSecretNpc
                          )
                        }
                        className="flex-1 flex items-center justify-between py-0.5 text-xs transition cursor-pointer"
                      >
                        <span
                          className={
                            exp
                              ? 'text-amber-300 font-bold'
                              : prof
                              ? 'text-emerald-300 font-semibold'
                              : 'text-slate-300'
                          }
                        >
                          {sk.name}{' '}
                          <span className="text-[10px] text-slate-500">
                            ({ABILITY_LABELS[sk.ability].short})
                          </span>
                        </span>
                        <span className="font-mono font-bold text-amber-300">
                          {formatMod(total)}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {subTab === 'spells' && (
            <div className="space-y-2.5 text-xs">
              {/* Conjuração e Espaços de Magia */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-300 flex items-center gap-1">
                    <Wand2 className="w-3.5 h-3.5" /> Conjuração & Magias
                  </span>
                  {canEdit(selected) && (
                    <select
                      value={selected.spellcastingAbility || ''}
                      onChange={(e) =>
                        onSaveCharacter({
                          ...selected,
                          spellcastingAbility: (e.target.value || null) as AbilityKey | null
                        })
                      }
                      className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-200"
                    >
                      <option value="">Sem Conjuração</option>
                      <option value="int">INT (Mago)</option>
                      <option value="wis">SAB (Clérigo/Druida/Patrulh.)</option>
                      <option value="cha">CAR (Bardo/Bruxo/Feit./Palad.)</option>
                    </select>
                  )}
                </div>

                {spellAbility && (
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-1.5">
                      <div className="text-[10px] text-slate-400">CD de Resistência</div>
                      <div className="text-sm font-mono font-bold text-sky-300">{spellSaveDc}</div>
                    </div>
                    <button
                      onClick={() =>
                        onRoll(
                          `1d20${formatMod(spellAttackBonus || 0)}`,
                          sheetRollMode,
                          `Ataque Mágico (${selected.name})`,
                          role === 'dm' && selected.isSecretNpc
                        )
                      }
                      className="bg-slate-900 hover:bg-sky-500/15 border border-slate-800 hover:border-sky-500/40 rounded-lg p-1.5 cursor-pointer"
                    >
                      <div className="text-[10px] text-slate-400">Ataque com Magia</div>
                      <div className="text-sm font-mono font-bold text-amber-300">
                        {formatMod(spellAttackBonus || 0)}
                      </div>
                    </button>
                  </div>
                )}

                {/* Espaços de Magia */}
                {Object.keys(selected.spellSlots || {}).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(selected.spellSlots || {}).map(([lvlStr, slot]) => {
                      const lvl = Number(lvlStr);
                      if (!slot || slot.max <= 0) return null;
                      return (
                        <div key={lvl} className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-semibold">{lvl}º Círculo:</span>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: slot.max }).map((_, i) => {
                              const isUsed = i < slot.used;
                              return (
                                <button
                                  key={i}
                                  disabled={!canEdit(selected)}
                                  onClick={() => toggleSpellSlot(lvl, i)}
                                  title={isUsed ? 'Espaço gasto (clique p/ restaurar)' : 'Espaço disponível (clique p/ gastar)'}
                                  className={`w-4 h-4 rounded border cursor-pointer transition ${
                                    isUsed
                                      ? 'bg-slate-800 border-slate-700 opacity-50'
                                      : 'bg-sky-500/30 border-sky-400 shadow-sm shadow-sky-500/30'
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  canEdit(selected) &&
                  spellAbility && (
                    <button
                      onClick={() =>
                        onSaveCharacter({
                          ...selected,
                          spellSlots: getSpellSlotsForClass(selected.className, selected.level)
                        })
                      }
                      className="w-full py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 text-[11px] font-semibold cursor-pointer"
                    >
                      Gerar Espaços de Magia ({selected.className} Nv.{selected.level})
                    </button>
                  )
                )}

                {/* Lista detalhada de Magias + Catálogo PHB */}
                {(selected.spellList || []).length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {(selected.spellList || []).map((sp) => (
                      <div
                        key={sp.id}
                        className="bg-slate-900 border border-slate-800 rounded-lg p-2 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-sky-200 truncate">
                            {sp.level === 0 ? 'Truque' : `${sp.level}º`} • {sp.name}
                            {sp.concentration ? ' (C)' : ''}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {(sp.isAttack || sp.damageFormula) && (
                              <button
                                onClick={() => handleCastSpell(sp)}
                                className="px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/35 text-sky-200 font-semibold text-[10px] cursor-pointer"
                              >
                                Conjurar {sp.damageFormula ? `(${sp.damageFormula})` : ''}
                              </button>
                            )}
                            {canEdit(selected) && (
                              <button
                                onClick={() =>
                                  onSaveCharacter({
                                    ...selected,
                                    spellList: (selected.spellList || []).filter(
                                      (x) => x.id !== sp.id
                                    )
                                  })
                                }
                                className="text-slate-600 hover:text-rose-400 cursor-pointer"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400">{sp.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {selected.spells.length > 0 && (selected.spellList || []).length === 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.spells.map((sp, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-200 text-[11px]"
                      >
                        {sp}
                      </span>
                    ))}
                  </div>
                )}

                {canEdit(selected) && (
                  <div className="flex gap-1.5 pt-1">
                    <select
                      value={selectedSpellToAdd}
                      onChange={(e) => setSelectedSpellToAdd(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-100"
                    >
                      {DND_SPELLS.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          [{sp.level === 0 ? 'Truque' : `${sp.level}º`}] {sp.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddSpellFromCatalog}
                      className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-semibold text-[11px] hover:bg-sky-500/30 cursor-pointer"
                    >
                      + Magia
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {subTab === 'gear' && (() => {
            const items = getInventoryItems(selected);
            const totalKg = getTotalCarryWeightKg(selected);
            const coinsKg = getCoinsWeightKg(selected.currency);
            const enc = getEncumbranceInfo(totalKg, selected.abilities.str);
            const totalPo = getTotalGoldEquivalent(selected.currency);

            return (
              <div className="space-y-2.5 text-xs">
                {/* Capacidade de Carga baseada na Força */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5" /> Peso & Carga (FOR {selected.abilities.str})
                    </span>
                    <span className="font-mono font-bold text-slate-100">
                      {totalKg} / {enc.maxKg} kg
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all ${
                        enc.tone === 'rose'
                          ? 'bg-rose-500'
                          : enc.tone === 'orange'
                          ? 'bg-orange-500'
                          : enc.tone === 'amber'
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${enc.pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className={`font-semibold ${
                        enc.tone === 'rose'
                          ? 'text-rose-300'
                          : enc.tone === 'orange'
                          ? 'text-orange-300'
                          : enc.tone === 'amber'
                          ? 'text-amber-300'
                          : 'text-emerald-300'
                      }`}
                    >
                      {enc.status}
                    </span>
                    <span className="text-slate-400">
                      Itens: {(totalKg - coinsKg).toFixed(2)} kg • Moedas: {coinsKg} kg
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">{enc.detail}</div>
                </div>

                {/* Carteira de Moedas */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" /> Moedas do Personagem
                    </span>
                    <span className="text-[11px] font-mono text-amber-200">
                      Total ≈ {totalPo} PO
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {(
                      [
                        ['cp', 'PC'],
                        ['sp', 'PP'],
                        ['ep', 'PE'],
                        ['gp', 'PO'],
                        ['pp', 'PL']
                      ] as const
                    ).map(([k, lbl]) => (
                      <div key={k} className="bg-slate-900 border border-slate-800 rounded p-1">
                        <div className="text-[9px] text-slate-400 font-bold">{lbl}</div>
                        <input
                          type="number"
                          disabled={!canEdit(selected)}
                          value={selected.currency?.[k] ?? 0}
                          onChange={(e) =>
                            onSaveCharacter({
                              ...selected,
                              currency: {
                                cp: selected.currency?.cp ?? 0,
                                sp: selected.currency?.sp ?? 0,
                                ep: selected.currency?.ep ?? 0,
                                gp: selected.currency?.gp ?? 0,
                                pp: selected.currency?.pp ?? 0,
                                [k]: Math.max(0, parseInt(e.target.value, 10) || 0)
                              }
                            })
                          }
                          className="w-full text-center bg-transparent font-mono text-[11px] font-bold text-amber-200 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inventário Estruturado (Com Peso e Quantidade) */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">Mochila & Equipamentos ({items.length})</span>
                  </div>

                  {items.length === 0 ? (
                    <p className="text-slate-500 italic">Nenhum item na mochila.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                      {items.map((item) => {
                        const rowWeight = +((item.weightKg || 0) * (item.quantity || 1)).toFixed(2);
                        return (
                          <div
                            key={item.id}
                            className="bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1.5 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {canEdit(selected) && (
                                  <input
                                    type="checkbox"
                                    checked={Boolean(item.equipped)}
                                    onChange={() =>
                                      updateInventoryList(
                                        selected,
                                        items.map((it) =>
                                          it.id === item.id
                                            ? { ...it, equipped: !it.equipped }
                                            : it
                                        )
                                      )
                                    }
                                    title="Equipado"
                                    className="accent-amber-500 cursor-pointer"
                                  />
                                )}
                                <span
                                  className={`text-xs font-medium truncate ${
                                    item.equipped ? 'text-amber-200' : 'text-slate-200'
                                  }`}
                                  title={item.description || item.name}
                                >
                                  {item.name}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {item.category || 'Item'} • {item.weightKg} kg/unid • Total:{' '}
                                <strong className="text-slate-300">{rowWeight} kg</strong>
                                {item.value ? ` • ${item.value}` : ''}
                              </div>
                            </div>

                            {canEdit(selected) && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => {
                                    if (item.quantity <= 1) {
                                      updateInventoryList(
                                        selected,
                                        items.filter((it) => it.id !== item.id)
                                      );
                                    } else {
                                      updateInventoryList(
                                        selected,
                                        items.map((it) =>
                                          it.id === item.id
                                            ? { ...it, quantity: it.quantity - 1 }
                                            : it
                                        )
                                      );
                                    }
                                  }}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="w-5 text-center font-mono font-bold text-slate-100">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateInventoryList(
                                      selected,
                                      items.map((it) =>
                                        it.id === item.id
                                          ? { ...it, quantity: it.quantity + 1 }
                                          : it
                                      )
                                    )
                                  }
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                                >
                                  +
                                </button>
                                <button
                                  onClick={() =>
                                    updateInventoryList(
                                      selected,
                                      items.filter((it) => it.id !== item.id)
                                    )
                                  }
                                  className="p-1 text-slate-600 hover:text-rose-400 cursor-pointer"
                                  title="Remover item"
                                >
                                  ×
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {canEdit(selected) && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                      {/* Catálogo rápido de itens D&D 5e */}
                      <div className="flex gap-1.5">
                        <select
                          value={selectedItemToAdd}
                          onChange={(e) => setSelectedItemToAdd(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-100"
                        >
                          {DND_ITEMS.map((it) => (
                            <option key={it.id} value={it.id}>
                              [{it.category}] {it.name} ({it.weightKg}kg • {it.value})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddCatalogItem}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-semibold text-[11px] hover:bg-emerald-500/30 cursor-pointer"
                        >
                          + Item PHB
                        </button>
                      </div>

                      {/* Item personalizado com peso */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!newItemText.trim()) return;
                          const qty = Math.max(1, parseInt(newItemQty, 10) || 1);
                          const wKg = Math.max(0, parseFloat(newItemWeight) || 0);
                          updateInventoryList(selected, [
                            ...items,
                            {
                              id: `item-${Date.now()}`,
                              name: newItemText.trim(),
                              quantity: qty,
                              weightKg: wKg,
                              category: 'Personalizado',
                              equipped: false
                            }
                          ]);
                          setNewItemText('');
                        }}
                        className="flex gap-1"
                      >
                        <input
                          type="text"
                          value={newItemText}
                          onChange={(e) => setNewItemText(e.target.value)}
                          placeholder="Item personalizado..."
                          className="flex-1 min-w-[90px] bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-100"
                        />
                        <input
                          type="number"
                          min={1}
                          value={newItemQty}
                          onChange={(e) => setNewItemQty(e.target.value)}
                          title="Quantidade"
                          className="w-10 bg-slate-900 border border-slate-700 rounded-lg px-1 py-1 text-[11px] text-center text-slate-100 font-mono"
                        />
                        <input
                          type="number"
                          step="0.1"
                          min={0}
                          value={newItemWeight}
                          onChange={(e) => setNewItemWeight(e.target.value)}
                          title="Peso unitário (kg)"
                          className="w-12 bg-slate-900 border border-slate-700 rounded-lg px-1 py-1 text-[11px] text-center text-slate-100 font-mono"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-semibold text-[11px] cursor-pointer"
                        >
                          +
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* Comércio / Troca de Itens <-> Moedas com o Mestre */}
                {canEdit(selected) && !selected.isNpc && (
                  <div className="bg-slate-950/80 border border-teal-500/30 rounded-xl p-2.5 space-y-2">
                    <div className="font-bold text-teal-300 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Comércio com o Mestre
                    </div>

                    <div className="grid grid-cols-2 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setTradeMode('sell_to_dm')}
                        className={`py-1 rounded font-semibold cursor-pointer ${
                          tradeMode === 'sell_to_dm'
                            ? 'bg-teal-500 text-slate-950'
                            : 'text-slate-400'
                        }`}
                      >
                        Vender Item → Moedas
                      </button>
                      <button
                        type="button"
                        onClick={() => setTradeMode('buy_from_dm')}
                        className={`py-1 rounded font-semibold cursor-pointer ${
                          tradeMode === 'buy_from_dm'
                            ? 'bg-teal-500 text-slate-950'
                            : 'text-slate-400'
                        }`}
                      >
                        Enviar Moedas → Item
                      </button>
                    </div>

                    {tradeMode === 'sell_to_dm' ? (
                      items.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">
                          Você não tem itens na mochila para vender.
                        </p>
                      ) : (
                        <select
                          value={
                            items.some((i) => i.id === sellItemId) ? sellItemId : items[0].id
                          }
                          onChange={(e) => setSellItemId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-100"
                        >
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.name} (Qtd: {it.quantity}
                              {it.value ? ` • Ref: ${it.value}` : ''})
                            </option>
                          ))}
                        </select>
                      )
                    ) : (
                      <select
                        value={buyItemId}
                        onChange={(e) => setBuyItemId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-100"
                      >
                        {DND_ITEMS.map((it) => (
                          <option key={it.id} value={it.id}>
                            [{it.category}] {it.name} ({it.value} • {it.weightKg}kg)
                          </option>
                        ))}
                      </select>
                    )}

                    <div className="grid grid-cols-4 gap-1 text-center">
                      <div>
                        <span className="text-[9px] text-slate-400">Qtd</span>
                        <input
                          type="number"
                          min={1}
                          value={tradeQty}
                          onChange={(e) =>
                            setTradeQty(Math.max(1, parseInt(e.target.value, 10) || 1))
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-center font-mono text-[11px] text-slate-100"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-amber-300">PO</span>
                        <input
                          type="number"
                          min={0}
                          value={tradeGp}
                          onChange={(e) =>
                            setTradeGp(Math.max(0, parseInt(e.target.value, 10) || 0))
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-center font-mono text-[11px] text-amber-200"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-300">PP</span>
                        <input
                          type="number"
                          min={0}
                          value={tradeSp}
                          onChange={(e) =>
                            setTradeSp(Math.max(0, parseInt(e.target.value, 10) || 0))
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-center font-mono text-[11px] text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-orange-300">PC</span>
                        <input
                          type="number"
                          min={0}
                          value={tradeCp}
                          onChange={(e) =>
                            setTradeCp(Math.max(0, parseInt(e.target.value, 10) || 0))
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-center font-mono text-[11px] text-orange-200"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={tradeMode === 'sell_to_dm' && items.length === 0}
                      onClick={() => {
                        const chosenItem =
                          tradeMode === 'sell_to_dm'
                            ? items.find((i) => i.id === sellItemId) || items[0]
                            : DND_ITEMS.find((i) => i.id === buyItemId);
                        if (!chosenItem) return;
                        onCreateTrade({
                          direction: tradeMode,
                          characterId: selected.id,
                          item: {
                            id: chosenItem.id,
                            name: chosenItem.name,
                            quantity: tradeQty,
                            weightKg: chosenItem.weightKg,
                            category: chosenItem.category,
                            value: chosenItem.value,
                            description: chosenItem.description
                          },
                          coins: { gp: tradeGp, sp: tradeSp, cp: tradeCp }
                        });
                        setTradeSentMsg('✓ Proposta enviada ao Mestre!');
                        setTimeout(() => setTradeSentMsg(''), 2500);
                      }}
                      className="w-full py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-slate-950 font-bold text-[11px] cursor-pointer"
                    >
                      {tradeMode === 'sell_to_dm'
                        ? 'Enviar Item em Troca de Moedas'
                        : 'Enviar Moedas em Troca de Item'}
                    </button>

                    {tradeSentMsg && (
                      <div className="text-center text-[10px] font-bold text-emerald-300">
                        {tradeSentMsg}
                      </div>
                    )}

                    {/* Ofertas recebidas do Mestre, contrapropostas ou pendentes deste personagem */}
                    {trades.filter(
                      (t) =>
                        t.characterId === selected.id &&
                        (t.status === 'pending' || t.status === 'countered')
                    ).length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-slate-800">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">
                          Trocas & Contrapropostas
                        </div>
                        {trades
                          .filter(
                            (t) =>
                              t.characterId === selected.id &&
                              (t.status === 'pending' || t.status === 'countered')
                          )
                          .map((tr) => {
                            const fmt = (c?: {
                              pp?: number;
                              gp?: number;
                              ep?: number;
                              sp?: number;
                              cp?: number;
                            }) =>
                              [
                                c?.pp ? `${c.pp} PL` : '',
                                c?.gp ? `${c.gp} PO` : '',
                                c?.ep ? `${c.ep} PE` : '',
                                c?.sp ? `${c.sp} PP` : '',
                                c?.cp ? `${c.cp} PC` : ''
                              ]
                                .filter(Boolean)
                                .join(' ') || '0 PO';

                            const needsPlayerDecision =
                              tr.direction === 'dm_to_player' || tr.status === 'countered';

                            return (
                              <div
                                key={tr.id}
                                className={`rounded-lg p-2 flex flex-col gap-1.5 text-[11px] border ${
                                  tr.status === 'countered'
                                    ? 'bg-amber-950/30 border-amber-500/50'
                                    : 'bg-slate-900 border-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-200 truncate">
                                      {tr.status === 'countered'
                                        ? `⚖️ Contraproposta do Mestre: ${tr.item?.quantity || 1}× ${tr.item?.name}`
                                        : tr.direction === 'dm_to_player'
                                        ? `🏪 Oferta do Mestre: ${tr.item?.quantity || 1}× ${tr.item?.name}`
                                        : tr.direction === 'sell_to_dm'
                                        ? `💰 Vendendo: ${tr.item?.quantity || 1}× ${tr.item?.name}`
                                        : `🛒 Comprando: ${tr.item?.quantity || 1}× ${tr.item?.name}`}
                                    </div>
                                    {tr.status === 'countered' ? (
                                      <div className="text-[10px] space-y-0.5">
                                        <span className="text-slate-400 line-through mr-1.5">
                                          Seu pedido: {fmt(tr.coins)}
                                        </span>
                                        <span className="text-amber-300 font-bold">
                                          Novo valor: {fmt(tr.counterCoins)}
                                        </span>
                                        {tr.counterNote && (
                                          <div className="text-amber-200/80 italic">
                                            "{tr.counterNote}"
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-[10px] text-amber-300">
                                        Valor: {fmt(tr.coins)}
                                      </div>
                                    )}
                                  </div>

                                  {!needsPlayerDecision && (
                                    <span className="text-[10px] text-amber-300 font-semibold shrink-0">
                                      Aguardando...
                                    </span>
                                  )}
                                </div>

                                {needsPlayerDecision && (
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => onRespondTrade(tr.id, true)}
                                      className="flex-1 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer"
                                    >
                                      {tr.status === 'countered'
                                        ? `✓ Aceitar (${fmt(tr.counterCoins)})`
                                        : '✓ Aceitar'}
                                    </button>
                                    <button
                                      onClick={() => onRespondTrade(tr.id, false)}
                                      className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 cursor-pointer"
                                    >
                                      Recusar
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* Armadura Equipada */}
                {canEdit(selected) && (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
                    <span className="font-bold text-slate-200">Armadura Equipada</span>
                    <select
                      value={selected.armorName || 'Sem Armadura'}
                      onChange={(e) => {
                        const armName = e.target.value;
                        const newAc = calcArmorClass(armName, selected.abilities, false);
                        onSaveCharacter({ ...selected, armorName: armName, ac: newAc });
                      }}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 max-w-[170px]"
                    >
                      {DND_ARMORS.map((a) => (
                        <option key={a.id} value={a.name}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                  <div className="font-bold text-slate-300">Personalidade & Histórico</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        ['traits', 'Traços'],
                        ['ideals', 'Ideais'],
                        ['bonds', 'Vínculos'],
                        ['flaws', 'Defeitos']
                      ] as const
                    ).map(([field, lbl]) => (
                      <input
                        key={field}
                        type="text"
                        disabled={!canEdit(selected)}
                        value={selected.personality?.[field] || ''}
                        onChange={(e) =>
                          onSaveCharacter({
                            ...selected,
                            personality: {
                              traits: selected.personality?.traits || '',
                              ideals: selected.personality?.ideals || '',
                              bonds: selected.personality?.bonds || '',
                              flaws: selected.personality?.flaws || '',
                              [field]: e.target.value
                            }
                          })
                        }
                        placeholder={lbl}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    disabled={!canEdit(selected)}
                    value={selected.notes}
                    onChange={(e) => onSaveCharacter({ ...selected, notes: e.target.value })}
                    placeholder="Anotações gerais..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

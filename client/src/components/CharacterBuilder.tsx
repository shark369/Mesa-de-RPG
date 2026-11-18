import React, { useMemo, useState } from 'react';
import { X, Dices, Sparkles, Check, ChevronRight, ChevronLeft, Shield, Download } from 'lucide-react';
import { Abilities, AbilityKey, CharacterSheet } from '../types/rpg';
import { downloadSampleCharacterTemplate } from '../utils/importer';
import {
  ABILITY_LABELS,
  DND_ALIGNMENTS,
  DND_ARMORS,
  DND_BACKGROUNDS,
  DND_CLASSES,
  DND_ITEMS,
  DND_RACES,
  DND_SKILLS,
  DND_SPELLS,
  DRAGON_ANCESTRIES,
  POINT_BUY_COSTS,
  STANDARD_ARRAY,
  SUBCLASSES_BY_CLASS,
  XP_TABLE,
  calcArmorClass,
  formatMod,
  getAbilityMod,
  getProficiencyBonus,
  getSpellSlotsForClass
} from '../data/dnd5e';
import { rollDie } from '../utils/dice';

interface CharacterBuilderProps {
  ownerName: string;
  isDm: boolean;
  onClose: () => void;
  onSave: (char: CharacterSheet, spawnToken: boolean) => void;
}

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const CharacterBuilder: React.FC<CharacterBuilderProps> = ({
  ownerName,
  isDm,
  onClose,
  onSave
}) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [raceId, setRaceId] = useState(DND_RACES[3].id); // Humano padrão
  const [subraceId, setSubraceId] = useState<string>('standard_human');
  const [dragonAncestryId, setDragonAncestryId] = useState<string>(DRAGON_ANCESTRIES[9].id);
  const [extraAbilityPicks, setExtraAbilityPicks] = useState<AbilityKey[]>(['str', 'con']);
  const [classId, setClassId] = useState('fighter');
  const [subclass, setSubclass] = useState('');
  const [level, setLevel] = useState(1);
  const [backgroundId, setBackgroundId] = useState(DND_BACKGROUNDS[12].id); // Soldado
  const [alignment, setAlignment] = useState(DND_ALIGNMENTS[1]); // Neutro e Bom
  const [avatar, setAvatar] = useState('⚔️');
  const [isNpc, setIsNpc] = useState(false);
  const [spawnToken, setSpawnToken] = useState(true);
  const [personality, setPersonality] = useState({
    traits: '',
    ideals: '',
    bonds: '',
    flaws: ''
  });

  const [attrMethod, setAttrMethod] = useState<'standard' | 'pointbuy' | 'roll'>('standard');
  const [baseAbilities, setBaseAbilities] = useState<Abilities>({
    str: 15,
    dex: 14,
    con: 13,
    int: 10,
    wis: 12,
    cha: 8
  });

  const [armorName, setArmorName] = useState<string>('Cota de Malha');
  const [hasShield, setHasShield] = useState<boolean>(true);
  const [classSkills, setClassSkills] = useState<string[]>(['perception', 'survival']);
  const [notes, setNotes] = useState('');

  const selectedRace = DND_RACES.find((r) => r.id === raceId) || DND_RACES[0];
  const selectedSubrace = selectedRace.subraces?.find((sr) => sr.id === subraceId) || selectedRace.subraces?.[0];
  const selectedClass = DND_CLASSES.find((c) => c.id === classId) || DND_CLASSES[0];
  const selectedBg = DND_BACKGROUNDS.find((b) => b.id === backgroundId) || DND_BACKGROUNDS[0];
  const selectedDragon = DRAGON_ANCESTRIES.find((d) => d.id === dragonAncestryId) || DRAGON_ANCESTRIES[0];

  const extraAbilityCount =
    (selectedRace.extraAbilityChoices || 0) + (selectedSubrace?.extraAbilityChoices || 0);
  const extraSkillCount =
    (selectedRace.extraSkillChoices || 0) + (selectedSubrace?.extraSkillChoices || 0);

  // Perícias automáticas de Raça + Antecedente
  const autoSkills = useMemo(() => {
    const list = new Set<string>([
      ...(selectedRace.bonusSkills || []),
      ...(selectedSubrace?.extraSkills || []),
      ...selectedBg.skills
    ]);
    return Array.from(list);
  }, [selectedRace, selectedSubrace, selectedBg]);

  // Soma atributos base + raça + sub-raça + escolhas extras (Meio-Elfo / Humano Alt.)
  const finalAbilities: Abilities = useMemo(() => {
    const bonusFor = (k: AbilityKey) => {
      let b = (selectedRace.bonuses[k] || 0) + (selectedSubrace?.bonuses[k] || 0);
      if (extraAbilityCount > 0 && extraAbilityPicks.slice(0, extraAbilityCount).includes(k)) {
        b += 1;
      }
      return b;
    };
    return {
      str: baseAbilities.str + bonusFor('str'),
      dex: baseAbilities.dex + bonusFor('dex'),
      con: baseAbilities.con + bonusFor('con'),
      int: baseAbilities.int + bonusFor('int'),
      wis: baseAbilities.wis + bonusFor('wis'),
      cha: baseAbilities.cha + bonusFor('cha')
    };
  }, [baseAbilities, selectedRace, selectedSubrace, extraAbilityCount, extraAbilityPicks]);

  const pointBuyUsed = useMemo(() => {
    return ABILITY_KEYS.reduce((acc, k) => {
      const val = Math.max(8, Math.min(15, baseAbilities[k]));
      return acc + (POINT_BUY_COSTS[val] ?? 0);
    }, 0);
  }, [baseAbilities]);

  const profBonus = getProficiencyBonus(level);
  const conMod = getAbilityMod(finalAbilities.con);
  const hpBonusPerLevel = selectedSubrace?.hpPerLevelBonus || 0;

  const maxHp = Math.max(
    1,
    selectedClass.hitDie +
      conMod +
      hpBonusPerLevel +
      (level - 1) * (Math.floor(selectedClass.hitDie / 2) + 1 + conMod + hpBonusPerLevel)
  );

  const estimatedAc = calcArmorClass(armorName, finalAbilities, hasShield);

  const handleRaceChange = (newRaceId: string) => {
    setRaceId(newRaceId);
    const race = DND_RACES.find((r) => r.id === newRaceId);
    setSubraceId(race?.subraces?.[0]?.id || '');
    if (newRaceId === 'halfelf') {
      setExtraAbilityPicks(['dex', 'con']);
    } else {
      setExtraAbilityPicks(['str', 'con']);
    }
  };

  const handleClassChange = (newClassId: string) => {
    setClassId(newClassId);
    setSubclass('');
    const cls = DND_CLASSES.find((c) => c.id === newClassId);
    if (cls) {
      setAvatar(cls.avatar);
      setArmorName(cls.starterArmorName);
      setHasShield(Boolean(cls.starterShield));
      const availableSuggestions = cls.suggestedSkills.filter((sk) => !autoSkills.includes(sk));
      setClassSkills(availableSuggestions.slice(0, cls.skillCount + extraSkillCount));
    }
  };

  const handleRoll4d6 = () => {
    const rollStat = () => {
      const rolls = [rollDie(6), rollDie(6), rollDie(6), rollDie(6)].sort((a, b) => a - b);
      return rolls[1] + rolls[2] + rolls[3];
    };
    setBaseAbilities({
      str: rollStat(),
      dex: rollStat(),
      con: rollStat(),
      int: rollStat(),
      wis: rollStat(),
      cha: rollStat()
    });
  };

  const toggleExtraAbility = (key: AbilityKey) => {
    // Meio-Elfo não pode colocar +1 em CAR pois já ganha +2 CAR
    if (selectedRace.id === 'halfelf' && key === 'cha') return;
    setExtraAbilityPicks((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      const next = [...prev, key];
      return next.slice(-extraAbilityCount);
    });
  };

  const maxPickableSkills = selectedClass.skillCount + extraSkillCount;

  const toggleClassSkill = (skillId: string) => {
    if (autoSkills.includes(skillId)) return;
    setClassSkills((prev) => {
      if (prev.includes(skillId)) return prev.filter((s) => s !== skillId);
      if (prev.length >= maxPickableSkills) return prev;
      return [...prev, skillId];
    });
  };

  const allSelectedSkills = useMemo(
    () => Array.from(new Set([...autoSkills, ...classSkills])),
    [autoSkills, classSkills]
  );

  const handleFinish = () => {
    const attacks = selectedClass.starterAttacks.map((atk, idx) => {
      const mod = getAbilityMod(finalAbilities[atk.ability]);
      return {
        id: `atk-${Date.now()}-${idx}`,
        name: atk.name,
        attackBonus: mod + profBonus,
        damageFormula: `${atk.damageFormula}${mod >= 0 ? `+${mod}` : mod}`,
        damageType: atk.damageType
      };
    });

    if (selectedRace.id === 'dragonborn') {
      attacks.push({
        id: `atk-breath-${Date.now()}`,
        name: `Arma de Sopro (${selectedDragon.dragon} - ${selectedDragon.breathShape})`,
        attackBonus: 8 + conMod + profBonus,
        damageFormula: level >= 16 ? '5d6' : level >= 11 ? '4d6' : level >= 6 ? '3d6' : '2d6',
        damageType: selectedDragon.damageType
      });
    }

    const matchedSpells = selectedClass.starterSpells
      .map((spName) =>
        DND_SPELLS.find((s) => s.name.toLowerCase().startsWith(spName.toLowerCase()))
      )
      .filter((s): s is NonNullable<typeof s> => Boolean(s));

    const speed = selectedSubrace?.speedOverride || selectedRace.speed;
    const traitLines = [
      `Raça (${selectedSubrace ? selectedSubrace.name : selectedRace.name}): ${selectedRace.traits}`,
      selectedSubrace ? `Sub-raça: ${selectedSubrace.traits}` : '',
      selectedRace.id === 'dragonborn'
        ? `Ancestral Dracônico: Dragão ${selectedDragon.dragon} (Dano/Resistência: ${selectedDragon.damageType})`
        : '',
      `Classe (${selectedClass.name}): ${selectedClass.classSummary}`,
      `Antecedente (${selectedBg.name}): ${selectedBg.feature}`
    ]
      .filter(Boolean)
      .join('\n');

    const spellSlots = getSpellSlotsForClass(selectedClass.id, level);

    const starterRaw = [...selectedClass.starterInventory, selectedBg.equipment];
    const starterItems = starterRaw.map((rawName, idx) => {
      const lower = rawName.toLowerCase();
      const matched = DND_ITEMS.find(
        (it) => lower.includes(it.name.toLowerCase()) || it.name.toLowerCase().includes(lower)
      );
      return {
        id: `item-${Date.now()}-${idx}`,
        name: rawName,
        quantity: 1,
        weightKg: matched?.weightKg ?? 1,
        category: matched?.category ?? 'Equipamento',
        value: matched?.value,
        description: matched?.description,
        equipped: lower.includes('armadura') || lower.includes('cota') || lower.includes('brunea') || lower.includes('escudo')
      };
    });

    const newChar: CharacterSheet = {
      id: `char-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || `${selectedRace.name} ${selectedClass.name}`,
      isNpc,
      isSecretNpc: false,
      ownerName,
      race: selectedRace.name,
      subrace: selectedSubrace?.name,
      className: selectedClass.name,
      subclass: subclass || undefined,
      level,
      xp: XP_TABLE[Math.max(0, Math.min(19, level - 1))],
      background: selectedBg.name,
      alignment,
      avatar,
      inspiration: false,
      abilities: finalAbilities,
      savingThrowProficiencies: selectedClass.saves,
      skillProficiencies: allSelectedSkills,
      expertiseSkills: selectedClass.id === 'rogue' ? allSelectedSkills.slice(0, 2) : [],
      hp: maxHp,
      maxHp,
      tempHp: 0,
      ac: estimatedAc,
      armorName,
      speed,
      hitDice: `${level}d${selectedClass.hitDie}`,
      hitDiceRemaining: level,
      deathSaves: { successes: 0, failures: 0 },
      conditions: [],
      exhaustion: 0,
      spellcastingAbility: selectedClass.spellcastingAbility,
      spellSlots,
      spellList: matchedSpells,
      attacks,
      spells: [...selectedClass.starterSpells],
      inventory: starterRaw,
      inventoryItems: starterItems,
      currency: { cp: 0, sp: 0, ep: 0, gp: selectedBg.id === 'noble' ? 25 : 15, pp: 0 },
      traits: traitLines,
      personality,
      notes
    };

    onSave(newChar, spawnToken);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Criador de Personagem D&D 5e (Livro do Jogador)
            </h2>
            <p className="text-xs text-slate-400">
              Passo {step} de 4 — {step === 1 ? 'Raça, Classe & Antecedente' : step === 2 ? 'Atributos' : step === 3 ? 'Perícias & Armadura' : 'Revisão Final'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadSampleCharacterTemplate}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-semibold cursor-pointer"
              title="Baixar modelo JSON pronto de ficha para editar e importar"
            >
              <Download className="w-3.5 h-3.5" />
              Modelo JSON
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="grid grid-cols-4 h-1.5 bg-slate-800">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={s <= step ? 'bg-amber-500 transition-all' : 'bg-transparent'} />
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Nome do Personagem
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Kaelen, Lâmina da Aurora"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Tendência (Alinhamento)
                  </label>
                  <select
                    value={alignment}
                    onChange={(e) => setAlignment(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                  >
                    {DND_ALIGNMENTS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Avatar
                  </label>
                  <input
                    type="text"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-center text-xl focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Raça + Sub-raça */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">
                    Raça (9 Oficiais)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DND_RACES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleRaceChange(r.id)}
                        className={`p-2 rounded-xl border text-left text-xs transition cursor-pointer ${
                          raceId === r.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold truncate">
                          {r.avatar} {r.name}
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedRace.subraces && selectedRace.subraces.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-300 uppercase mb-1">
                        Sub-raça / Linhagem
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRace.subraces.map((sr) => (
                          <button
                            key={sr.id}
                            type="button"
                            onClick={() => setSubraceId(sr.id)}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer ${
                              selectedSubrace?.id === sr.id
                                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            {sr.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedRace.id === 'dragonborn' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-300 uppercase mb-1">
                        Ancestralidade Dracônica
                      </label>
                      <select
                        value={dragonAncestryId}
                        onChange={(e) => setDragonAncestryId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                      >
                        {DRAGON_ANCESTRIES.map((d) => (
                          <option key={d.id} value={d.id}>
                            Dragão {d.dragon} — {d.damageType} ({d.breathShape})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
                    <div>{selectedRace.traits}</div>
                    {selectedSubrace && (
                      <div className="text-amber-300/90 font-medium">
                        {selectedSubrace.name}: {selectedSubrace.traits}
                      </div>
                    )}
                  </div>
                </div>

                {/* Classe */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">
                    Classe (12 Oficiais)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DND_CLASSES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleClassChange(c.id)}
                        className={`p-2 rounded-xl border text-left text-xs transition cursor-pointer ${
                          classId === c.id
                            ? 'bg-sky-500/20 border-sky-500 text-sky-200'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold truncate">
                          {c.avatar} {c.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          d{c.hitDie} {c.spellcastingAbility ? `• ${ABILITY_LABELS[c.spellcastingAbility].short}` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-sky-200/80 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    {selectedClass.classSummary}
                  </div>
                  {(SUBCLASSES_BY_CLASS[selectedClass.name] || []).length > 0 && (
                    <div>
                      <label className="block text-[11px] font-semibold text-sky-300 uppercase mb-1">
                        Arquétipo / Subclasse (Opcional / Nv. {SUBCLASSES_BY_CLASS[selectedClass.name][0].unlockLevel}+)
                      </label>
                      <select
                        value={subclass}
                        onChange={(e) => setSubclass(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                      >
                        <option value="">Escolher depois...</option>
                        {SUBCLASSES_BY_CLASS[selectedClass.name].map((sc) => (
                          <option key={sc.name} value={sc.name}>
                            {sc.name} — {sc.summary}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Nível ({level}) • XP Inicial: {XP_TABLE[level - 1].toLocaleString('pt-BR')}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={level}
                    onChange={(e) => setLevel(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Antecedente (13 Oficiais — concede 2 perícias)
                  </label>
                  <select
                    value={backgroundId}
                    onChange={(e) => setBackgroundId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                  >
                    {DND_BACKGROUNDS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.skills.map((s) => DND_SKILLS.find((x) => x.id === s)?.name).join(', ')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isDm && (
                <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNpc}
                    onChange={(e) => setIsNpc(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Criar esta ficha como <strong>NPC / Aliado do Mestre</strong>
                </label>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAttrMethod('standard');
                      setBaseAbilities({ str: 15, dex: 14, con: 13, int: 10, wis: 12, cha: 8 });
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer ${
                      attrMethod === 'standard' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    Matriz Padrão
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAttrMethod('pointbuy');
                      setBaseAbilities({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer ${
                      attrMethod === 'pointbuy' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    Compra de Pontos (27)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAttrMethod('roll');
                      handleRoll4d6();
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer ${
                      attrMethod === 'roll' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    Rolar 4d6 (descartar menor)
                  </button>
                </div>

                {attrMethod === 'pointbuy' && (
                  <div
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                      27 - pointBuyUsed >= 0
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    Pontos Restantes: {27 - pointBuyUsed} / 27
                  </div>
                )}

                {attrMethod === 'roll' && (
                  <button
                    type="button"
                    onClick={handleRoll4d6}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-semibold hover:bg-sky-500/30 cursor-pointer"
                  >
                    <Dices className="w-4 h-4" />
                    Re-rolar Atributos
                  </button>
                )}
              </div>

              {extraAbilityCount > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-amber-200 font-semibold">
                    Bônus Racial Livre ({selectedSubrace?.name || selectedRace.name}): escolha{' '}
                    {extraAbilityCount} atributos para ganhar +1
                  </span>
                  <div className="flex gap-1.5">
                    {ABILITY_KEYS.map((k) => {
                      const disabled = selectedRace.id === 'halfelf' && k === 'cha';
                      const picked = extraAbilityPicks.includes(k);
                      return (
                        <button
                          key={k}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleExtraAbility(k)}
                          className={`px-2.5 py-1 rounded-lg font-bold border cursor-pointer disabled:opacity-30 ${
                            picked
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}
                        >
                          {ABILITY_LABELS[k].short} +1
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ABILITY_KEYS.map((key) => {
                  const racial =
                    (selectedRace.bonuses[key] || 0) +
                    (selectedSubrace?.bonuses[key] || 0) +
                    (extraAbilityCount > 0 && extraAbilityPicks.slice(0, extraAbilityCount).includes(key)
                      ? 1
                      : 0);
                  const total = finalAbilities[key];
                  const mod = getAbilityMod(total);

                  return (
                    <div
                      key={key}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col items-center"
                    >
                      <div className="text-xs font-bold text-amber-400 uppercase">
                        {ABILITY_LABELS[key].name}
                      </div>

                      <div className="my-2 flex items-center gap-2">
                        {attrMethod === 'pointbuy' ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setBaseAbilities((p) => ({
                                  ...p,
                                  [key]: Math.max(8, p[key] - 1)
                                }))
                              }
                              className="w-6 h-6 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-xl font-bold font-mono w-7 text-center">
                              {baseAbilities[key]}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setBaseAbilities((p) => ({
                                  ...p,
                                  [key]: Math.min(15, p[key] + 1)
                                }))
                              }
                              className="w-6 h-6 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer"
                            >
                              +
                            </button>
                          </>
                        ) : attrMethod === 'standard' ? (
                          <select
                            value={baseAbilities[key]}
                            onChange={(e) => {
                              const newVal = parseInt(e.target.value, 10);
                              const oldVal = baseAbilities[key];
                              const otherKey = ABILITY_KEYS.find(
                                (k) => k !== key && baseAbilities[k] === newVal
                              );
                              setBaseAbilities((prev) => ({
                                ...prev,
                                [key]: newVal,
                                ...(otherKey ? { [otherKey]: oldVal } : {})
                              }));
                            }}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-lg font-bold font-mono text-slate-100"
                          >
                            {STANDARD_ARRAY.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xl font-bold font-mono">{baseAbilities[key]}</span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {racial > 0 ? `+${racial} racial = ` : 'Total: '}
                        <strong className="text-slate-100">{total}</strong>{' '}
                        <span className="text-amber-300 font-bold">({formatMod(mod)})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {/* Seleção de Armadura e Escudo */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" /> Armadura & Cálculo Oficial de CA
                  </span>
                  <span className="text-sm font-mono font-bold text-sky-200">
                    CA Final: {estimatedAc}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={armorName}
                    onChange={(e) => setArmorName(e.target.value)}
                    className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100"
                  >
                    {DND_ARMORS.map((arm) => (
                      <option key={arm.id} value={arm.name}>
                        {arm.name} (Base {arm.baseAc}
                        {arm.maxDexBonus === null
                          ? ' + DES'
                          : arm.maxDexBonus === 2
                          ? ' + DES máx 2'
                          : ' fixo'}
                        )
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer bg-slate-900 px-3 py-2 rounded-xl border border-slate-700">
                    <input
                      type="checkbox"
                      checked={hasShield}
                      onChange={(e) => setHasShield(e.target.checked)}
                      className="accent-sky-500"
                    />
                    Equipar Escudo (+2 CA)
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-200">
                  Perícias Proficientes
                </div>
                <div className="text-xs text-amber-300">
                  Automáticas (Raça/Antec.): {autoSkills.length} • Escolha da Classe:{' '}
                  {classSkills.filter((s) => !autoSkills.includes(s)).length} / {maxPickableSkills}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DND_SKILLS.map((skill) => {
                  const isAuto = autoSkills.includes(skill.id);
                  const isSelected = isAuto || classSkills.includes(skill.id);
                  const mod = getAbilityMod(finalAbilities[skill.ability]) + (isSelected ? profBonus : 0);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      disabled={isAuto}
                      onClick={() => toggleClassSkill(skill.id)}
                      className={`p-2 rounded-xl border text-left text-xs flex items-center justify-between transition ${
                        isAuto
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 cursor-default'
                          : isSelected
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 cursor-pointer'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="font-medium">
                          {skill.name} {isAuto ? '★' : ''}
                        </div>
                        <div className="text-[10px] opacity-70">
                          {ABILITY_LABELS[skill.ability].short}
                          {isAuto ? ' • Antec./Raça' : ''}
                        </div>
                      </div>
                      <span className="font-mono font-bold">{formatMod(mod)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={personality.traits}
                  onChange={(e) => setPersonality((p) => ({ ...p, traits: e.target.value }))}
                  placeholder="Traço de Personalidade..."
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100"
                />
                <input
                  type="text"
                  value={personality.ideals}
                  onChange={(e) => setPersonality((p) => ({ ...p, ideals: e.target.value }))}
                  placeholder="Ideal..."
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100"
                />
                <input
                  type="text"
                  value={personality.bonds}
                  onChange={(e) => setPersonality((p) => ({ ...p, bonds: e.target.value }))}
                  placeholder="Vínculo..."
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100"
                />
                <input
                  type="text"
                  value={personality.flaws}
                  onChange={(e) => setPersonality((p) => ({ ...p, flaws: e.target.value }))}
                  placeholder="Defeito..."
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  História / Anotações (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Breve descrição do seu personagem..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-3xl">
                  {avatar}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">
                    {name.trim() || `${selectedRace.name} ${selectedClass.name}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedSubrace ? selectedSubrace.name : selectedRace.name} • {selectedClass.name} Nível {level} • {selectedBg.name} • {alignment}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-rose-400 uppercase font-semibold">Pontos de Vida</div>
                  <div className="text-2xl font-bold font-mono text-slate-100">{maxHp}</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-sky-400 uppercase font-semibold">Classe Armadura</div>
                  <div className="text-2xl font-bold font-mono text-slate-100">{estimatedAc}</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-amber-400 uppercase font-semibold">Proficiência</div>
                  <div className="text-2xl font-bold font-mono text-slate-100">+{profBonus}</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-emerald-400 uppercase font-semibold">Percep. Passiva</div>
                  <div className="text-2xl font-bold font-mono text-slate-100">
                    {10 +
                      getAbilityMod(finalAbilities.wis) +
                      (allSelectedSkills.includes('perception') ? profBonus : 0)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2 text-center">
                {ABILITY_KEYS.map((k) => (
                  <div key={k} className="bg-slate-950 border border-slate-800 rounded-xl py-2">
                    <div className="text-[10px] text-slate-400 font-bold">
                      {ABILITY_LABELS[k].short}
                    </div>
                    <div className="text-sm font-bold text-amber-300">
                      {formatMod(getAbilityMod(finalAbilities[k]))}
                    </div>
                    <div className="text-[10px] text-slate-500">{finalAbilities[k]}</div>
                  </div>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-200 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={spawnToken}
                  onChange={(e) => setSpawnToken(e.target.checked)}
                  className="accent-amber-500"
                />
                Colocar automaticamente o <strong>Token</strong> deste personagem no Tabuleiro
              </label>
            </div>
          )}
        </div>

        {/* Rodapé Navegação */}
        <div className="px-6 py-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            {step > 1 ? 'Voltar' : 'Cancelar'}
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 cursor-pointer"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Criar Ficha e Salvar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

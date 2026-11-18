import type { CharacterSheet, InventoryItem } from '../types/rpg';

/**
 * Parser inteligente para importar arquivos JSON de Personagens ou NPCs/Monstros
 * Suporta:
 * 1. Formato nativo do Aetheria VTT (exportado pelo próprio app)
 * 2. Formato Open5e / 5e SRD API (strength, dexterity, actions, armor_class, hit_points...)
 * 3. Formato genérico simplificado de ficha/NPC
 */
export function parseImportedCharacterJson(
  rawText: string,
  options: { isNpcDefault?: boolean; ownerName?: string } = {}
): CharacterSheet[] {
  const parsed = JSON.parse(rawText);
  const items = Array.isArray(parsed) ? parsed : [parsed];

  return items.map((item, idx) => normalizeCharacterObject(item, options, idx));
}

function normalizeCharacterObject(
  data: Record<string, any>,
  options: { isNpcDefault?: boolean; ownerName?: string },
  index: number
): CharacterSheet {
  const id = data.id || `char-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`;

  // Detecta atributos em diferentes formatos (nativo, Open5e, abreviado)
  const abilities = {
    str: Number(data.abilities?.str ?? data.strength ?? data.for ?? data.FOR ?? 10),
    dex: Number(data.abilities?.dex ?? data.dexterity ?? data.des ?? data.DES ?? 10),
    con: Number(data.abilities?.con ?? data.constitution ?? data.con ?? data.CON ?? 10),
    int: Number(data.abilities?.int ?? data.intelligence ?? data.int ?? data.INT ?? 10),
    wis: Number(data.abilities?.wis ?? data.wisdom ?? data.sab ?? data.SAB ?? 10),
    cha: Number(data.abilities?.cha ?? data.charisma ?? data.car ?? data.CAR ?? 10)
  };

  // Detecta HP e AC (suportando Open5e armor_class / hit_points)
  const maxHp = Number(
    data.maxHp ?? data.max_hp ?? data.hit_points ?? data.hp ?? 10
  );
  const hp = Number(data.hp ?? data.hit_points ?? maxHp);
  const ac = Number(
    Array.isArray(data.armor_class)
      ? data.armor_class[0]?.value ?? 12
      : data.ac ?? data.armor_class ?? 12
  );

  // Detecta ataques (nativo ou actions do Open5e)
  let attacks = Array.isArray(data.attacks) ? data.attacks : [];
  if (attacks.length === 0 && Array.isArray(data.actions)) {
    attacks = data.actions.map((act: any, i: number) => ({
      id: `atk-${i}-${Date.now()}`,
      name: act.name || `Ataque ${i + 1}`,
      attackBonus: Number(act.attack_bonus ?? 3),
      damageFormula: act.damage_dice || '1d6',
      damageType: act.damage_type || 'Físico'
    }));
  }

  // Detecta velocidade
  let speed = '9m';
  if (typeof data.speed === 'string') {
    speed = data.speed;
  } else if (typeof data.speed === 'object' && data.speed !== null) {
    speed = Object.entries(data.speed)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  }

  // Detecta traços / habilidades especiais
  let traits = typeof data.traits === 'string' ? data.traits : '';
  if (!traits && Array.isArray(data.special_abilities)) {
    traits = data.special_abilities
      .map((sa: any) => `${sa.name}: ${sa.desc}`)
      .join('\n');
  }

  const isNpc = data.isNpc !== undefined ? Boolean(data.isNpc) : Boolean(options.isNpcDefault ?? data.challenge_rating !== undefined);

  const level = Number(data.level || 1);

  const inventoryItems: InventoryItem[] = Array.isArray(data.inventoryItems)
    ? data.inventoryItems.map((it: any, i: number) => ({
        id: it.id || `item-imp-${i}-${Date.now()}`,
        name: String(it.name || `Item ${i + 1}`),
        quantity: Math.max(1, Number(it.quantity) || 1),
        weightKg: Math.max(0, Number(it.weightKg) || 0),
        category: it.category || 'Equipamento',
        value: it.value || '',
        description: it.description || '',
        equipped: Boolean(it.equipped)
      }))
    : Array.isArray(data.inventory)
    ? data.inventory.map((str: any, i: number) => ({
        id: `item-imp-${i}-${Date.now()}`,
        name: String(str),
        quantity: 1,
        weightKg: 1,
        category: 'Equipamento',
        equipped: false
      }))
    : [];

  const inventoryStrings: string[] = Array.isArray(data.inventory)
    ? data.inventory.map((s: any) => String(s))
    : inventoryItems.map((it) => (it.quantity > 1 ? `${it.name} (x${it.quantity})` : it.name));

  return {
    id,
    name: data.name || `Personagem Importado ${index + 1}`,
    isNpc,
    isSecretNpc: data.isSecretNpc !== undefined ? Boolean(data.isSecretNpc) : isNpc,
    ownerName: data.ownerName || options.ownerName || (isNpc ? 'Mestre' : ''),
    race: data.race || data.type || 'Humano',
    subrace: data.subrace || undefined,
    className: data.className || data.class || (isNpc ? 'NPC / Monstro' : 'Guerreiro'),
    subclass: data.subclass || undefined,
    level,
    xp: Number(data.xp ?? 0),
    background: data.background || (isNpc ? 'Importado' : 'Aventureiro'),
    alignment: data.alignment || '',
    avatar: data.avatar || (isNpc ? '👹' : '🛡️'),
    imageUrl: data.imageUrl || undefined,
    inspiration: Boolean(data.inspiration),
    abilities,
    savingThrowProficiencies: Array.isArray(data.savingThrowProficiencies)
      ? data.savingThrowProficiencies
      : [],
    skillProficiencies: Array.isArray(data.skillProficiencies)
      ? data.skillProficiencies
      : [],
    expertiseSkills: Array.isArray(data.expertiseSkills) ? data.expertiseSkills : [],
    hp,
    maxHp,
    tempHp: Number(data.tempHp || 0),
    ac,
    armorName: data.armorName || undefined,
    speed,
    hitDice: data.hitDice || data.hit_dice || `${level}d8`,
    hitDiceRemaining:
      data.hitDiceRemaining !== undefined ? Number(data.hitDiceRemaining) : level,
    deathSaves: data.deathSaves || { successes: 0, failures: 0 },
    conditions: Array.isArray(data.conditions) ? data.conditions : [],
    exhaustion: Number(data.exhaustion || 0),
    cr: data.cr || (data.challenge_rating !== undefined ? String(data.challenge_rating) : undefined),
    spellcastingAbility: data.spellcastingAbility ?? null,
    spellSlots: data.spellSlots || {},
    spellList: Array.isArray(data.spellList) ? data.spellList : [],
    attacks,
    spells: Array.isArray(data.spells) ? data.spells : [],
    inventory: inventoryStrings,
    inventoryItems,
    currency: data.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    traits,
    personality: data.personality
      ? {
          traits: String(data.personality.traits || ''),
          ideals: String(data.personality.ideals || ''),
          bonds: String(data.personality.bonds || ''),
          flaws: String(data.personality.flaws || '')
        }
      : undefined,
    notes: data.notes || data.desc || '',
    modelSlug: data.modelSlug || undefined,
    modelNameEn: data.modelNameEn || undefined,
    modelType: data.modelType || undefined
  };
}

export function exportCharacterAsJson(char: CharacterSheet) {
  const blob = new Blob([JSON.stringify(char, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${char.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSampleNpcTemplate() {
  const sample = {
    name: 'Bandido Líder (Exemplo)',
    isNpc: true,
    isSecretNpc: true,
    race: 'Humano',
    className: 'NPC Chefe',
    level: 3,
    cr: '2 (450 XP)',
    avatar: '🏴‍☠️',
    hp: 45,
    maxHp: 45,
    ac: 15,
    speed: '9m',
    abilities: {
      str: 15,
      dex: 16,
      con: 14,
      int: 12,
      wis: 11,
      cha: 14
    },
    savingThrowProficiencies: ['str', 'dex'],
    skillProficiencies: ['intimidation', 'stealth', 'deception'],
    attacks: [
      {
        id: 'atk-1',
        name: 'Cimitarra Dupla',
        attackBonus: 5,
        damageFormula: '1d6+3',
        damageType: 'Cortante'
      },
      {
        id: 'atk-2',
        name: 'Adaga Arremessada',
        attackBonus: 5,
        damageFormula: '1d4+3',
        damageType: 'Perfurante'
      }
    ],
    inventory: ['Couro Batido', '2 Cimitarras', 'Carta Selada do Vilão'],
    traits: 'Multiataque: Faz dois ataques com cimitarra. Aparar: +2 na CA contra um ataque corpo a corpo.',
    notes: 'Importe e edite este arquivo JSON para criar seus próprios NPCs rapidamente!'
  };

  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo-npc-dnd5e.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSampleCharacterTemplate() {
  const sample = {
    name: 'Kaelen Lâmina da Aurora',
    isNpc: false,
    race: 'Elfo',
    subrace: 'Alto Elfo',
    className: 'Guerreiro',
    subclass: 'Campeão',
    level: 3,
    xp: 900,
    background: 'Soldado',
    alignment: 'Neutro e Bom',
    avatar: '⚔️',
    abilities: {
      str: 16,
      dex: 14,
      con: 14,
      int: 11,
      wis: 12,
      cha: 10
    },
    savingThrowProficiencies: ['str', 'con'],
    skillProficiencies: ['athletics', 'perception', 'intimidation', 'survival'],
    expertiseSkills: [],
    hp: 28,
    maxHp: 28,
    tempHp: 0,
    ac: 18,
    armorName: 'Cota de Malha + Escudo',
    speed: '9m',
    hitDice: '3d10',
    hitDiceRemaining: 3,
    spellcastingAbility: null,
    spellSlots: {},
    spellList: [],
    attacks: [
      {
        id: 'atk-1',
        name: 'Espada Longa',
        attackBonus: 5,
        damageFormula: '1d8+3',
        damageType: 'Cortante'
      },
      {
        id: 'atk-2',
        name: 'Arco Longo',
        attackBonus: 4,
        damageFormula: '1d8+2',
        damageType: 'Perfurante'
      }
    ],
    inventoryItems: [
      {
        id: 'item-1',
        name: 'Espada Longa',
        quantity: 1,
        weightKg: 1.5,
        category: 'Arma',
        value: '15 PO',
        equipped: true
      },
      {
        id: 'item-2',
        name: 'Cota de Malha',
        quantity: 1,
        weightKg: 27.5,
        category: 'Armadura',
        value: '75 PO',
        equipped: true
      },
      {
        id: 'item-3',
        name: 'Escudo',
        quantity: 1,
        weightKg: 3,
        category: 'Armadura',
        value: '10 PO',
        equipped: true
      },
      {
        id: 'item-4',
        name: 'Poção de Cura',
        quantity: 2,
        weightKg: 0.25,
        category: 'Poção',
        value: '50 PO',
        equipped: false
      },
      {
        id: 'item-5',
        name: 'Mochila + Rações (5 dias)',
        quantity: 1,
        weightKg: 5,
        category: 'Equipamento',
        value: '5 PO',
        equipped: false
      }
    ],
    currency: {
      cp: 0,
      sp: 15,
      ep: 0,
      gp: 25,
      pp: 0
    },
    traits:
      'Visão no Escuro 18m • Retomar Fôlego (1d10+3 PV, 1x/descanso) • Surto de Ação (1x/descanso) • Crítico Aprimorado (19-20)',
    personality: {
      traits: 'Sempre analiso o terreno antes de sacar a lâmina.',
      ideals: 'Proteger os inocentes acima de qualquer recompensa.',
      bonds: 'Jurei honrar o estandarte da minha antiga companhia.',
      flaws: 'Tenho dificuldade em recuar quando um aliado está em perigo.'
    },
    notes: 'Edite os campos deste JSON e importe pelo botão "Importar JSON" na aba Fichas!'
  };

  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo-ficha-personagem-dnd5e.json';
  a.click();
  URL.revokeObjectURL(url);
}

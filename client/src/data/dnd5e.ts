import {
  Abilities,
  AbilityKey,
  CharacterSheet,
  Currency,
  InventoryItem,
  SpellItem,
  SpellSlotLevel
} from '../types/rpg';

export const ABILITY_LABELS: Record<AbilityKey, { name: string; short: string }> = {
  str: { name: 'Força', short: 'FOR' },
  dex: { name: 'Destreza', short: 'DES' },
  con: { name: 'Constituição', short: 'CON' },
  int: { name: 'Inteligência', short: 'INT' },
  wis: { name: 'Sabedoria', short: 'SAB' },
  cha: { name: 'Carisma', short: 'CAR' }
};

export interface SkillDef {
  id: string;
  name: string;
  ability: AbilityKey;
}

export const DND_SKILLS: SkillDef[] = [
  { id: 'acrobatics', name: 'Acrobacia', ability: 'dex' },
  { id: 'animal_handling', name: 'Adestrar Animais', ability: 'wis' },
  { id: 'arcana', name: 'Arcanismo', ability: 'int' },
  { id: 'athletics', name: 'Atletismo', ability: 'str' },
  { id: 'deception', name: 'Enganação', ability: 'cha' },
  { id: 'history', name: 'História', ability: 'int' },
  { id: 'insight', name: 'Intuição', ability: 'wis' },
  { id: 'intimidation', name: 'Intimidação', ability: 'cha' },
  { id: 'investigation', name: 'Investigação', ability: 'int' },
  { id: 'medicine', name: 'Medicina', ability: 'wis' },
  { id: 'nature', name: 'Natureza', ability: 'int' },
  { id: 'perception', name: 'Percepção', ability: 'wis' },
  { id: 'performance', name: 'Atuação', ability: 'cha' },
  { id: 'persuasion', name: 'Persuasão', ability: 'cha' },
  { id: 'religion', name: 'Religião', ability: 'int' },
  { id: 'sleight_of_hand', name: 'Prestidigitação', ability: 'dex' },
  { id: 'stealth', name: 'Furtividade', ability: 'dex' },
  { id: 'survival', name: 'Sobrevivência', ability: 'wis' }
];

// Tabela de Experiência por Nível (Cap. 1, p. 15)
export const XP_TABLE: number[] = [
  0, // Nível 1
  300, // Nível 2
  900, // Nível 3
  2700, // Nível 4
  6500, // Nível 5
  14000, // Nível 6
  23000, // Nível 7
  34000, // Nível 8
  48000, // Nível 9
  64000, // Nível 10
  85000, // Nível 11
  100000, // Nível 12
  120000, // Nível 13
  140000, // Nível 14
  165000, // Nível 15
  195000, // Nível 16
  225000, // Nível 17
  265000, // Nível 18
  305000, // Nível 19
  355000 // Nível 20
];

export function getNextLevelXp(level: number): number {
  const clamped = Math.max(1, Math.min(20, level));
  return clamped >= 20 ? XP_TABLE[19] : XP_TABLE[clamped];
}

export const DND_ALIGNMENTS: string[] = [
  'Leal e Bom',
  'Neutro e Bom',
  'Caótico e Bom',
  'Leal e Neutro',
  'Neutro',
  'Caótico e Neutro',
  'Leal e Mau',
  'Neutro e Mau',
  'Caótico e Mau'
];

// Ancestralidades Dracônicas (Cap. 2, p. 34)
export interface DragonAncestry {
  id: string;
  dragon: string;
  damageType: string;
  breathShape: string;
}

export const DRAGON_ANCESTRIES: DragonAncestry[] = [
  { id: 'azul', dragon: 'Azul', damageType: 'Elétrico', breathShape: 'Linha 1,5m x 9m (Salv. DES)' },
  { id: 'branco', dragon: 'Branco', damageType: 'Frio', breathShape: 'Cone 4,5m (Salv. CON)' },
  { id: 'bronze', dragon: 'Bronze', damageType: 'Elétrico', breathShape: 'Linha 1,5m x 9m (Salv. DES)' },
  { id: 'cobre', dragon: 'Cobre', damageType: 'Ácido', breathShape: 'Linha 1,5m x 9m (Salv. DES)' },
  { id: 'latão', dragon: 'Latão', damageType: 'Fogo', breathShape: 'Linha 1,5m x 9m (Salv. DES)' },
  { id: 'negro', dragon: 'Negro', damageType: 'Ácido', breathShape: 'Linha 1,5m x 9m (Salv. DES)' },
  { id: 'ouro', dragon: 'Ouro', damageType: 'Fogo', breathShape: 'Cone 4,5m (Salv. DES)' },
  { id: 'prata', dragon: 'Prata', damageType: 'Frio', breathShape: 'Cone 4,5m (Salv. CON)' },
  { id: 'verde', dragon: 'Verde', damageType: 'Veneno', breathShape: 'Cone 4,5m (Salv. CON)' },
  { id: 'vermelho', dragon: 'Vermelho', damageType: 'Fogo', breathShape: 'Cone 4,5m (Salv. DES)' }
];

// Raças e Sub-raças (Cap. 2, pp. 17–43)
export interface SubraceDef {
  id: string;
  name: string;
  bonuses: Partial<Abilities>;
  speedOverride?: string;
  hpPerLevelBonus?: number;
  extraSkills?: string[];
  extraSkillChoices?: number;
  extraAbilityChoices?: number;
  traits: string;
}

export interface RaceDef {
  id: string;
  name: string;
  speed: string;
  bonuses: Partial<Abilities>;
  traits: string;
  avatar: string;
  bonusSkills?: string[];
  extraSkillChoices?: number;
  extraAbilityChoices?: number; // ex: Meio-Elfo (+1 em dois atributos à escolha)
  subraces?: SubraceDef[];
}

export const DND_RACES: RaceDef[] = [
  {
    id: 'dwarf',
    name: 'Anão',
    speed: '7,5m',
    bonuses: { con: 2 },
    traits:
      'Visão no Escuro (18m), Resiliência Anã (vantagem/resistência contra veneno), Especialização em Rochas.',
    avatar: '🧔',
    subraces: [
      {
        id: 'hill_dwarf',
        name: 'Anão da Colina',
        bonuses: { wis: 1 },
        hpPerLevelBonus: 1,
        traits: 'Tenacidade Anã (+1 PV máximo por nível).'
      },
      {
        id: 'mountain_dwarf',
        name: 'Anão da Montanha',
        bonuses: { str: 2 },
        traits: 'Treinamento Anão em Armaduras (proficiência com armaduras leves e médias).'
      }
    ]
  },
  {
    id: 'elf',
    name: 'Elfo',
    speed: '9m',
    bonuses: { dex: 2 },
    bonusSkills: ['perception'],
    traits:
      'Visão no Escuro (18m), Sentidos Aguçados (Percepção), Ancestralidade Feérica (vantagem vs. enfeitiçar / imune a sono mágico), Transe (4h).',
    avatar: '🧝',
    subraces: [
      {
        id: 'high_elf',
        name: 'Alto Elfo',
        bonuses: { int: 1 },
        traits: 'Treinamento Élfico com Armas, 1 Truque de Mago (INT), Idioma adicional.'
      },
      {
        id: 'wood_elf',
        name: 'Elfo da Floresta',
        bonuses: { wis: 1 },
        speedOverride: '10,5m',
        traits: 'Pés Ligeiros (10,5m), Máscara da Natureza (esconder-se em folhagem/chuva/névoa).'
      },
      {
        id: 'drow',
        name: 'Elfo Negro (Drow)',
        bonuses: { cha: 1 },
        traits: 'Visão no Escuro Superior (36m), Magia Drow (Globos de Luz), Sensibilidade à Luz Solar.'
      }
    ]
  },
  {
    id: 'halfling',
    name: 'Halfling',
    speed: '7,5m',
    bonuses: { dex: 2 },
    traits:
      'Sortudo (re-rola 1 natural no d20), Bravura (vantagem contra amedrontado), Agilidade Halfling.',
    avatar: '🍀',
    subraces: [
      {
        id: 'lightfoot',
        name: 'Pés-Leves',
        bonuses: { cha: 1 },
        traits: 'Furtividade Natural (pode esconder-se atrás de criaturas maiores).'
      },
      {
        id: 'stout',
        name: 'Robusto',
        bonuses: { con: 1 },
        traits: 'Resiliência dos Robustos (vantagem e resistência contra veneno).'
      }
    ]
  },
  {
    id: 'human',
    name: 'Humano',
    speed: '9m',
    bonuses: {},
    traits: 'Versátil, adaptável e ambicioso; idiomas Comum +1 adicional.',
    avatar: '🧑',
    subraces: [
      {
        id: 'standard_human',
        name: 'Humano Padrão',
        bonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
        traits: '+1 em todos os seis valores de habilidade.'
      },
      {
        id: 'variant_human',
        name: 'Humano Alternativo',
        bonuses: {},
        extraAbilityChoices: 2,
        extraSkillChoices: 1,
        traits: '+1 em dois atributos à escolha, +1 Perícia à escolha e +1 Talento no 1º nível.'
      }
    ]
  },
  {
    id: 'dragonborn',
    name: 'Draconato',
    speed: '9m',
    bonuses: { str: 2, cha: 1 },
    traits:
      'Ancestralidade Dracônica, Arma de Sopro (2d6 elemental, CD 8+CON+Prof, recarrega em descanso), Resistência a Dano do tipo ancestral.',
    avatar: '🐲'
  },
  {
    id: 'gnome',
    name: 'Gnomo',
    speed: '7,5m',
    bonuses: { int: 2 },
    traits: 'Visão no Escuro (18m), Esperteza Gnômica (vantagem em salvaguardas INT/SAB/CAR contra magia).',
    avatar: '🎩',
    subraces: [
      {
        id: 'forest_gnome',
        name: 'Gnomo da Floresta',
        bonuses: { dex: 1 },
        traits: 'Ilusionista Nato (truque Ilusão Menor), Falar com Bestas Pequenas.'
      },
      {
        id: 'rock_gnome',
        name: 'Gnomo das Rochas',
        bonuses: { con: 1 },
        traits: 'Conhecimento de Artífice (2x proficiência em História de itens mágicos/tecnológicos), Engenhoqueiro.'
      }
    ]
  },
  {
    id: 'halfelf',
    name: 'Meio-Elfo',
    speed: '9m',
    bonuses: { cha: 2 },
    extraAbilityChoices: 2,
    extraSkillChoices: 2,
    traits:
      'Visão no Escuro (18m), Ancestralidade Feérica (vantagem vs. enfeitiçar), Versatilidade em Perícia (+2 perícias à escolha), +1 em dois atributos.',
    avatar: '🌟'
  },
  {
    id: 'halforc',
    name: 'Meio-Orc',
    speed: '9m',
    bonuses: { str: 2, con: 1 },
    bonusSkills: ['intimidation'],
    traits:
      'Visão no Escuro (18m), Ameaçador (Intimidação), Resistência Implacável (fica com 1 PV 1x/descanso longo), Ataques Selvagens (+1 dado de dano em crítico corpo a corpo).',
    avatar: '👹'
  },
  {
    id: 'tiefling',
    name: 'Tiefling',
    speed: '9m',
    bonuses: { cha: 2, int: 1 },
    traits:
      'Visão no Escuro (18m), Resistência Infernal (resistência a Fogo), Legado Infernal (Taumaturgia; Repreensão Infernal no nv.3; Escuridão no nv.5).',
    avatar: '😈'
  }
];

// Tabelas de Espaços de Magia (Cap. 3, pp. 52–115)
// Índice 0 = Nível 1 ... Índice 19 = Nível 20
const FULL_CASTER_TABLE: number[][] = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1]
];

const HALF_CASTER_TABLE: number[][] = [
  [],
  [2],
  [3],
  [3],
  [4, 2],
  [4, 2],
  [4, 3],
  [4, 3],
  [4, 3, 2],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2]
];

// Bruxo (Magia de Pacto: [qtdEspaços, círculoDoEspaço])
const WARLOCK_PACT_TABLE: [number, number][] = [
  [1, 1],
  [2, 1],
  [2, 2],
  [2, 2],
  [2, 3],
  [2, 3],
  [2, 4],
  [2, 4],
  [2, 5],
  [2, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [4, 5],
  [4, 5],
  [4, 5],
  [4, 5]
];

export type CasterType = 'full' | 'half' | 'pact' | 'none';

export interface ClassDef {
  id: string;
  name: string;
  hitDie: number;
  baseAc: number;
  saves: AbilityKey[];
  skillCount: number;
  suggestedSkills: string[];
  spellcastingAbility: AbilityKey | null;
  casterType: CasterType;
  unarmoredFormula?: 'barbarian' | 'monk' | 'draconic';
  starterArmorName: string;
  starterShield?: boolean;
  starterAttacks: { name: string; ability: AbilityKey; damageFormula: string; damageType: string }[];
  starterInventory: string[];
  starterSpells: string[];
  classSummary: string;
  avatar: string;
}

// Todas as 12 Classes Oficiais do Livro do Jogador (Cap. 3, p. 45)
export const DND_CLASSES: ClassDef[] = [
  {
    id: 'barbarian',
    name: 'Bárbaro',
    hitDie: 12,
    baseAc: 14,
    saves: ['str', 'con'],
    skillCount: 2,
    suggestedSkills: ['athletics', 'intimidation', 'survival', 'nature', 'perception'],
    spellcastingAbility: null,
    casterType: 'none',
    unarmoredFormula: 'barbarian',
    starterArmorName: 'Defesa sem Armadura (Bárbaro)',
    starterAttacks: [
      { name: 'Machado Grande', ability: 'str', damageFormula: '1d12', damageType: 'Cortante' },
      { name: 'Azagaia (Arremesso)', ability: 'str', damageFormula: '1d6', damageType: 'Perfurante' }
    ],
    starterInventory: ['Machado Grande', '2 Machadinhas', '4 Azagaias', 'Pacote de Explorador'],
    starterSpells: [],
    classSummary: 'Fúria (+2 dano corpo a corpo, resistência a dano físico), Defesa sem Armadura (10+DES+CON).',
    avatar: '🪓'
  },
  {
    id: 'bard',
    name: 'Bardo',
    hitDie: 8,
    baseAc: 13,
    saves: ['dex', 'cha'],
    skillCount: 3,
    suggestedSkills: ['performance', 'persuasion', 'deception', 'acrobatics', 'perception', 'insight'],
    spellcastingAbility: 'cha',
    casterType: 'full',
    starterArmorName: 'Armadura de Couro',
    starterAttacks: [
      { name: 'Rapieira', ability: 'dex', damageFormula: '1d8', damageType: 'Perfurante' },
      { name: 'Zombaria Viciosa (CD Car)', ability: 'cha', damageFormula: '1d4', damageType: 'Psíquico' }
    ],
    starterInventory: ['Armadura de Couro', 'Rapieira', 'Adaga', 'Alaúde', 'Pacote de Artista'],
    starterSpells: ['Zombaria Viciosa', 'Ilusão Menor', 'Palavra Curativa', 'Onda Trovejante', 'Enfeitiçar Pessoa'],
    classSummary: 'Inspiração de Bardo (d6), Conjuração (Carisma), Versátil em perícias.',
    avatar: '🎻'
  },
  {
    id: 'warlock',
    name: 'Bruxo',
    hitDie: 8,
    baseAc: 12,
    saves: ['wis', 'cha'],
    skillCount: 2,
    suggestedSkills: ['arcana', 'deception', 'intimidation', 'investigation', 'religion'],
    spellcastingAbility: 'cha',
    casterType: 'pact',
    starterArmorName: 'Armadura de Couro',
    starterAttacks: [
      { name: 'Rajada Mística', ability: 'cha', damageFormula: '1d10', damageType: 'Energia' },
      { name: 'Adaga', ability: 'dex', damageFormula: '1d4', damageType: 'Perfurante' }
    ],
    starterInventory: ['Armadura de Couro', 'Foco Arcano', '2 Adagas', 'Pacote de Estudioso'],
    starterSpells: ['Rajada Mística', 'Toque Macabro', 'Bruxaria', 'Repreensão Infernal'],
    classSummary: 'Patrono Transcendental, Magia de Pacto (recupera espaços em Descanso Curto!).',
    avatar: '🔮'
  },
  {
    id: 'cleric',
    name: 'Clérigo',
    hitDie: 8,
    baseAc: 16,
    saves: ['wis', 'cha'],
    skillCount: 2,
    suggestedSkills: ['medicine', 'religion', 'insight', 'persuasion', 'history'],
    spellcastingAbility: 'wis',
    casterType: 'full',
    starterArmorName: 'Brunea',
    starterShield: true,
    starterAttacks: [
      { name: 'Maça', ability: 'str', damageFormula: '1d6', damageType: 'Concussão' },
      { name: 'Chama Sagrada (CD Sab)', ability: 'wis', damageFormula: '1d8', damageType: 'Radiante' }
    ],
    starterInventory: ['Brunea', 'Escudo (+2 CA)', 'Maça', 'Símbolo Sagrado', 'Pacote de Sacerdote'],
    starterSpells: ['Chama Sagrada', 'Orientação', 'Curar Ferimentos', 'Bênção', 'Escudo da Fé'],
    classSummary: 'Domínio Divino, Conjuração (Sabedoria), Canalizar Divindade (Nv. 2).',
    avatar: '✝️'
  },
  {
    id: 'druid',
    name: 'Druida',
    hitDie: 8,
    baseAc: 14,
    saves: ['int', 'wis'],
    skillCount: 2,
    suggestedSkills: ['nature', 'survival', 'perception', 'animal_handling', 'medicine'],
    spellcastingAbility: 'wis',
    casterType: 'full',
    starterArmorName: 'Armadura de Couro',
    starterShield: true,
    starterAttacks: [
      { name: 'Cimitarra', ability: 'dex', damageFormula: '1d6', damageType: 'Cortante' },
      { name: 'Chicote de Espinhos', ability: 'wis', damageFormula: '1d6', damageType: 'Perfurante' }
    ],
    starterInventory: ['Armadura de Couro', 'Escudo de Madeira (+2 CA)', 'Cimitarra', 'Foco Druídico', 'Pacote de Explorador'],
    starterSpells: ['Chicote de Espinhos', 'Criar Chamas', 'Constrição', 'Palavra Curativa', 'Fogo das Fadas'],
    classSummary: 'Idioma Druídico, Conjuração (Sabedoria), Forma Selvagem (Nv. 2).',
    avatar: '🌿'
  },
  {
    id: 'sorcerer',
    name: 'Feiticeiro',
    hitDie: 6,
    baseAc: 13,
    saves: ['con', 'cha'],
    skillCount: 2,
    suggestedSkills: ['arcana', 'persuasion', 'deception', 'intimidation', 'insight'],
    spellcastingAbility: 'cha',
    casterType: 'full',
    unarmoredFormula: 'draconic',
    starterArmorName: 'Resiliência Dracônica (13 + DES)',
    starterAttacks: [
      { name: 'Raio de Fogo', ability: 'cha', damageFormula: '1d10', damageType: 'Fogo' },
      { name: 'Besta Leve', ability: 'dex', damageFormula: '1d8', damageType: 'Perfurante' }
    ],
    starterInventory: ['Foco Arcano', '2 Adagas', 'Besta Leve + 20 Virotes', 'Pacote de Explorador'],
    starterSpells: ['Raio de Fogo', 'Raio de Gelo', 'Mãos Flamejantes', 'Mísseis Mágicos', 'Escudo Arcano'],
    classSummary: 'Origem de Feitiçaria (Linhagem Dracônica/Magia Selvagem), Metamagia (Nv. 3).',
    avatar: '✨'
  },
  {
    id: 'fighter',
    name: 'Guerreiro',
    hitDie: 10,
    baseAc: 16,
    saves: ['str', 'con'],
    skillCount: 2,
    suggestedSkills: ['athletics', 'perception', 'intimidation', 'survival', 'acrobatics'],
    spellcastingAbility: null,
    casterType: 'none',
    starterArmorName: 'Cota de Malha',
    starterShield: true,
    starterAttacks: [
      { name: 'Espada Longa', ability: 'str', damageFormula: '1d8', damageType: 'Cortante' },
      { name: 'Arco Longo', ability: 'dex', damageFormula: '1d8', damageType: 'Perfurante' }
    ],
    starterInventory: ['Cota de Malha (CA 16)', 'Escudo (+2 CA)', 'Espada Longa', 'Arco Longo + 20 Flechas', 'Pacote de Aventureiro'],
    starterSpells: [],
    classSummary: 'Estilo de Luta, Retomar o Fôlego (1d10+Nv PV em ação bônus), Surto de Ação (Nv. 2).',
    avatar: '⚔️'
  },
  {
    id: 'rogue',
    name: 'Ladino',
    hitDie: 8,
    baseAc: 14,
    saves: ['dex', 'int'],
    skillCount: 4,
    suggestedSkills: ['stealth', 'sleight_of_hand', 'acrobatics', 'perception', 'deception', 'investigation'],
    spellcastingAbility: null,
    casterType: 'none',
    starterArmorName: 'Armadura de Couro Batido',
    starterAttacks: [
      { name: 'Rapieira', ability: 'dex', damageFormula: '1d8', damageType: 'Perfurante' },
      { name: 'Arco Curto + Ataque Furtivo', ability: 'dex', damageFormula: '1d6+1d6', damageType: 'Perfurante' }
    ],
    starterInventory: ['Couro Batido', 'Rapieira', 'Arco Curto + 20 Flechas', 'Ferramentas de Ladrão', '2 Adagas'],
    starterSpells: [],
    classSummary: 'Especialização (2x proficiência em 2 perícias), Ataque Furtivo (+1d6), Gíria de Ladrão.',
    avatar: '🗡️'
  },
  {
    id: 'wizard',
    name: 'Mago',
    hitDie: 6,
    baseAc: 12,
    saves: ['int', 'wis'],
    skillCount: 2,
    suggestedSkills: ['arcana', 'investigation', 'history', 'insight', 'religion'],
    spellcastingAbility: 'int',
    casterType: 'full',
    starterArmorName: 'Sem Armadura',
    starterAttacks: [
      { name: 'Raio de Fogo', ability: 'int', damageFormula: '1d10', damageType: 'Fogo' },
      { name: 'Adaga', ability: 'dex', damageFormula: '1d4', damageType: 'Perfurante' }
    ],
    starterInventory: ['Grimório', 'Foco Arcano', 'Adaga', 'Pacote de Estudioso'],
    starterSpells: ['Raio de Fogo', 'Mãos Mágicas', 'Prestidigitação', 'Armadura Arcana', 'Mísseis Mágicos', 'Detectar Magia'],
    classSummary: 'Grimório, Conjuração (Inteligência), Recuperação Arcana em Descanso Curto.',
    avatar: '🧙'
  },
  {
    id: 'monk',
    name: 'Monge',
    hitDie: 8,
    baseAc: 14,
    saves: ['str', 'dex'],
    skillCount: 2,
    suggestedSkills: ['acrobatics', 'stealth', 'insight', 'athletics', 'religion'],
    spellcastingAbility: null,
    casterType: 'none',
    unarmoredFormula: 'monk',
    starterArmorName: 'Defesa sem Armadura (Monge)',
    starterAttacks: [
      { name: 'Espada Curta', ability: 'dex', damageFormula: '1d6', damageType: 'Perfurante' },
      { name: 'Golpe Desarmado (Artes Marciais)', ability: 'dex', damageFormula: '1d4', damageType: 'Concussão' }
    ],
    starterInventory: ['Espada Curta', '10 Dardos', 'Pacote de Explorador'],
    starterSpells: [],
    classSummary: 'Defesa sem Armadura (10+DES+SAB), Artes Marciais (d4 DES + ataque desarmado bônus), Ki (Nv. 2).',
    avatar: '🥋'
  },
  {
    id: 'paladin',
    name: 'Paladino',
    hitDie: 10,
    baseAc: 18,
    saves: ['wis', 'cha'],
    skillCount: 2,
    suggestedSkills: ['athletics', 'religion', 'persuasion', 'intimidation', 'insight', 'medicine'],
    spellcastingAbility: 'cha',
    casterType: 'half',
    starterArmorName: 'Cota de Malha',
    starterShield: true,
    starterAttacks: [
      { name: 'Espada Montante', ability: 'str', damageFormula: '2d6', damageType: 'Cortante' },
      { name: 'Destruição Divina (+2d8)', ability: 'str', damageFormula: '1d8+2d8', damageType: 'Radiante' }
    ],
    starterInventory: ['Cota de Malha', 'Escudo (+2 CA)', 'Espada Longa', 'Símbolo Sagrado', '5 Azagaias'],
    starterSpells: ['Escudo da Fé', 'Destruição Colérica', 'Bênção'],
    classSummary: 'Sentido Divino, Cura pelas Mãos (5 × Nv. PV), Destruição Divina (Nv. 2).',
    avatar: '⚜️'
  },
  {
    id: 'ranger',
    name: 'Patrulheiro',
    hitDie: 10,
    baseAc: 15,
    saves: ['str', 'dex'],
    skillCount: 3,
    suggestedSkills: ['survival', 'perception', 'stealth', 'nature', 'athletics', 'investigation'],
    spellcastingAbility: 'wis',
    casterType: 'half',
    starterArmorName: 'Brunea',
    starterAttacks: [
      { name: 'Arco Longo', ability: 'dex', damageFormula: '1d8', damageType: 'Perfurante' },
      { name: 'Espada Curta', ability: 'dex', damageFormula: '1d6', damageType: 'Perfurante' }
    ],
    starterInventory: ['Brunea', 'Arco Longo + 20 Flechas', '2 Espadas Curtas', 'Pacote de Explorador'],
    starterSpells: ['Marca do Caçador', 'Bom Fruto'],
    classSummary: 'Inimigo Favorito, Explorador Natural, Conjuração (Sabedoria no Nv. 2).',
    avatar: '🏹'
  }
];

export function getSpellSlotsForClass(
  classNameOrId: string,
  level: number
): Record<number, SpellSlotLevel> {
  const cls = DND_CLASSES.find(
    (c) =>
      c.id === classNameOrId ||
      c.name.toLowerCase() === classNameOrId.toLowerCase()
  );
  if (!cls || cls.casterType === 'none') return {};

  const idx = Math.max(0, Math.min(19, level - 1));
  const slots: Record<number, SpellSlotLevel> = {};

  if (cls.casterType === 'full') {
    const row = FULL_CASTER_TABLE[idx] || [];
    row.forEach((max, i) => {
      slots[i + 1] = { max, used: 0 };
    });
  } else if (cls.casterType === 'half') {
    const row = HALF_CASTER_TABLE[idx] || [];
    row.forEach((max, i) => {
      slots[i + 1] = { max, used: 0 };
    });
  } else if (cls.casterType === 'pact') {
    const [qty, circle] = WARLOCK_PACT_TABLE[idx];
    slots[circle] = { max: qty, used: 0 };
  }

  return slots;
}

// Subclasses Oficiais do Livro do Jogador (Cap. 3)
export const SUBCLASSES_BY_CLASS: Record<string, { name: string; unlockLevel: number; summary: string }[]> = {
  Bárbaro: [
    { name: 'Caminho do Furioso', unlockLevel: 3, summary: 'Frenesi (ataque extra em ação bônus) e Fúria Implacável.' },
    { name: 'Caminho do Guerreiro Totêmico', unlockLevel: 3, summary: 'Espírito Totêmico (Urso resiste a quase tudo, Águia, Lobo).' }
  ],
  Bardo: [
    { name: 'Colégio do Conhecimento', unlockLevel: 3, summary: 'Palavras Cortantes, +3 perícias e Segredos Mágicos extras.' },
    { name: 'Colégio da Bravura', unlockLevel: 3, summary: 'Armaduras médias/escudos, Ataque Extra e Inspiração em combate.' }
  ],
  Bruxo: [
    { name: 'A Arquifada', unlockLevel: 1, summary: 'Presença Feérica, Névoa Desaparecedora e proteção contra encantamentos.' },
    { name: 'O Corruptor', unlockLevel: 1, summary: 'Bênção do Obscuro (PV temporário ao matar) e Sorte do Obscuro.' },
    { name: 'O Grande Antigo', unlockLevel: 1, summary: 'Mente Desperta (telepatia 9m) e Escudo Psíquico.' }
  ],
  Clérigo: [
    { name: 'Domínio da Vida', unlockLevel: 1, summary: 'Discípulo da Vida (+2+nível de cura) e armaduras pesadas.' },
    { name: 'Domínio da Luz', unlockLevel: 1, summary: 'Clarão Protetor e magias de fogo/radiante (Bola de Fogo!).' },
    { name: 'Domínio da Guerra', unlockLevel: 1, summary: 'Sacerdote da Guerra (ataque bônus) e armaduras/armas marciais.' },
    { name: 'Domínio da Tempestade', unlockLevel: 1, summary: 'Ira da Tormenta e Canalizar Divindade com dano elétrico/trovejante máximo.' },
    { name: 'Domínio da Enganação', unlockLevel: 1, summary: 'Bênção do Trapaceiro (vantagem Furtividade) e Duplicidade.' }
  ],
  Druida: [
    { name: 'Círculo da Lua', unlockLevel: 2, summary: 'Forma Selvagem de Combate em ação bônus (formas ND 1+ como Urso Marrom).' },
    { name: 'Círculo da Terra', unlockLevel: 2, summary: 'Recuperação Natural de espaços e magias de círculo do terreno.' }
  ],
  Feiticeiro: [
    { name: 'Linhagem Dracônica', unlockLevel: 1, summary: 'CA 13+DES, +1 PV/nível e afinidade elemental dracônica.' },
    { name: 'Magia Selvagem', unlockLevel: 1, summary: 'Marés do Caos (vantagem) e Surtos de Magia Selvagem.' }
  ],
  Guerreiro: [
    { name: 'Campeão', unlockLevel: 3, summary: 'Crítico Aprimorado (margem 19–20 no d20) e Atletismo Extraordinário.' },
    { name: 'Mestre da Batalha', unlockLevel: 3, summary: 'Manobras Táticas e Dados de Superioridade (d8).' },
    { name: 'Cavaleiro Arcano', unlockLevel: 3, summary: 'Conjuração (INT) de magias de Abjuração/Evocação e Arma Vinculada.' }
  ],
  Ladino: [
    { name: 'Ladrão', unlockLevel: 3, summary: 'Mãos Rápidas (usar objetos/ladrão em ação bônus) e Andarilho.' },
    { name: 'Assassino', unlockLevel: 3, summary: 'Vantagem e acerto CRÍTICO automático contra criaturas surpresas!' },
    { name: 'Trapaceiro Arcano', unlockLevel: 3, summary: 'Conjuração (INT) com foco em Ilusão/Encantamento e Mãos Mágicas invisíveis.' }
  ],
  Mago: [
    { name: 'Escola de Evocação', unlockLevel: 2, summary: 'Esculpir Magias (protege aliados das suas magias de área).' },
    { name: 'Escola de Abjuração', unlockLevel: 2, summary: 'Proteção Arcana (barreira mágica absorve dano).' },
    { name: 'Escola de Adivinhação', unlockLevel: 2, summary: 'Portento (substitui qualquer d20 por 2 dados pré-rolados).' },
    { name: 'Escola de Ilusão / Necromancia', unlockLevel: 2, summary: 'Especialização arcana nas magias da escola.' }
  ],
  Monge: [
    { name: 'Caminho da Mão Aberta', unlockLevel: 3, summary: 'Rajada de Golpes derruba, empurra 4,5m ou bloqueia reações.' },
    { name: 'Caminho das Sombras', unlockLevel: 3, summary: 'Artes das Sombras (Escuridão, Passos sem Pegadas) e teleporte nas sombras.' },
    { name: 'Caminho dos Quatro Elementos', unlockLevel: 3, summary: 'Disciplinas Elementais usando pontos de Ki.' }
  ],
  Paladino: [
    { name: 'Juramento da Devoção', unlockLevel: 3, summary: 'Arma Sagrada (+CAR no ataque e brilho) e proteção contra charme.' },
    { name: 'Juramento dos Anciões', unlockLevel: 3, summary: 'Ira da Natureza e Aura de Proteção contra dano mágico (Nv. 7).' },
    { name: 'Juramento da Vingança', unlockLevel: 3, summary: 'Voto de Inimizade (vantagem contra 1 alvo) e Passo Nebuloso.' }
  ],
  Patrulheiro: [
    { name: 'Caçador', unlockLevel: 3, summary: 'Matador de Colossos (+1d8 dano 1x/turno em feridos) ou Matador de Hordas.' },
    { name: 'Mestre das Bestas', unlockLevel: 3, summary: 'Companheiro Animal (Lobo, Pantera, Águia) luta ao seu lado.' }
  ]
};

// Todos os 13 Antecedentes Oficiais (Cap. 4, pp. 127–141)
export interface BackgroundDef {
  id: string;
  name: string;
  skills: string[];
  feature: string;
  equipment: string;
}

export const DND_BACKGROUNDS: BackgroundDef[] = [
  {
    id: 'acolyte',
    name: 'Acólito',
    skills: ['insight', 'religion'],
    feature: 'Abrigo dos Fiéis',
    equipment: 'Símbolo sagrado, livro de preces, 5 varetas de incenso, vestes comuns, 15 po'
  },
  {
    id: 'guild_artisan',
    name: 'Artesão de Guilda',
    skills: ['insight', 'persuasion'],
    feature: 'Associado da Guilda',
    equipment: 'Ferramentas de artesão, carta de apresentação da guilda, roupas de viajante, 15 po'
  },
  {
    id: 'entertainer',
    name: 'Artista',
    skills: ['acrobatics', 'performance'],
    feature: 'Pela Demanda Popular',
    equipment: 'Instrumento musical, favor de um admirador, traje de apresentação, 15 po'
  },
  {
    id: 'charlatan',
    name: 'Charlatão',
    skills: ['deception', 'sleight_of_hand'],
    feature: 'Identidade Falsa',
    equipment: 'Roupas finas, kit de disfarce, ferramentas de trapaça, 15 po'
  },
  {
    id: 'criminal',
    name: 'Criminoso',
    skills: ['deception', 'stealth'],
    feature: 'Contato Criminal',
    equipment: 'Pé de cabra, roupas escuras com capuz, 15 po'
  },
  {
    id: 'hermit',
    name: 'Eremita',
    skills: ['medicine', 'religion'],
    feature: 'Descoberta',
    equipment: 'Estojo de pergaminho com notas, cobertor de inverno, kit de herbalismo, 5 po'
  },
  {
    id: 'outlander',
    name: 'Forasteiro',
    skills: ['athletics', 'survival'],
    feature: 'Andarilho',
    equipment: 'Bordão, armadilha de caça, troféu de animal, roupas de viajante, 10 po'
  },
  {
    id: 'folk_hero',
    name: 'Herói do Povo',
    skills: ['animal_handling', 'survival'],
    feature: 'Hospitalidade Rústica',
    equipment: 'Ferramentas de artesão, pá, panela de ferro, roupas comuns, 10 po'
  },
  {
    id: 'sailor',
    name: 'Marinheiro',
    skills: ['athletics', 'perception'],
    feature: 'Passagem de Navio',
    equipment: 'Clava, 15m de corda de seda, amuleto da sorte, roupas comuns, 10 po'
  },
  {
    id: 'noble',
    name: 'Nobre',
    skills: ['history', 'persuasion'],
    feature: 'Posição Privilegiada',
    equipment: 'Roupas finas, anel de sinete, pergaminho de linhagem, 25 po'
  },
  {
    id: 'urchin',
    name: 'Órfão',
    skills: ['stealth', 'sleight_of_hand'],
    feature: 'Segredos da Cidade',
    equipment: 'Faca pequena, mapa da cidade, rato de estimação, roupas comuns, 10 po'
  },
  {
    id: 'sage',
    name: 'Sábio',
    skills: ['arcana', 'history'],
    feature: 'Pesquisador',
    equipment: 'Vidro de tinta, pena, faca pequena, carta com pergunta irrespondida, 10 po'
  },
  {
    id: 'soldier',
    name: 'Soldado',
    skills: ['athletics', 'intimidation'],
    feature: 'Patente Militar',
    equipment: 'Insígnia de patente, troféu de inimigo, conjunto de dados/cartas, roupas comuns, 10 po'
  }
];

// Armaduras Oficiais (Cap. 5, p. 145)
export interface ArmorDef {
  id: string;
  name: string;
  category: 'none' | 'light' | 'medium' | 'heavy' | 'unarmored';
  baseAc: number;
  maxDexBonus: number | null; // null = sem limite; 2 = média; 0 = pesada
  stealthDisadvantage?: boolean;
  minStr?: number;
  cost: string;
}

export const DND_ARMORS: ArmorDef[] = [
  { id: 'none', name: 'Sem Armadura', category: 'none', baseAc: 10, maxDexBonus: null, cost: '—' },
  { id: 'padded', name: 'Acolchoada', category: 'light', baseAc: 11, maxDexBonus: null, stealthDisadvantage: true, cost: '5 po' },
  { id: 'leather', name: 'Armadura de Couro', category: 'light', baseAc: 11, maxDexBonus: null, cost: '10 po' },
  { id: 'studded', name: 'Armadura de Couro Batido', category: 'light', baseAc: 12, maxDexBonus: null, cost: '45 po' },
  { id: 'hide', name: 'Gibão de Peles', category: 'medium', baseAc: 12, maxDexBonus: 2, cost: '10 po' },
  { id: 'chain_shirt', name: 'Camisão de Malha', category: 'medium', baseAc: 13, maxDexBonus: 2, cost: '50 po' },
  { id: 'scale_mail', name: 'Brunea', category: 'medium', baseAc: 14, maxDexBonus: 2, stealthDisadvantage: true, cost: '50 po' },
  { id: 'breastplate', name: 'Peitoral', category: 'medium', baseAc: 14, maxDexBonus: 2, cost: '400 po' },
  { id: 'half_plate', name: 'Meia-Armadura', category: 'medium', baseAc: 15, maxDexBonus: 2, stealthDisadvantage: true, cost: '750 po' },
  { id: 'ring_mail', name: 'Cota de Anéis', category: 'heavy', baseAc: 14, maxDexBonus: 0, stealthDisadvantage: true, cost: '30 po' },
  { id: 'chain_mail', name: 'Cota de Malha', category: 'heavy', baseAc: 16, maxDexBonus: 0, stealthDisadvantage: true, minStr: 13, cost: '75 po' },
  { id: 'splint', name: 'Cota de Talas', category: 'heavy', baseAc: 17, maxDexBonus: 0, stealthDisadvantage: true, minStr: 15, cost: '200 po' },
  { id: 'plate', name: 'Armadura de Placas', category: 'heavy', baseAc: 18, maxDexBonus: 0, stealthDisadvantage: true, minStr: 15, cost: '1.500 po' },
  { id: 'unarmored_barbarian', name: 'Defesa sem Armadura (Bárbaro)', category: 'unarmored', baseAc: 10, maxDexBonus: null, cost: 'Classe' },
  { id: 'unarmored_monk', name: 'Defesa sem Armadura (Monge)', category: 'unarmored', baseAc: 10, maxDexBonus: null, cost: 'Classe' },
  { id: 'draconic', name: 'Resiliência Dracônica (13 + DES)', category: 'unarmored', baseAc: 13, maxDexBonus: null, cost: 'Classe' }
];

export function calcArmorClass(
  armorName: string,
  abilities: Abilities,
  hasShield = false
): number {
  const dexMod = getAbilityMod(abilities.dex);
  const conMod = getAbilityMod(abilities.con);
  const wisMod = getAbilityMod(abilities.wis);
  const shieldBonus = hasShield ? 2 : 0;

  const armor = DND_ARMORS.find((a) => a.name === armorName || a.id === armorName);
  if (!armor) {
    return 10 + dexMod + shieldBonus;
  }

  if (armor.id === 'unarmored_barbarian') {
    return 10 + dexMod + conMod + shieldBonus;
  }
  if (armor.id === 'unarmored_monk') {
    // Monge não usa escudo na Defesa sem Armadura
    return 10 + dexMod + wisMod;
  }
  if (armor.id === 'draconic') {
    return 13 + dexMod + shieldBonus;
  }

  const appliedDex =
    armor.maxDexBonus === null ? dexMod : Math.min(armor.maxDexBonus, dexMod);
  return armor.baseAc + appliedDex + shieldBonus;
}

// Armas Populares do Cap. 5 (p. 149)
export interface WeaponDef {
  name: string;
  damageFormula: string;
  damageType: string;
  ability: AbilityKey;
  properties: string;
}

export const DND_WEAPONS: WeaponDef[] = [
  { name: 'Adaga', damageFormula: '1d4', damageType: 'Perfurante', ability: 'dex', properties: 'Acuidade, Leve, Arremesso (6/18m)' },
  { name: 'Clava Grande', damageFormula: '1d8', damageType: 'Concussão', ability: 'str', properties: 'Duas Mãos' },
  { name: 'Machadinha', damageFormula: '1d6', damageType: 'Cortante', ability: 'str', properties: 'Leve, Arremesso (6/18m)' },
  { name: 'Maça', damageFormula: '1d6', damageType: 'Concussão', ability: 'str', properties: 'Simples' },
  { name: 'Bordão', damageFormula: '1d6', damageType: 'Concussão', ability: 'str', properties: 'Versátil (1d8)' },
  { name: 'Arco Curto', damageFormula: '1d6', damageType: 'Perfurante', ability: 'dex', properties: 'Munição (24/96m), Duas Mãos' },
  { name: 'Besta Leve', damageFormula: '1d8', damageType: 'Perfurante', ability: 'dex', properties: 'Munição (24/96m), Recarga' },
  { name: 'Espada Curta', damageFormula: '1d6', damageType: 'Perfurante', ability: 'dex', properties: 'Acuidade, Leve' },
  { name: 'Espada Longa', damageFormula: '1d8', damageType: 'Cortante', ability: 'str', properties: 'Versátil (1d10)' },
  { name: 'Espada Montante', damageFormula: '2d6', damageType: 'Cortante', ability: 'str', properties: 'Pesada, Duas Mãos' },
  { name: 'Machado de Batalha', damageFormula: '1d8', damageType: 'Cortante', ability: 'str', properties: 'Versátil (1d10)' },
  { name: 'Machado Grande', damageFormula: '1d12', damageType: 'Cortante', ability: 'str', properties: 'Pesada, Duas Mãos' },
  { name: 'Martelo de Guerra', damageFormula: '1d8', damageType: 'Concussão', ability: 'str', properties: 'Versátil (1d10)' },
  { name: 'Rapieira', damageFormula: '1d8', damageType: 'Perfurante', ability: 'dex', properties: 'Acuidade' },
  { name: 'Cimitarra', damageFormula: '1d6', damageType: 'Cortante', ability: 'dex', properties: 'Acuidade, Leve' },
  { name: 'Alabarda', damageFormula: '1d10', damageType: 'Cortante', ability: 'str', properties: 'Alcance, Pesada, Duas Mãos' },
  { name: 'Arco Longo', damageFormula: '1d8', damageType: 'Perfurante', ability: 'dex', properties: 'Munição (45/180m), Pesada' },
  { name: 'Besta Pesada', damageFormula: '1d10', damageType: 'Perfurante', ability: 'dex', properties: 'Munição (30/120m), Pesada, Recarga' }
];

// Condições Oficiais (Apêndice A, pp. 291–293)
export interface ConditionDef {
  id: string;
  name: string;
  short: string;
  icon: string;
  summary: string;
}

export const DND_CONDITIONS: ConditionDef[] = [
  { id: 'Agarrado', name: 'Agarrado', short: 'AGR', icon: '✊', summary: 'Deslocamento reduzido a 0.' },
  { id: 'Amedrontado', name: 'Amedrontado', short: 'AMD', icon: '😱', summary: 'Desvantagem em testes/ataques enquanto vê a fonte.' },
  { id: 'Atordoado', name: 'Atordoado', short: 'ATD', icon: '💫', summary: 'Incapacitado; falha FOR/DES; ataques têm vantagem.' },
  { id: 'Caído', name: 'Caído', short: 'CAI', icon: '🛌', summary: 'Desvantagem ao atacar; corpo a corpo contra você tem vantagem.' },
  { id: 'Cego', name: 'Cego', short: 'CEG', icon: '🙈', summary: 'Falha testes de visão; ataques com desvantagem.' },
  { id: 'Enfeitiçado', name: 'Enfeitiçado', short: 'ENF', icon: '💖', summary: 'Não pode atacar quem o enfeitiçou.' },
  { id: 'Envenenado', name: 'Envenenado', short: 'ENV', icon: '🤢', summary: 'Desvantagem em jogadas de ataque e testes de habilidade.' },
  { id: 'Impedido', name: 'Impedido', short: 'IMP', icon: '⛓️', summary: 'Deslocamento 0; ataques contra você têm vantagem; desvantagem em DES.' },
  { id: 'Incapacitado', name: 'Incapacitado', short: 'INC', icon: '🚫', summary: 'Não pode realizar ações ou reações.' },
  { id: 'Inconsciente', name: 'Inconsciente', short: 'INCON', icon: '💤', summary: 'Incapacitado, caído, falha FOR/DES; ataques corpo a corpo críticos!' },
  { id: 'Invisível', name: 'Invisível', short: 'INV', icon: '👻', summary: 'Seus ataques têm vantagem; ataques contra você têm desvantagem.' },
  { id: 'Paralisado', name: 'Paralisado', short: 'PAR', icon: '⚡', summary: 'Incapacitado; ataques a 1,5m são acertos críticos.' },
  { id: 'Petrificado', name: 'Petrificado', short: 'PET', icon: '🗿', summary: 'Peso x10, resistência a todo dano, imune a veneno/doença.' },
  { id: 'Surdo', name: 'Surdo', short: 'SRD', icon: '🙉', summary: 'Não pode ouvir e falha automaticamente testes de audição.' }
];

export const EXHAUSTION_LEVELS: Record<number, string> = {
  0: 'Sem Exaustão',
  1: 'Nível 1: Desvantagem em testes de habilidade',
  2: 'Nível 2: Deslocamento reduzido à metade',
  3: 'Nível 3: Desvantagem em ataques e salvaguardas',
  4: 'Nível 4: Máximo de PV reduzido à metade',
  5: 'Nível 5: Deslocamento reduzido a 0',
  6: 'Nível 6: Morte'
};

// Catálogo Oficial de Itens, Poções, Equipamentos e Tesouros (Cap. 5, pp. 143–157)
export interface CatalogItem {
  id: string;
  name: string;
  category: 'Arma' | 'Armadura' | 'Poção' | 'Equipamento' | 'Mágico / Tesouro';
  weightKg: number;
  value: string;
  description: string;
}

export const DND_ITEMS: CatalogItem[] = [
  // Poções & Consumíveis
  { id: 'it-pocao-cura', name: 'Poção de Cura', category: 'Poção', weightKg: 0.25, value: '50 po', description: 'Recupera 2d4 + 2 Pontos de Vida ao beber (1 ação).' },
  { id: 'it-pocao-cura-maior', name: 'Poção de Cura Maior', category: 'Poção', weightKg: 0.25, value: '150 po', description: 'Recupera 4d4 + 4 Pontos de Vida ao beber.' },
  { id: 'it-pocao-cura-superior', name: 'Poção de Cura Superior', category: 'Poção', weightKg: 0.25, value: '450 po', description: 'Recupera 8d4 + 8 Pontos de Vida ao beber.' },
  { id: 'it-antidoto', name: 'Antídoto (Frasco)', category: 'Poção', weightKg: 0.1, value: '50 po', description: 'Vantagem em salvaguardas contra veneno por 1 hora.' },
  { id: 'it-agua-benta', name: 'Água Benta (Frasco)', category: 'Poção', weightKg: 0.5, value: '25 po', description: 'Arremesso (6m): causa 2d6 de dano radiante em mortos-vivos/corruptores.' },
  { id: 'it-fogo-alquimico', name: 'Fogo Alquímico (Frasco)', category: 'Poção', weightKg: 0.5, value: '50 po', description: 'Arremesso (6m): 1d4 de dano de fogo por turno até apagar.' },
  { id: 'it-racoes', name: 'Ração de Viagem (1 dia)', category: 'Equipamento', weightKg: 1, value: '5 pp', description: 'Alimento seco para um dia de viagem.' },
  // Equipamentos de Aventura
  { id: 'it-mochila', name: 'Mochila', category: 'Equipamento', weightKg: 2.5, value: '2 po', description: 'Suporta até 15 kg ou 30 litros de equipamento.' },
  { id: 'it-corda-canhamo', name: 'Corda de Cânhamo (15m)', category: 'Equipamento', weightKg: 5, value: '1 po', description: 'Corda resistente (CD 17 FOR para arrebentar).' },
  { id: 'it-corda-seda', name: 'Corda de Seda (15m)', category: 'Equipamento', weightKg: 2.5, value: '10 po', description: 'Leve e resistente (CD 17 FOR para arrebentar).' },
  { id: 'it-tocha', name: 'Tocha', category: 'Equipamento', weightKg: 0.5, value: '1 pc', description: 'Ilumina 6m luz plena + 6m penumbra por 1 hora.' },
  { id: 'it-lanterna', name: 'Lanterna Furta-Fogo', category: 'Equipamento', weightKg: 1, value: '10 po', description: 'Cone de 18m luz plena + 18m penumbra por 6h com 1 frasco de óleo.' },
  { id: 'it-saco-dormir', name: 'Saco de Dormir', category: 'Equipamento', weightKg: 3.5, value: '1 po', description: 'Essencial para descanso longo confortável ao relento.' },
  { id: 'it-cantil', name: 'Cantil (Cheio)', category: 'Equipamento', weightKg: 2.5, value: '2 pp', description: 'Contém até 2 litros de água.' },
  { id: 'it-ferramentas-ladrao', name: 'Ferramentas de Ladrão', category: 'Equipamento', weightKg: 0.5, value: '25 po', description: 'Gazuas, espelho e pinças para abrir fechaduras e desarmar armadilhas.' },
  { id: 'it-kit-curandeiro', name: 'Kit de Curandeiro (10 usos)', category: 'Equipamento', weightKg: 1.5, value: '5 po', description: 'Estabiliza criatura com 0 PV sem precisar de teste de Medicina.' },
  { id: 'it-pe-de-cabra', name: 'Pé de Cabra', category: 'Equipamento', weightKg: 2.5, value: '2 po', description: 'Concede vantagem em testes de Força para alavancar.' },
  { id: 'it-foco-arcano', name: 'Foco Arcano (Orbe/Cajado)', category: 'Equipamento', weightKg: 0.5, value: '10 po', description: 'Substitui componentes materiais sem custo em magias.' },
  { id: 'it-simbolo-sagrado', name: 'Símbolo Sagrado', category: 'Equipamento', weightKg: 0.5, value: '5 po', description: 'Foco de conjuração para Clérigos e Paladinos.' },
  { id: 'it-grimorio', name: 'Grimório', category: 'Equipamento', weightKg: 1.5, value: '50 po', description: 'Livro encadernado em couro para registrar magias de Mago.' },
  { id: 'it-algemas', name: 'Algemas de Ferro', category: 'Equipamento', weightKg: 3, value: '2 po', description: 'Prende criatura Média ou Pequena (CD 20 DES ou FOR).' },
  // Armas
  { id: 'it-adaga', name: 'Adaga', category: 'Arma', weightKg: 0.5, value: '2 po', description: '1d4 perfurante (Acuidade, Leve, Arremesso 6/18m).' },
  { id: 'it-espada-curta', name: 'Espada Curta', category: 'Arma', weightKg: 1, value: '10 po', description: '1d6 perfurante (Acuidade, Leve).' },
  { id: 'it-espada-longa', name: 'Espada Longa', category: 'Arma', weightKg: 1.5, value: '15 po', description: '1d8 cortante (Versátil 1d10).' },
  { id: 'it-espada-montante', name: 'Espada Montante', category: 'Arma', weightKg: 3, value: '50 po', description: '2d6 cortante (Pesada, Duas Mãos).' },
  { id: 'it-machado-grande', name: 'Machado Grande', category: 'Arma', weightKg: 3.5, value: '30 po', description: '1d12 cortante (Pesada, Duas Mãos).' },
  { id: 'it-rapieira', name: 'Rapieira', category: 'Arma', weightKg: 1, value: '25 po', description: '1d8 perfurante (Acuidade).' },
  { id: 'it-maca', name: 'Maça', category: 'Arma', weightKg: 2, value: '5 po', description: '1d6 concussão.' },
  { id: 'it-arco-longo', name: 'Arco Longo', category: 'Arma', weightKg: 1, value: '50 po', description: '1d8 perfurante (Munição 45/180m, Pesada).' },
  { id: 'it-aljava-flechas', name: 'Aljava c/ 20 Flechas', category: 'Arma', weightKg: 0.5, value: '1 po', description: 'Munição padrão para arcos.' },
  // Armaduras & Escudos
  { id: 'it-couro', name: 'Armadura de Couro', category: 'Armadura', weightKg: 5, value: '10 po', description: 'Armadura Leve (CA 11 + DES).' },
  { id: 'it-couro-batido', name: 'Armadura de Couro Batido', category: 'Armadura', weightKg: 6.5, value: '45 po', description: 'Armadura Leve (CA 12 + DES).' },
  { id: 'it-brunea', name: 'Brunea', category: 'Armadura', weightKg: 22.5, value: '50 po', description: 'Armadura Média (CA 14 + DES máx 2, Desv. Furtividade).' },
  { id: 'it-cota-malha', name: 'Cota de Malha', category: 'Armadura', weightKg: 27.5, value: '75 po', description: 'Armadura Pesada (CA 16, requer FOR 13, Desv. Furtividade).' },
  { id: 'it-placas', name: 'Armadura de Placas', category: 'Armadura', weightKg: 32.5, value: '1.500 po', description: 'Armadura Pesada (CA 18, requer FOR 15, Desv. Furtividade).' },
  { id: 'it-escudo', name: 'Escudo', category: 'Armadura', weightKg: 3, value: '10 po', description: '+2 na Classe de Armadura enquanto empunhado.' },
  // Itens Mágicos & Tesouros (Recompensas)
  { id: 'it-bolsa-carga', name: 'Bolsa de Carga (Bag of Holding)', category: 'Mágico / Tesouro', weightKg: 7.5, value: 'Raro', description: 'Interior extradimensional suporta até 250 kg pesando sempre apenas 7,5 kg.' },
  { id: 'it-anel-protecao', name: 'Anel de Proteção', category: 'Mágico / Tesouro', weightKg: 0.05, value: 'Raro', description: 'Sintonização: +1 na CA e em todas as Salvaguardas.' },
  { id: 'it-capa-protecao', name: 'Capa da Proteção', category: 'Mágico / Tesouro', weightKg: 0.5, value: 'Incomum', description: 'Sintonização: +1 na CA e em todas as Salvaguardas.' },
  { id: 'it-botas-elficas', name: 'Botas Élficas', category: 'Mágico / Tesouro', weightKg: 0.5, value: 'Incomum', description: 'Vantagem em Destreza (Furtividade) para se mover em silêncio.' },
  { id: 'it-arma-mais1', name: 'Arma Mágica +1', category: 'Mágico / Tesouro', weightKg: 1.5, value: 'Incomum', description: '+1 nas jogadas de ataque e dano mágico.' },
  { id: 'it-escudo-mais1', name: 'Escudo Mágico +1', category: 'Mágico / Tesouro', weightKg: 3, value: 'Incomum', description: '+3 na CA total (+2 base +1 mágico).' },
  { id: 'it-pergaminho-magico', name: 'Pergaminho de Magia (1º Círculo)', category: 'Mágico / Tesouro', weightKg: 0.05, value: '50 po', description: 'Permite conjurar a magia inscrita sem gastar espaço.' },
  { id: 'it-rubi', name: 'Gema Preciosa (Rubi / Safira)', category: 'Mágico / Tesouro', weightKg: 0.05, value: '100 po', description: 'Pedra preciosa valiosa para venda ou componentes.' },
  { id: 'it-chave-antiga', name: 'Chave Rúnica Antiga', category: 'Mágico / Tesouro', weightKg: 0.1, value: 'Especial', description: 'Chave misteriosa encontrada com inimigos ou cofres.' }
];

export function getInventoryItems(char: CharacterSheet): InventoryItem[] {
  if (Array.isArray(char.inventoryItems) && char.inventoryItems.length > 0) {
    return char.inventoryItems;
  }
  if (!Array.isArray(char.inventory) || char.inventory.length === 0) {
    return [];
  }
  return char.inventory.map((raw, idx) => {
    const lower = raw.toLowerCase();
    const matched = DND_ITEMS.find(
      (it) => lower.includes(it.name.toLowerCase()) || it.name.toLowerCase().includes(lower)
    );
    return {
      id: `item-legacy-${idx}`,
      name: raw,
      quantity: 1,
      weightKg: matched?.weightKg ?? 1,
      category: matched?.category ?? 'Equipamento',
      value: matched?.value,
      description: matched?.description,
      equipped: false
    };
  });
}

export function getCoinsWeightKg(currency?: Currency): number {
  if (!currency) return 0;
  const totalCoins =
    (currency.cp || 0) +
    (currency.sp || 0) +
    (currency.ep || 0) +
    (currency.gp || 0) +
    (currency.pp || 0);
  // Regra PHB p. 143: 50 moedas pesam 0,5 kg (0,01 kg por moeda)
  return +(totalCoins * 0.01).toFixed(2);
}

export function getTotalGoldEquivalent(currency?: Currency): number {
  if (!currency) return 0;
  const total =
    (currency.cp || 0) * 0.01 +
    (currency.sp || 0) * 0.1 +
    (currency.ep || 0) * 0.5 +
    (currency.gp || 0) +
    (currency.pp || 0) * 10;
  return +total.toFixed(2);
}

export function getMaxCarryWeightKg(strScore: number): number {
  return +(Math.max(1, strScore) * 7.5).toFixed(1);
}

export function getTotalCarryWeightKg(char: CharacterSheet): number {
  const items = getInventoryItems(char);
  const itemsWeight = items.reduce(
    (sum, it) => sum + (Number(it.weightKg) || 0) * (Number(it.quantity) || 1),
    0
  );
  return +(itemsWeight + getCoinsWeightKg(char.currency)).toFixed(2);
}

export function getEncumbranceInfo(totalKg: number, strScore: number) {
  const maxKg = getMaxCarryWeightKg(strScore);
  const pct = maxKg > 0 ? Math.min(100, Math.round((totalKg / maxKg) * 100)) : 100;
  // Regra variante/padrão baseada em Força:
  // Normal <= FOR * 2,5 kg? No padrão PHB: máximo é FOR * 7,5 kg; opcionalmente Pesado > 2,5*FOR, Muito Pesado > 5*FOR
  const heavyThreshold = +(strScore * 2.5).toFixed(1);
  const veryHeavyThreshold = +(strScore * 5).toFixed(1);

  if (totalKg > maxKg) {
    return {
      status: 'Sobrecarregado (Acima do Limite!)',
      detail: `Excedeu ${maxKg} kg: deslocamento cai para 1,5 m.`,
      tone: 'rose' as const,
      pct: 100,
      maxKg
    };
  }
  if (totalKg > veryHeavyThreshold) {
    return {
      status: 'Muito Pesado',
      detail: `Acima de ${veryHeavyThreshold} kg (regra opcional: -6 m desloc. e desvantagem).`,
      tone: 'orange' as const,
      pct,
      maxKg
    };
  }
  if (totalKg > heavyThreshold) {
    return {
      status: 'Carga Pesada',
      detail: `Acima de ${heavyThreshold} kg (regra opcional: -3 m desloc.).`,
      tone: 'amber' as const,
      pct,
      maxKg
    };
  }
  return {
    status: 'Carga Leve',
    detail: `Capacidade máxima: ${maxKg} kg (FOR ${strScore} × 7,5 kg).`,
    tone: 'emerald' as const,
    pct,
    maxKg
  };
}

// Catálogo de Magias Essenciais do Cap. 11 (Truques a 5º Círculo)
export const DND_SPELLS: SpellItem[] = [
  {
    id: 'sp-raio-de-fogo',
    name: 'Raio de Fogo',
    level: 0,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '36m',
    duration: 'Instantânea',
    isAttack: true,
    damageFormula: '1d10',
    damageType: 'Fogo',
    description: 'Ataque mágico à distância; causa 1d10 de dano de fogo (escala no nv. 5, 11, 17).'
  },
  {
    id: 'sp-rajada-mistica',
    name: 'Rajada Mística',
    level: 0,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '36m',
    duration: 'Instantânea',
    isAttack: true,
    damageFormula: '1d10',
    damageType: 'Energia',
    description: 'Raio de energia crepitante; ataque mágico à distância causando 1d10 de energia.'
  },
  {
    id: 'sp-chama-sagrada',
    name: 'Chama Sagrada',
    level: 0,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '18m',
    duration: 'Instantânea',
    saveAbility: 'dex',
    damageFormula: '1d8',
    damageType: 'Radiante',
    description: 'Alvo faz Salvaguarda de DES contra sua CD de magia ou sofre 1d8 de dano radiante (ignora cobertura).'
  },
  {
    id: 'sp-zombaria-viciosa',
    name: 'Zombaria Viciosa',
    level: 0,
    school: 'Encantamento',
    castingTime: '1 ação',
    range: '18m',
    duration: 'Instantânea',
    saveAbility: 'wis',
    damageFormula: '1d4',
    damageType: 'Psíquico',
    description: 'Salvaguarda de SAB ou sofre 1d4 psíquico e tem desvantagem no próximo ataque.'
  },
  {
    id: 'sp-chicote-espinhos',
    name: 'Chicote de Espinhos',
    level: 0,
    school: 'Transmutação',
    castingTime: '1 ação',
    range: '9m',
    duration: 'Instantânea',
    isAttack: true,
    damageFormula: '1d6',
    damageType: 'Perfurante',
    description: 'Ataque mágico corpo a corpo; puxa criaturas Grandes ou menores até 3m.'
  },
  {
    id: 'sp-maos-magicas',
    name: 'Mãos Mágicas',
    level: 0,
    school: 'Conjuração',
    castingTime: '1 ação',
    range: '9m',
    duration: '1 minuto',
    description: 'Cria mão espectral que manipula objetos de até 5 kg.'
  },
  {
    id: 'sp-misseis-magicos',
    name: 'Mísseis Mágicos',
    level: 1,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '36m',
    duration: 'Instantânea',
    damageFormula: '3d4+3',
    damageType: 'Energia',
    description: '3 dardos que acertam automaticamente! Cada dardo causa 1d4+1 de dano de energia.'
  },
  {
    id: 'sp-curar-ferimentos',
    name: 'Curar Ferimentos',
    level: 1,
    school: 'Evocação',
    castingTime: '1 ação',
    range: 'Toque',
    duration: 'Instantânea',
    damageFormula: '1d8',
    damageType: 'Cura',
    description: 'Criatura tocada recupera 1d8 + seu modificador de conjuração em PV.'
  },
  {
    id: 'sp-palavra-curativa',
    name: 'Palavra Curativa',
    level: 1,
    school: 'Evocação',
    castingTime: '1 ação bônus',
    range: '18m',
    duration: 'Instantânea',
    damageFormula: '1d4',
    damageType: 'Cura',
    description: 'À distância em ação bônus: alvo visível recupera 1d4 + mod de conjuração em PV.'
  },
  {
    id: 'sp-escudo-arcano',
    name: 'Escudo Arcano',
    level: 1,
    school: 'Abjuração',
    castingTime: '1 reação',
    range: 'Pessoal',
    duration: '1 rodada',
    description: '+5 na CA até o início do seu próximo turno e imunidade a Mísseis Mágicos.'
  },
  {
    id: 'sp-armadura-arcana',
    name: 'Armadura Arcana',
    level: 1,
    school: 'Abjuração',
    castingTime: '1 ação',
    range: 'Toque',
    duration: '8 horas',
    description: 'Para alvos sem armadura: CA base se torna 13 + modificador de DES.'
  },
  {
    id: 'sp-bencao',
    name: 'Bênção',
    level: 1,
    school: 'Encantamento',
    castingTime: '1 ação',
    range: '9m',
    duration: '1 minuto',
    concentration: true,
    description: 'Até 3 criaturas somam +1d4 em jogadas de ataque e salvaguardas.'
  },
  {
    id: 'sp-maos-flamejantes',
    name: 'Mãos Flamejantes',
    level: 1,
    school: 'Evocação',
    castingTime: '1 ação',
    range: 'Cone 4,5m',
    duration: 'Instantânea',
    saveAbility: 'dex',
    damageFormula: '3d6',
    damageType: 'Fogo',
    description: 'Cone de 4,5m; Salvaguarda de DES ou sofre 3d6 de dano de fogo (metade se passar).'
  },
  {
    id: 'sp-onda-trovejante',
    name: 'Onda Trovejante',
    level: 1,
    school: 'Evocação',
    castingTime: '1 ação',
    range: 'Cubo 4,5m',
    duration: 'Instantânea',
    saveAbility: 'con',
    damageFormula: '2d8',
    damageType: 'Trovejante',
    description: 'Salvaguarda de CON ou sofre 2d8 de dano trovejante e é empurrado 3m.'
  },
  {
    id: 'sp-bruxaria',
    name: 'Bruxaria (Hex)',
    level: 1,
    school: 'Encantamento',
    castingTime: '1 ação bônus',
    range: '27m',
    duration: '1 hora',
    concentration: true,
    damageFormula: '1d6',
    damageType: 'Necrótico',
    description: '+1d6 necrótico extra em cada ataque seu contra o alvo e desvantagem em 1 atributo.'
  },
  {
    id: 'sp-passo-nebuloso',
    name: 'Passo Nebuloso',
    level: 2,
    school: 'Conjuração',
    castingTime: '1 ação bônus',
    range: 'Pessoal',
    duration: 'Instantânea',
    description: 'Teleporta-se até 9m para um espaço desocupado visível.'
  },
  {
    id: 'sp-arma-espiritual',
    name: 'Arma Espiritual',
    level: 2,
    school: 'Evocação',
    castingTime: '1 ação bônus',
    range: '18m',
    duration: '1 minuto',
    isAttack: true,
    damageFormula: '1d8',
    damageType: 'Energia',
    description: 'Arma espectral que ataca em ação bônus causando 1d8 + mod de conjuração.'
  },
  {
    id: 'sp-raio-ardente',
    name: 'Raio Ardente',
    level: 2,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '36m',
    duration: 'Instantânea',
    isAttack: true,
    damageFormula: '2d6',
    damageType: 'Fogo',
    description: 'Dispara 3 raios de fogo; cada raio faz ataque mágico e causa 2d6 de fogo.'
  },
  {
    id: 'sp-bola-de-fogo',
    name: 'Bola de Fogo',
    level: 3,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '45m',
    duration: 'Instantânea',
    saveAbility: 'dex',
    damageFormula: '8d6',
    damageType: 'Fogo',
    description: 'Esfera de 6m de raio; Salvaguarda de DES ou 8d6 de fogo (metade se passar).'
  },
  {
    id: 'sp-contramagica',
    name: 'Contramágica',
    level: 3,
    school: 'Abjuração',
    castingTime: '1 reação',
    range: '18m',
    duration: 'Instantânea',
    description: 'Interrompe uma criatura conjurando magia de 3º círculo ou menor (ou teste CD 10+círculo).'
  },
  {
    id: 'sp-velocidade',
    name: 'Velocidade',
    level: 3,
    school: 'Transmutação',
    castingTime: '1 ação',
    range: '9m',
    duration: '1 minuto',
    concentration: true,
    description: 'Dobra deslocamento, +2 CA, vantagem em DES e +1 ação adicional por turno.'
  },
  {
    id: 'sp-porta-dimensional',
    name: 'Porta Dimensional',
    level: 4,
    school: 'Conjuração',
    castingTime: '1 ação',
    range: '150m',
    duration: 'Instantânea',
    description: 'Teleporta você e até 1 aliado voluntário a até 150m.'
  },
  {
    id: 'sp-cone-frio',
    name: 'Cone de Frio',
    level: 5,
    school: 'Evocação',
    castingTime: '1 ação',
    range: 'Cone 18m',
    duration: 'Instantânea',
    saveAbility: 'con',
    damageFormula: '8d8',
    damageType: 'Frio',
    description: 'Salvaguarda de CON em cone de 18m ou 8d8 de dano de frio (metade se passar).'
  },
  {
    id: 'sp-desintegrar',
    name: 'Desintegrar',
    level: 6,
    school: 'Transmutação',
    castingTime: '1 ação',
    range: '18m',
    duration: 'Instantânea',
    saveAbility: 'dex',
    damageFormula: '10d6+40',
    damageType: 'Energia',
    description: 'Salvaguarda de DES ou sofre 10d6+40 de dano de energia; se chegar a 0 PV vira pó.'
  },
  {
    id: 'sp-cura-completa',
    name: 'Cura Completa',
    level: 6,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '18m',
    duration: 'Instantânea',
    damageFormula: '70',
    damageType: 'Cura',
    description: 'Uma criatura recupera 70 PV e é curada de cegueira, surdez e doenças.'
  },
  {
    id: 'sp-corrente-relampagos',
    name: 'Corrente de Relâmpagos',
    level: 6,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '45m',
    duration: 'Instantânea',
    saveAbility: 'dex',
    damageFormula: '10d8',
    damageType: 'Elétrico',
    description: 'Raio salta para até 3 alvos extras; Salvaguarda DES ou 10d8 elétrico (metade se passar).'
  },
  {
    id: 'sp-teletransporte',
    name: 'Teletransporte',
    level: 7,
    school: 'Conjuração',
    castingTime: '1 ação',
    range: '3m',
    duration: 'Instantânea',
    description: 'Teletransporta você e até 8 criaturas voluntárias para um local conhecido no mesmo plano.'
  },
  {
    id: 'sp-dominar-monstro',
    name: 'Dominar Monstro',
    level: 8,
    school: 'Encantamento',
    castingTime: '1 ação',
    range: '18m',
    duration: '1 hora',
    concentration: true,
    saveAbility: 'wis',
    description: 'Salvaguarda de SAB ou uma criatura fica enfeitiçada e obedece aos seus comandos.'
  },
  {
    id: 'sp-chuva-meteoros',
    name: 'Chuva de Meteoros',
    level: 9,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '1,5 km',
    duration: 'Instantânea',
    saveAbility: 'dex',
    damageFormula: '20d6+20d6',
    damageType: 'Fogo + Concussão',
    description: '4 esferas de 12m causam 20d6 de fogo + 20d6 de concussão (Salvaguarda DES).'
  },
  {
    id: 'sp-desejo',
    name: 'Desejo',
    level: 9,
    school: 'Conjuração',
    castingTime: '1 ação',
    range: 'Pessoal',
    duration: 'Instantânea',
    description: 'A magia mais poderosa: duplica qualquer magia até 8º círculo ou altera a realidade.'
  }
];

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export const POINT_BUY_COSTS: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9
};

export function getAbilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function getProficiencyBonus(level: number): number {
  return Math.ceil(Math.max(1, level) / 4) + 1;
}

// Mapas ilustrados da mesa (arquivos em client/public/maps)
export interface BattlemapAsset {
  id: string;
  name: string;
  imageUrl: string;
  cols: number;
  rows: number;
  tag: string;
}

export const BATTLEMAP_LIBRARY: BattlemapAsset[] = [
  {
    id: 'map-taverna',
    name: 'Taverna',
    imageUrl: '/maps/taverna.webp',
    cols: 48,
    rows: 36,
    tag: 'Interior'
  },
  {
    id: 'map-barco',
    name: 'Barco / Navio',
    imageUrl: '/maps/barco.webp',
    cols: 52,
    rows: 38,
    tag: 'Marítimo'
  },
  {
    id: 'map-barcos-duplos',
    name: 'Navios (2 Barcos / Convés + Porão)',
    imageUrl: '/maps/barcos-duplos.webp',
    cols: 26,
    rows: 20,
    tag: 'Marítimo'
  },
  {
    id: 'map-caverna',
    name: 'Caverna (Dragon\'s Rest)',
    imageUrl: '/maps/caverna.webp',
    cols: 54,
    rows: 36,
    tag: 'Subterrâneo'
  },
  {
    id: 'map-caverna-aquatica',
    name: 'Caverna Aquática',
    imageUrl: '/maps/caverna-aquatica.webp',
    cols: 64,
    rows: 44,
    tag: 'Aquático'
  },
  {
    id: 'map-farol',
    name: 'Farol / Observatório',
    imageUrl: '/maps/farol.webp',
    cols: 42,
    rows: 30,
    tag: 'Costeiro'
  }
];

// Mapas integrados estilizados
export const PRESET_MAPS = [
  {
    id: 'dungeon',
    name: 'Masmorra Antiga',
    bgColor: '#1a1b26',
    floorColor: '#24283b',
    accentColor: '#414868'
  },
  {
    id: 'tavern',
    name: 'Taverna da Coroa',
    bgColor: '#2a1b12',
    floorColor: '#3d281a',
    accentColor: '#6b4423'
  },
  {
    id: 'forest',
    name: 'Clareira da Floresta',
    bgColor: '#112217',
    floorColor: '#1b3524',
    accentColor: '#2d5a3c'
  },
  {
    id: 'arena',
    name: 'Arena de Pedra',
    bgColor: '#221f1d',
    floorColor: '#35312e',
    accentColor: '#5c534a'
  }
];

// Bestiário / NPCs prontos (SRD + Apêndice D do Livro do Jogador, pp. 304–311)
export const PRESET_NPCS: Omit<CharacterSheet, 'id' | 'ownerName'>[] = [
  {
    name: 'Goblin Emboscador',
    isNpc: true,
    isSecretNpc: true,
    race: 'Humanoide (Goblinóide)',
    className: 'Monstro',
    level: 1,
    background: 'Bestiário',
    avatar: '👺',
    abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    savingThrowProficiencies: [],
    skillProficiencies: ['stealth'],
    hp: 7,
    maxHp: 7,
    tempHp: 0,
    ac: 15,
    speed: '9m',
    hitDice: '2d6',
    cr: '1/4 (50 XP)',
    attacks: [
      { id: 'atk-1', name: 'Cimitarra', attackBonus: 4, damageFormula: '1d6+2', damageType: 'Cortante' },
      { id: 'atk-2', name: 'Arco Curto', attackBonus: 4, damageFormula: '1d6+2', damageType: 'Perfurante' }
    ],
    spells: [],
    inventory: ['Armadura de Couro', 'Escudo', 'Cimitarra', 'Arco Curto'],
    traits: 'Escapada Ágil: Pode usar Ação Bônus para Desengajar ou Esconder-se.',
    notes: 'Costuma atacar em grupo usando emboscadas.'
  },
  {
    name: 'Esqueleto Guardião',
    isNpc: true,
    isSecretNpc: true,
    race: 'Morto-Vivo',
    className: 'Monstro',
    level: 1,
    background: 'Bestiário',
    avatar: '💀',
    abilities: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 },
    savingThrowProficiencies: [],
    skillProficiencies: [],
    hp: 13,
    maxHp: 13,
    tempHp: 0,
    ac: 13,
    speed: '9m',
    hitDice: '2d8+4',
    cr: '1/4 (50 XP)',
    attacks: [
      { id: 'atk-1', name: 'Espada Curta', attackBonus: 4, damageFormula: '1d6+2', damageType: 'Perfurante' },
      { id: 'atk-2', name: 'Arco Curto', attackBonus: 4, damageFormula: '1d6+2', damageType: 'Perfurante' }
    ],
    spells: [],
    inventory: ['Restos de Armadura', 'Espada Curta'],
    traits: 'Vulnerável a dano de Concussão. Imune a Veneno e Exaustão.',
    notes: 'Obedece cegamente ao necromante que o animou.'
  },
  {
    name: 'Zumbi (Apêndice D)',
    isNpc: true,
    isSecretNpc: true,
    race: 'Morto-Vivo Médio',
    className: 'Monstro',
    level: 1,
    background: 'Bestiário PHB',
    avatar: '🧟',
    abilities: { str: 13, dex: 6, con: 16, int: 3, wis: 6, cha: 5 },
    savingThrowProficiencies: ['wis'],
    skillProficiencies: [],
    hp: 22,
    maxHp: 22,
    tempHp: 0,
    ac: 8,
    speed: '6m',
    hitDice: '3d8+9',
    cr: '1/4 (50 XP)',
    attacks: [
      { id: 'atk-1', name: 'Pancada', attackBonus: 3, damageFormula: '1d6+1', damageType: 'Concussão' }
    ],
    spells: [],
    inventory: [],
    traits: 'Fortitude de Morto-Vivo: Se reduzido a 0 PV, salvaguarda CON CD 5+dano para ficar com 1 PV (exceto radiante/crítico).',
    notes: 'Estatísticas oficiais do Apêndice D do Livro do Jogador.'
  },
  {
    name: 'Lobo (Apêndice D)',
    isNpc: true,
    isSecretNpc: true,
    race: 'Besta Média',
    className: 'Companheiro / Besta',
    level: 1,
    background: 'Bestiário PHB',
    avatar: '🐺',
    abilities: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
    savingThrowProficiencies: [],
    skillProficiencies: ['perception', 'stealth'],
    hp: 11,
    maxHp: 11,
    tempHp: 0,
    ac: 13,
    speed: '12m',
    hitDice: '2d8+2',
    cr: '1/4 (50 XP)',
    attacks: [
      { id: 'atk-1', name: 'Mordida (CD 11 FOR ou Caído)', attackBonus: 4, damageFormula: '2d4+2', damageType: 'Perfurante' }
    ],
    spells: [],
    inventory: [],
    traits: 'Audição e Faro Aguçados (vantagem em Percepção). Táticas de Matilha.',
    notes: 'Ideal para Companheiro Animal de Patrulheiro ou encontro na floresta.'
  },
  {
    name: 'Urso Marrom (Apêndice D)',
    isNpc: true,
    isSecretNpc: true,
    race: 'Besta Grande',
    className: 'Forma Selvagem / Besta',
    level: 3,
    background: 'Bestiário PHB',
    avatar: '🐻',
    abilities: { str: 19, dex: 10, con: 16, int: 2, wis: 13, cha: 7 },
    savingThrowProficiencies: [],
    skillProficiencies: ['perception'],
    hp: 34,
    maxHp: 34,
    tempHp: 0,
    ac: 11,
    speed: '12m / Escalada 9m',
    hitDice: '4d10+12',
    cr: '1 (200 XP)',
    attacks: [
      { id: 'atk-1', name: 'Mordida', attackBonus: 5, damageFormula: '1d8+4', damageType: 'Perfurante' },
      { id: 'atk-2', name: 'Garras', attackBonus: 5, damageFormula: '2d6+4', damageType: 'Cortante' }
    ],
    spells: [],
    inventory: [],
    traits: 'Faro Aguçado. Multiataque: 1 Mordida e 1 Garras. Token Grande (2x2).',
    notes: 'Clássica Forma Selvagem de Druida Círculo da Lua!'
  },
  {
    name: 'Aranha Gigante (Apêndice D)',
    isNpc: true,
    isSecretNpc: true,
    race: 'Besta Grande',
    className: 'Monstro',
    level: 3,
    background: 'Bestiário PHB',
    avatar: '🕷️',
    abilities: { str: 14, dex: 16, con: 12, int: 2, wis: 11, cha: 4 },
    savingThrowProficiencies: [],
    skillProficiencies: ['stealth'],
    hp: 26,
    maxHp: 26,
    tempHp: 0,
    ac: 14,
    speed: '9m / Escalada 9m',
    hitDice: '4d10+4',
    cr: '1 (200 XP)',
    attacks: [
      { id: 'atk-1', name: 'Mordida (+2d8 Veneno CD 11 CON)', attackBonus: 5, damageFormula: '1d8+3', damageType: 'Perfurante' },
      { id: 'atk-2', name: 'Teia (Recarga 5-6, Impede)', attackBonus: 5, damageFormula: '0', damageType: 'Impedido' }
    ],
    spells: [],
    inventory: [],
    traits: 'Escalar Teia, Sentido Sísmico na Teia, Patas de Aranha. Token Grande (2x2).',
    notes: 'Apêndice D p. 304.'
  },
  {
    name: 'Diabrete (Familiar - Apêndice D)',
    isNpc: true,
    isSecretNpc: false,
    race: 'Corruptor Miúdo',
    className: 'Familiar de Bruxo',
    level: 2,
    background: 'Bestiário PHB',
    avatar: '👿',
    abilities: { str: 6, dex: 17, con: 13, int: 11, wis: 12, cha: 14 },
    savingThrowProficiencies: [],
    skillProficiencies: ['deception', 'insight', 'persuasion', 'stealth'],
    hp: 10,
    maxHp: 10,
    tempHp: 0,
    ac: 13,
    speed: '6m / Voo 12m',
    hitDice: '3d4+3',
    cr: '1 (200 XP)',
    attacks: [
      { id: 'atk-1', name: 'Ferrão (+3d6 Veneno CD 11 CON)', attackBonus: 5, damageFormula: '1d4+3', damageType: 'Perfurante' }
    ],
    spells: [],
    inventory: [],
    traits: 'Metamorfo (rato, corvo, aranha), Visão Diabólica (36m), Resistência à Magia, Invisibilidade à vontade.',
    notes: 'Familiar especial do Pacto da Corrente.'
  },
  {
    name: 'Lobo Atroz',
    isNpc: true,
    isSecretNpc: true,
    race: 'Besta Grande',
    className: 'Monstro',
    level: 2,
    background: 'Bestiário',
    avatar: '🐺',
    abilities: { str: 17, dex: 15, con: 15, int: 3, wis: 12, cha: 7 },
    savingThrowProficiencies: [],
    skillProficiencies: ['perception', 'stealth'],
    hp: 37,
    maxHp: 37,
    tempHp: 0,
    ac: 14,
    speed: '15m',
    hitDice: '5d10+10',
    cr: '1 (200 XP)',
    attacks: [
      { id: 'atk-1', name: 'Mordida (CD 13 Força ou derruba)', attackBonus: 5, damageFormula: '2d6+3', damageType: 'Perfurante' }
    ],
    spells: [],
    inventory: [],
    traits: 'Táticas de Matilha: Vantagem no ataque se um aliado estiver a 1,5m do alvo.',
    notes: 'Token tamanho Grande (2x2).'
  },
  {
    name: 'Ogro Brutamontes',
    isNpc: true,
    isSecretNpc: true,
    race: 'Gigante Grande',
    className: 'Monstro',
    level: 4,
    background: 'Bestiário',
    avatar: '🧌',
    abilities: { str: 19, dex: 8, con: 16, int: 5, wis: 7, cha: 7 },
    savingThrowProficiencies: [],
    skillProficiencies: [],
    hp: 59,
    maxHp: 59,
    tempHp: 0,
    ac: 11,
    speed: '12m',
    hitDice: '7d10+21',
    cr: '2 (450 XP)',
    attacks: [
      { id: 'atk-1', name: 'Clava Grande', attackBonus: 6, damageFormula: '2d8+4', damageType: 'Concussão' },
      { id: 'atk-2', name: 'Azagaia', attackBonus: 6, damageFormula: '2d6+4', damageType: 'Perfurante' }
    ],
    spells: [],
    inventory: ['Peles', 'Clava Grande', '3 Azagaias'],
    traits: 'Brutal e territorial.',
    notes: 'Token tamanho Grande (2x2).'
  },
  {
    name: 'Capitão da Guarda',
    isNpc: true,
    isSecretNpc: false,
    race: 'Humano',
    className: 'NPC Aliado',
    level: 5,
    background: 'Soldado',
    avatar: '💂',
    abilities: { str: 16, dex: 13, con: 14, int: 11, wis: 12, cha: 14 },
    savingThrowProficiencies: ['str', 'con'],
    skillProficiencies: ['athletics', 'perception', 'intimidation'],
    hp: 52,
    maxHp: 52,
    tempHp: 0,
    ac: 18,
    speed: '9m',
    hitDice: '8d8+16',
    cr: '3 (700 XP)',
    attacks: [
      { id: 'atk-1', name: 'Alabarda', attackBonus: 5, damageFormula: '1d10+3', damageType: 'Cortante' },
      { id: 'atk-2', name: 'Besta Pesada', attackBonus: 3, damageFormula: '1d10+1', damageType: 'Perfurante' }
    ],
    spells: [],
    inventory: ['Armadura de Placas', 'Alabarda', 'Chaves da Cidade'],
    traits: 'Multiataque: Realiza dois ataques corpo a corpo por turno.',
    notes: 'Pode contratar os aventureiros para investigar as minas.'
  },
  {
    name: 'Dragão Vermelho Jovem',
    isNpc: true,
    isSecretNpc: true,
    race: 'Dragão Grande',
    className: 'Chefe',
    level: 10,
    background: 'Bestiário',
    avatar: '🐉',
    abilities: { str: 23, dex: 10, con: 21, int: 14, wis: 11, cha: 19 },
    savingThrowProficiencies: ['dex', 'con', 'wis', 'cha'],
    skillProficiencies: ['perception', 'stealth'],
    hp: 178,
    maxHp: 178,
    tempHp: 0,
    ac: 18,
    speed: '12m / Voo 24m',
    hitDice: '17d10+85',
    cr: '10 (5.900 XP)',
    attacks: [
      { id: 'atk-1', name: 'Mordida', attackBonus: 10, damageFormula: '2d10+6+1d6', damageType: 'Perfurante + Fogo' },
      { id: 'atk-2', name: 'Garra', attackBonus: 10, damageFormula: '2d6+6', damageType: 'Cortante' },
      { id: 'atk-3', name: 'Sopro de Fogo (Recarga 5-6, CD 17 Des)', attackBonus: 0, damageFormula: '16d6', damageType: 'Fogo' }
    ],
    spells: [],
    inventory: ['Tesouro do Covil (1.500 PO)'],
    traits: 'Imune a Dano de Fogo. Multiataque: 1 Mordida e 2 Garras.',
    notes: 'Chefe final da masmorra!'
  }
];

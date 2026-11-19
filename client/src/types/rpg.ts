export type Role = 'dm' | 'player';

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface Abilities {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface Attack {
  id: string;
  name: string;
  attackBonus: number;
  damageFormula: string;
  damageType: string;
}

export interface SpellSlotLevel {
  max: number;
  used: number;
}

export interface SpellItem {
  id: string;
  name: string;
  level: number; // 0 = Truque
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  concentration?: boolean;
  damageFormula?: string;
  damageType?: string;
  saveAbility?: AbilityKey;
  isAttack?: boolean;
  description: string;
}

export interface Currency {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  weightKg: number;
  category?: string;
  value?: string;
  description?: string;
  equipped?: boolean;
}

export interface DeathSaves {
  successes: number;
  failures: number;
}

export interface CharacterSheet {
  id: string;
  name: string;
  isNpc: boolean;
  isSecretNpc?: boolean;
  ownerName: string;
  race: string;
  subrace?: string;
  className: string;
  subclass?: string;
  level: number;
  xp?: number;
  background: string;
  alignment?: string;
  avatar: string;
  imageUrl?: string;
  inspiration?: boolean;
  concentratingOn?: string;
  abilities: Abilities;
  savingThrowProficiencies: AbilityKey[];
  skillProficiencies: string[];
  expertiseSkills?: string[];
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  armorName?: string;
  speed: string;
  hitDice: string;
  hitDiceRemaining?: number;
  deathSaves?: DeathSaves;
  conditions?: string[];
  exhaustion?: number;
  cr?: string;
  spellcastingAbility?: AbilityKey | null;
  spellSlots?: Record<number, SpellSlotLevel>;
  spellList?: SpellItem[];
  attacks: Attack[];
  spells: string[];
  inventory: string[];
  inventoryItems?: InventoryItem[];
  carryWeight?: number;
  currency?: Currency;
  traits: string;
  personality?: {
    traits: string;
    ideals: string;
    bonds: string;
    flaws: string;
  };
  notes: string;
  modelSlug?: string;
  modelNameEn?: string;
  modelType?: string;
}

export interface Token {
  id: string;
  name: string;
  x: number;
  y: number;
  size: number; // 1 = 1x1, 2 = 2x2, 3 = 3x3
  color: string;
  avatar: string;
  imageUrl?: string;
  hp: number;
  maxHp: number;
  ac: number;
  hidden: boolean;
  ownerName: string;
  characterId?: string;
  type: 'pc' | 'npc' | 'monster' | 'object';
  conditions: string[];
  modelSlug?: string;
  modelNameEn?: string;
  modelType?: string;
  facing?: number;
}

export interface MapDrawing {
  id: string;
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

export interface MapPing {
  id: string;
  x: number;
  y: number;
  color: string;
  sender: string;
  timestamp: number;
}

export interface MapLayer {
  id: string;
  name: string;
  imageUrl: string;
  x: number;
  y: number;
  cols: number;
  rows: number;
}

export interface MapConfig {
  presetId: string;
  imageUrl: string;
  baseCols?: number;
  baseRows?: number;
  layers?: MapLayer[];
  gridSize: number;
  cols: number;
  rows: number;
  gridColor: string;
  fogEnabled: boolean;
  fogCells: Record<string, boolean>;
}

export interface Scene {
  id: string;
  name: string;
  map: MapConfig;
  tokens: Token[];
  drawings: MapDrawing[];
}

export interface RollData {
  formula: string;
  rolls: number[];
  discarded?: number[];
  modifier: number;
  total: number;
  mode: RollMode;
  label?: string;
  isCrit?: boolean;
  isFumble?: boolean;
}

export interface ChatMessage {
  id: string;
  timestamp: number;
  sender: string;
  role: Role | 'system';
  type: 'chat' | 'roll' | 'system';
  text: string;
  isSecret: boolean;
  recipient?: string;
  rollData?: RollData | null;
}

export interface InitiativeEntry {
  id: string;
  name: string;
  roll: number;
  hp: number;
  maxHp: number;
  ac: number;
  isNpc: boolean;
  hidden: boolean;
  tokenId?: string;
}

export interface InitiativeState {
  round: number;
  activeIndex: number;
  entries: InitiativeEntry[];
}

export interface TradeOffer {
  id: string;
  createdAt: number;
  direction: 'sell_to_dm' | 'buy_from_dm' | 'dm_to_player';
  playerName: string;
  characterId: string;
  characterName: string;
  item?: InventoryItem;
  coins: Currency;
  counterCoins?: Currency;
  counterNote?: string;
  status: 'pending' | 'countered' | 'accepted' | 'rejected';
  note?: string;
}

export interface RollLimitConfig {
  enabled: boolean;
  maxRolls: number;
  windowSeconds: number;
}

export interface RoomState {
  id: string;
  name: string;
  hasPassword: boolean;
  map: MapConfig;
  tokens: Token[];
  drawings?: MapDrawing[];
  scenes?: { id: string; name: string }[];
  activeSceneId?: string;
  characters: CharacterSheet[];
  playerCharLimits?: Record<string, number>;
  allowMultiCharAll?: boolean;
  rollLimit?: RollLimitConfig;
  trades?: TradeOffer[];
  initiative: InitiativeState;
  chat: ChatMessage[];
  dmNotes: string;
}

export interface OnlineUser {
  id: string;
  name: string;
  role: Role;
}

export interface RoomSummary {
  id: string;
  name: string;
  hasPassword: boolean;
  onlineCount: number;
  characterCount: number;
  sceneCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface NetworkIpInfo {
  ip: string;
  label: string;
}

export interface TunnelState {
  status: 'idle' | 'starting' | 'connected' | 'error' | 'disabled';
  publicUrl: string | null;
  error: string | null;
}

export interface NetworkInfo {
  port: number;
  ips: NetworkIpInfo[];
  tunnel?: TunnelState;
}

export interface BestiaryIndexItem {
  slug: string;
  name: string;
  namePt: string;
  nameEn: string;
  cr: string;
  type: string;
  source: 'pdf' | 'pocketdm' | 'both';
  hasFullLocal?: boolean;
}

export interface BestiaryStatEntry {
  slug: string;
  name: string;
  nameEn?: string;
  source: 'pdf' | 'pocketdm' | 'both';
  size: string;
  type: string;
  alignment: string;
  cr: string;
  xp?: number;
  ac: number;
  hp: number;
  hpFormula: string;
  speed: string;
  tokenUrl?: string;
  avatar: string;
  abilities: Abilities;
  savingThrows?: Record<string, number>;
  skills?: Record<string, number>;
  damageVulnerabilities?: string;
  damageResistances?: string;
  damageImmunities?: string;
  conditionImmunities?: string;
  senses?: string;
  languages?: string;
  specialAbilities: { name: string; desc: string }[];
  actions: { name: string; desc: string }[];
  reactions?: { name: string; desc: string }[];
  legendaryActions?: { name: string; desc: string }[];
  parsedAttacks: Attack[];
  notes?: string;
}

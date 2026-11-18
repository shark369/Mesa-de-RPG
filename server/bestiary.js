import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'pocketdm-catalog.json');
const CACHE_FILE = path.join(DATA_DIR, 'bestiary-cache.json');

const TYPE_PT = {
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

const SIZE_PT = {
  Tiny: 'Miúdo',
  Small: 'Pequeno',
  Medium: 'Médio',
  Large: 'Grande',
  Huge: 'Enorme',
  Gargantuan: 'Imenso'
};

const AVATAR_BY_TYPE = {
  aberration: '🐙',
  beast: '🐺',
  celestial: '👼',
  construct: '🤖',
  dragon: '🐉',
  elemental: '🔥',
  fey: '🧚',
  fiend: '😈',
  giant: '🧌',
  humanoid: '🗡️',
  monstrosity: '🦁',
  ooze: '🟢',
  plant: '🌿',
  undead: '💀'
};

// Criaturas completas do Apêndice D do PDF (Livro do Jogador, pp. 304–311) + clássicos
const PDF_CREATURES = [
  {
    slug: 'aguia-gigante',
    name: 'Águia Gigante',
    nameEn: 'Giant Eagle',
    source: 'both',
    size: 'Grande',
    type: 'beast',
    alignment: 'Neutro e Bom',
    cr: '1',
    xp: 200,
    ac: 13,
    hp: 26,
    hpFormula: '4d10 + 4',
    speed: '3 m, voo 24 m',
    avatar: '🦅',
    abilities: { str: 16, dex: 17, con: 13, int: 8, wis: 14, cha: 10 },
    skills: { Percepção: 4 },
    senses: 'Percepção passiva 14',
    languages: 'Águia Gigante, entende Comum e Auran mas não fala',
    specialAbilities: [
      { name: 'Visão Aguçada', desc: 'A águia tem vantagem em testes de Sabedoria (Percepção) relacionados à visão.' }
    ],
    actions: [
      { name: 'Multiataque', desc: 'A águia realiza dois ataques: um com seu bico e um com suas garras.' },
      { name: 'Bico', desc: 'Ataque Corpo a Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 6 (1d6 + 3) de dano perfurante.' },
      { name: 'Garras', desc: 'Ataque Corpo a Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 10 (2d6 + 3) de dano cortante.' }
    ],
    parsedAttacks: [
      { id: 'atk-1', name: 'Bico', attackBonus: 5, damageFormula: '1d6+3', damageType: 'Perfurante' },
      { id: 'atk-2', name: 'Garras', attackBonus: 5, damageFormula: '2d6+3', damageType: 'Cortante' }
    ],
    notes: 'Apêndice D do Livro do Jogador (p. 304).'
  },
  {
    slug: 'aranha-gigante',
    name: 'Aranha Gigante',
    nameEn: 'Giant Spider',
    source: 'both',
    size: 'Grande',
    type: 'beast',
    alignment: 'Imparcial',
    cr: '1',
    xp: 200,
    ac: 14,
    hp: 26,
    hpFormula: '4d10 + 4',
    speed: '9 m, escalada 9 m',
    avatar: '🕷️',
    abilities: { str: 14, dex: 16, con: 12, int: 2, wis: 11, cha: 4 },
    skills: { Furtividade: 7 },
    senses: 'Percepção às Cegas 3 m, Visão no Escuro 18 m, Percepção passiva 10',
    languages: '—',
    specialAbilities: [
      { name: 'Patas de Aranha', desc: 'Pode escalar superfícies difíceis, inclusive tetos de cabeça para baixo, sem teste.' },
      { name: 'Sentir Teia', desc: 'Enquanto em contato com uma teia, sabe a localização exata de qualquer outra criatura tocando a mesma teia.' },
      { name: 'Andar na Teia', desc: 'Ignora restrições de movimento causadas por teias.' }
    ],
    actions: [
      { name: 'Mordida', desc: 'Ataque Corpo a Corpo: +5 para atingir, alcance 1,5 m. Acerto: 7 (1d8 + 3) perfurante e alvo faz salvaguarda CON CD 11 (9 / 2d8 veneno, metade se passar).' },
      { name: 'Teia (Recarga 5–6)', desc: 'Ataque à Distancia: +5 para atingir, distância 9/18 m. Alvo fica Impedido pela teia (CD 12 FOR para escapar).' }
    ],
    parsedAttacks: [
      { id: 'atk-1', name: 'Mordida (+2d8 Veneno)', attackBonus: 5, damageFormula: '1d8+3', damageType: 'Perfurante' },
      { id: 'atk-2', name: 'Veneno da Mordida (CD 11 CON)', attackBonus: 0, damageFormula: '2d8', damageType: 'Veneno' }
    ],
    notes: 'Apêndice D do Livro do Jogador (p. 304).'
  },
  {
    slug: 'cobra-constritora',
    name: 'Cobra Constritora',
    nameEn: 'Constrictor Snake',
    source: 'both',
    size: 'Grande',
    type: 'beast',
    alignment: 'Imparcial',
    cr: '1/4',
    xp: 50,
    ac: 12,
    hp: 13,
    hpFormula: '2d10 + 2',
    speed: '9 m, natação 9 m',
    avatar: '🐍',
    abilities: { str: 15, dex: 14, con: 12, int: 1, wis: 10, cha: 3 },
    senses: 'Percepção às Cegas 3 m, Percepção passiva 10',
    languages: '—',
    specialAbilities: [],
    actions: [
      { name: 'Mordida', desc: 'Ataque Corpo a Corpo: +4, alcance 1,5 m. Acerto: 5 (1d6 + 2) perfurante.' },
      { name: 'Constrição', desc: 'Ataque Corpo a Corpo: +4, alcance 1,5 m. Acerto: 6 (1d8 + 2) concussão e alvo fica Agarrado/Impedido (CD 14).' }
    ],
    parsedAttacks: [
      { id: 'atk-1', name: 'Mordida', attackBonus: 4, damageFormula: '1d6+2', damageType: 'Perfurante' },
      { id: 'atk-2', name: 'Constrição', attackBonus: 4, damageFormula: '1d8+2', damageType: 'Concussão' }
    ],
    notes: 'Apêndice D do Livro do Jogador (p. 305).'
  },
  {
    slug: 'diabrete',
    name: 'Diabrete',
    nameEn: 'Imp',
    source: 'both',
    size: 'Miúdo',
    type: 'fiend',
    alignment: 'Leal e Mau',
    cr: '1',
    xp: 200,
    ac: 13,
    hp: 10,
    hpFormula: '3d4 + 3',
    speed: '6 m, voo 12 m',
    avatar: '👿',
    abilities: { str: 6, dex: 17, con: 13, int: 11, wis: 12, cha: 14 },
    skills: { Enganação: 4, Intuição: 3, Persuasão: 4, Furtividade: 5 },
    damageResistances: 'Frio; concussão, cortante e perfurante de ataques não-mágicos sem prata',
    damageImmunities: 'Fogo, Veneno',
    conditionImmunities: 'Envenenado',
    senses: 'Visão no Escuro 36 m, Percepção passiva 11',
    languages: 'Infernal, Comum',
    specialAbilities: [
      { name: 'Metamorfo', desc: 'Transforma-se em rato, corvo ou aranha mantendo suas estatísticas (exceto deslocamento).' },
      { name: 'Visão Diabólica', desc: 'Escuridão mágica não impede a visão no escuro.' },
      { name: 'Resistência à Magia', desc: 'Vantagem em salvaguardas contra magias e efeitos mágicos.' }
    ],
    actions: [
      { name: 'Ferrão (Mordida em forma de besta)', desc: 'Ataque Corpo a Corpo: +5. Acerto: 5 (1d4 + 3) perfurante + 10 (3d6) veneno (CD 11 CON metade).' },
      { name: 'Invisibilidade', desc: 'Fica magicamente invisível até atacar ou perder a concentração.' }
    ],
    parsedAttacks: [
      { id: 'atk-1', name: 'Ferrão', attackBonus: 5, damageFormula: '1d4+3', damageType: 'Perfurante' },
      { id: 'atk-2', name: 'Veneno do Ferrão (CD 11 CON)', attackBonus: 0, damageFormula: '3d6', damageType: 'Veneno' }
    ],
    notes: 'Apêndice D do Livro do Jogador (p. 306) — Familiar de Bruxo.'
  },
  {
    slug: 'leao',
    name: 'Leão',
    nameEn: 'Lion',
    source: 'both',
    size: 'Grande',
    type: 'beast',
    alignment: 'Imparcial',
    cr: '1',
    xp: 200,
    ac: 12,
    hp: 26,
    hpFormula: '4d10 + 4',
    speed: '15 m',
    avatar: '🦁',
    abilities: { str: 17, dex: 15, con: 13, int: 3, wis: 12, cha: 8 },
    skills: { Percepção: 3, Furtividade: 6 },
    senses: 'Percepção passiva 13',
    languages: '—',
    specialAbilities: [
      { name: 'Táticas de Matilha', desc: 'Vantagem em ataques se um aliado estiver a até 1,5 m do alvo.' },
      { name: 'Bote', desc: 'Se mover 6 m em linha reta e acertar Garras, alvo faz CD 13 FOR ou fica Caído; bônus de Mordida.' }
    ],
    actions: [
      { name: 'Mordida', desc: 'Ataque Corpo a Corpo: +5. Acerto: 7 (1d8 + 3) perfurante.' },
      { name: 'Garras', desc: 'Ataque Corpo a Corpo: +5. Acerto: 6 (1d6 + 3) cortante.' }
    ],
    parsedAttacks: [
      { id: 'atk-1', name: 'Mordida', attackBonus: 5, damageFormula: '1d8+3', damageType: 'Perfurante' },
      { id: 'atk-2', name: 'Garras', attackBonus: 5, damageFormula: '1d6+3', damageType: 'Cortante' }
    ],
    notes: 'Apêndice D do Livro do Jogador (p. 308).'
  },
  {
    slug: 'lobo',
    name: 'Lobo',
    nameEn: 'Wolf',
    source: 'both',
    size: 'Médio',
    type: 'beast',
    alignment: 'Imparcial',
    cr: '1/4',
    xp: 50,
    ac: 13,
    hp: 11,
    hpFormula: '2d8 + 2',
    speed: '12 m',
    avatar: '🐺',
    abilities: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
    skills: { Percepção: 3, Furtividade: 4 },
    senses: 'Percepção passiva 13',
    languages: '—',
    specialAbilities: [
      { name: 'Audição e Faro Aguçados', desc: 'Vantagem em Percepção relacionada a audição ou olfato.' },
      { name: 'Táticas de Matilha', desc: 'Vantagem no ataque se um aliado não incapacitado estiver a até 1,5 m do alvo.' }
    ],
    actions: [
      { name: 'Mordida', desc: 'Ataque Corpo a Corpo: +4. Acerto: 7 (2d4 + 2) perfurante; CD 11 FOR ou alvo fica Caído.' }
    ],
    parsedAttacks: [
      { id: 'atk-1', name: 'Mordida (CD 11 FOR ou Caído)', attackBonus: 4, damageFormula: '2d4+2', damageType: 'Perfurante' }
    ],
    notes: 'Apêndice D do Livro do Jogador (p. 308).'
  },
  {
    slug: 'pantera',
    name: 'Pantera',
    nameEn: 'Panther',
    source: 'both',
    size: 'Médio',
    type: 'beast',
    alignment: 'Imparcial',
    cr: '1/4',
    xp: 50,
    ac: 12,
    hp: 13,
    hpFormula: '3d8',
    speed: '15 m, escalada 12 m',
    avatar: '🐆',
    abilities: { str: 14, dex: 15, con: 10, int: 3, wis: 14, cha: 7 },
    skills: { Percepção: 4, Furtividade: 6 },
    senses: 'Percepção passiva 14',
    languages: '—',
    specialAbilities: [
      { name: 'Faro Aguçado', desc: 'Vantagem em Percepção relacionada ao olfato.' },
      { name: 'Bote', desc: 'Se mover 6 m em linha reta e acertar Garras, CD 12 FOR ou fica Caído; bônus de Mordida.' }
    ],
    actions: [
      { name: 'Mordida', desc: 'Ataque Corpo a Corpo: +4. Acerto: 5 (1d6 + 2) perfurante.' },
      { name: 'Garras', desc: 'Ataque Corpo a Corpo: +4. Acerto: 4 (1d4 + 2) cortante.' }
    ],
    parsedAttacks: [
      { id: 'atk-1', name: 'Mordida', attackBonus: 4, damageFormula: '1d6+2', damageType: 'Perfurante' },
      { id: 'atk-2', name: 'Garras', attackBonus: 4, damageFormula: '1d4+2', damageType: 'Cortante' }
    ],
    notes: 'Apêndice D do Livro do Jogador (p. 309).'
  },
  {
    slug: 'pseudodragao',
    name: 'Pseudodragão',
    nameEn: 'Pseudodragon',
    source: 'both',
    size: 'Miúdo',
    type: 'dragon',
    alignment: 'Neutro e Bom',
    cr: '1/4',
    xp: 50,
    ac: 13,
    hp: 7,
    hpFormula: '2d4 + 2',
    speed: '4,5 m, voo 18 m',
    avatar: '🐲',
    abilities: { str: 6, dex: 15, con: 13, int: 10, wis: 12, cha: 10 },
    skills: { Percepção: 3, Furtividade: 4 },
    senses: 'Percepção às Cegas 3 m, Visão no Escuro 18 m, Percepção passiva 13',
    languages: 'Entende Comum e Dracônico, mas não fala (telepatia limitada)',
    specialAbilities: [
      { name: 'Sentidos Aguçados', desc: 'Vantagem em testes de Sabedoria (Percepção) de visão, audição ou olfato.' },
      { name: 'Resistência à Magia', desc: 'Vantagem em salvaguardas contra magias.' }
    ],
    actions: [
      { name: 'Mordida', desc: 'Ataque Corpo a Corpo: +4. Acerto: 4 (1d4 + 2) perfurante.' },
      { name: 'Ferrão', desc: 'Ataque Corpo a Corpo: +4. Acerto: 4 (1d4 + 2) perfurante + CD 11 CON ou Envenenado por 1h (Inconsciente se falhar por 5+).' }
    ],
    parsedAttacks: [
      { id: 'atk-1', name: 'Mordida', attackBonus: 4, damageFormula: '1d4+2', damageType: 'Perfurante' },
      { id: 'atk-2', name: 'Ferrão (CD 11 CON)', attackBonus: 4, damageFormula: '1d4+2', damageType: 'Perfurante' }
    ],
    notes: 'Apêndice D do Livro do Jogador (p. 309).'
  },
  {
    slug: 'quasit',
    name: 'Quasit',
    nameEn: 'Quasit',
    source: 'both',
    size: 'Miúdo',
    type: 'fiend',
    alignment: 'Caótico e Mau',
    cr: '1',
    xp: 200,
    ac: 13,
    hp: 7,
    hpFormula: '3d4',
    speed: '12 m',
    avatar: '👹',
    abilities: { str: 5, dex: 17, con: 10, int: 7, wis: 10, cha: 10 },
    skills: { Furtividade: 5 },
    damageResistances: 'Frio, Fogo, Elétrico; armas não-mágicas',
    damageImmunities: 'Veneno',
    conditionImmunities: 'Envenenado',
    senses: 'Visão no Escuro 36 m, Percepção passiva 10',
    languages: 'Abissal, Comum',
    specialAbilities: [
      { name: 'Metamorfo', desc: 'Pode transformar-se em morcego, centopeia ou sapo.' },
      { name: 'Resistência à Magia', desc: 'Vantagem em salvaguardas contra magias.' }
    ],
    actions: [
      { name: 'Garras (Mordida em forma de besta)', desc: 'Ataque Corpo a Corpo: +4. Acerto: 5 (1d4 + 3) perfurante + 5 (2d4) veneno (CD 10 CON).' },
      { name: 'Assustar (1/Dia)', desc: 'Uma criatura a 6 m faz CD 10 SAB ou fica Amedrontada por 1 minuto.' },
      { name: 'Invisibilidade', desc: 'Fica magicamente invisível até atacar ou perder concentração.' }
    ],
    parsedAttacks: [
      { id: 'atk-1', name: 'Garras', attackBonus: 4, damageFormula: '1d4+3', damageType: 'Perfurante' },
      { id: 'atk-2', name: 'Veneno (CD 10 CON)', attackBonus: 0, damageFormula: '2d4', damageType: 'Veneno' }
    ],
    notes: 'Apêndice D do Livro do Jogador (p. 310).'
  },
  {
    slug: 'urso-marrom',
    name: 'Urso Marrom',
    nameEn: 'Brown Bear',
    source: 'both',
    size: 'Grande',
    type: 'beast',
    alignment: 'Imparcial',
    cr: '1',
    xp: 200,
    ac: 11,
    hp: 34,
    hpFormula: '4d10 + 12',
    speed: '12 m, escalada 9 m',
    avatar: '🐻',
    abilities: { str: 19, dex: 10, con: 16, int: 2, wis: 13, cha: 7 },
    skills: { Percepção: 3 },
    senses: 'Percepção passiva 13',
    languages: '—',
    specialAbilities: [
      { name: 'Faro Aguçado', desc: 'Vantagem em testes de Sabedoria (Percepção) relacionados ao olfato.' }
    ],
    actions: [
      { name: 'Multiataque', desc: 'O urso realiza dois ataques: um com a mordida e um com as garras.' },
      { name: 'Mordida', desc: 'Ataque Corpo a Corpo: +5. Acerto: 8 (1d8 + 4) perfurante.' },
      { name: 'Garras', desc: 'Ataque Corpo a Corpo: +5. Acerto: 11 (2d6 + 4) cortante.' }
    ],
    parsedAttacks: [
      { id: 'atk-1', name: 'Mordida', attackBonus: 5, damageFormula: '1d8+4', damageType: 'Perfurante' },
      { id: 'atk-2', name: 'Garras', attackBonus: 5, damageFormula: '2d6+4', damageType: 'Cortante' }
    ],
    notes: 'Apêndice D do Livro do Jogador (p. 311).'
  },
  {
    slug: 'urso-negro',
    name: 'Urso Negro',
    nameEn: 'Black Bear',
    source: 'both',
    size: 'Médio',
    type: 'beast',
    alignment: 'Imparcial',
    cr: '1/2',
    xp: 100,
    ac: 11,
    hp: 19,
    hpFormula: '3d8 + 6',
    speed: '12 m, escalada 9 m',
    avatar: '🐻',
    abilities: { str: 15, dex: 10, con: 14, int: 2, wis: 12, cha: 7 },
    skills: { Percepção: 3 },
    senses: 'Percepção passiva 13',
    languages: '—',
    specialAbilities: [
      { name: 'Faro Aguçado', desc: 'Vantagem em Percepção relacionada ao olfato.' }
    ],
    actions: [
      { name: 'Multiataque', desc: 'Realiza dois ataques: um com a mordida e um com as garras.' },
      { name: 'Mordida', desc: 'Ataque Corpo a Corpo: +3. Acerto: 5 (1d6 + 2) perfurante.' },
      { name: 'Garras', desc: 'Ataque Corpo a Corpo: +3. Acerto: 7 (2d4 + 2) cortante.' }
    ],
    parsedAttacks: [
      { id: 'atk-1', name: 'Mordida', attackBonus: 3, damageFormula: '1d6+2', damageType: 'Perfurante' },
      { id: 'atk-2', name: 'Garras', attackBonus: 3, damageFormula: '2d4+2', damageType: 'Cortante' }
    ],
    notes: 'Apêndice D do Livro do Jogador (p. 311).'
  },
  {
    slug: 'zumbi',
    name: 'Zumbi',
    nameEn: 'Zombie',
    source: 'both',
    size: 'Médio',
    type: 'undead',
    alignment: 'Neutro e Mau',
    cr: '1/4',
    xp: 50,
    ac: 8,
    hp: 22,
    hpFormula: '3d8 + 9',
    speed: '6 m',
    avatar: '🧟',
    abilities: { str: 13, dex: 6, con: 16, int: 3, wis: 6, cha: 5 },
    savingThrows: { WIS: 0 },
    damageImmunities: 'Veneno',
    conditionImmunities: 'Envenenado',
    senses: 'Visão no Escuro 18 m, Percepção passiva 8',
    languages: 'Entende os idiomas que conhecia em vida, mas não fala',
    specialAbilities: [
      { name: 'Fortitude de Morto-Vivo', desc: 'Se reduzido a 0 PV, faz CD 5 + dano de CON para ficar com 1 PV (exceto radiante ou crítico).' }
    ],
    actions: [
      { name: 'Pancada', desc: 'Ataque Corpo a Corpo: +3. Acerto: 4 (1d6 + 1) concussão.' }
    ],
    parsedAttacks: [
      { id: 'atk-1', name: 'Pancada', attackBonus: 3, damageFormula: '1d6+1', damageType: 'Concussão' }
    ],
    notes: 'Apêndice D do Livro do Jogador (p. 311).'
  },
  {
    slug: 'cavalo-de-montaria',
    name: 'Cavalo de Montaria',
    nameEn: 'Riding Horse',
    source: 'both',
    size: 'Grande',
    type: 'beast',
    alignment: 'Imparcial',
    cr: '1/4',
    xp: 50,
    ac: 10,
    hp: 13,
    hpFormula: '2d10 + 2',
    speed: '18 m',
    avatar: '🐎',
    abilities: { str: 16, dex: 10, con: 12, int: 2, wis: 11, cha: 7 },
    senses: 'Percepção passiva 10',
    languages: '—',
    specialAbilities: [],
    actions: [
      { name: 'Cascos', desc: 'Ataque Corpo a Corpo: +5. Acerto: 8 (2d4 + 3) concussão.' }
    ],
    parsedAttacks: [
      { id: 'atk-1', name: 'Cascos', attackBonus: 5, damageFormula: '2d4+3', damageType: 'Concussão' }
    ],
    notes: 'Apêndice D do Livro do Jogador (p. 305).'
  },
  {
    slug: 'mastim',
    name: 'Mastim',
    nameEn: 'Mastiff',
    source: 'both',
    size: 'Médio',
    type: 'beast',
    alignment: 'Imparcial',
    cr: '1/8',
    xp: 25,
    ac: 12,
    hp: 5,
    hpFormula: '1d8 + 1',
    speed: '12 m',
    avatar: '🐕',
    abilities: { str: 13, dex: 14, con: 12, int: 3, wis: 12, cha: 7 },
    skills: { Percepção: 3 },
    senses: 'Percepção passiva 13',
    languages: '—',
    specialAbilities: [
      { name: 'Audição e Faro Aguçados', desc: 'Vantagem em Percepção relacionada a audição ou olfato.' }
    ],
    actions: [
      { name: 'Mordida', desc: 'Ataque Corpo a Corpo: +3. Acerto: 4 (1d6 + 1) perfurante; CD 11 FOR ou fica Caído.' }
    ],
    parsedAttacks: [
      { id: 'atk-1', name: 'Mordida (CD 11 FOR ou Caído)', attackBonus: 3, damageFormula: '1d6+1', damageType: 'Perfurante' }
    ],
    notes: 'Apêndice D do Livro do Jogador (p. 308).'
  },
  {
    slug: 'corvo',
    name: 'Corvo',
    nameEn: 'Raven',
    source: 'pdf',
    size: 'Miúdo',
    type: 'beast',
    alignment: 'Imparcial',
    cr: '0',
    xp: 10,
    ac: 12,
    hp: 1,
    hpFormula: '1d4 - 1',
    speed: '3 m, voo 15 m',
    avatar: '🐦‍⬛',
    abilities: { str: 2, dex: 14, con: 8, int: 2, wis: 12, cha: 6 },
    skills: { Percepção: 3 },
    senses: 'Percepção passiva 13',
    languages: '—',
    specialAbilities: [
      { name: 'Mimetismo', desc: 'Pode imitar sons simples que ouviu (CD 10 Intuição para perceber).' }
    ],
    actions: [
      { name: 'Bico', desc: 'Ataque Corpo a Corpo: +4. Acerto: 1 perfurante.' }
    ],
    parsedAttacks: [
      { id: 'atk-1', name: 'Bico', attackBonus: 4, damageFormula: '1', damageType: 'Perfurante' }
    ],
    notes: 'Apêndice D do Livro do Jogador (p. 305) — Familiar.'
  },
  {
    slug: 'morcego',
    name: 'Morcego',
    nameEn: 'Bat',
    source: 'both',
    size: 'Miúdo',
    type: 'beast',
    alignment: 'Imparcial',
    cr: '0',
    xp: 10,
    ac: 12,
    hp: 1,
    hpFormula: '1d4 - 1',
    speed: '1,5 m, voo 9 m',
    avatar: '🦇',
    abilities: { str: 2, dex: 15, con: 8, int: 2, wis: 12, cha: 4 },
    senses: 'Percepção às Cegas 18 m, Percepção passiva 11',
    languages: '—',
    specialAbilities: [
      { name: 'Ecolocalização', desc: 'Não pode usar Percepção às Cegas enquanto Surdo.' },
      { name: 'Audição Aguçada', desc: 'Vantagem em Percepção relacionada à audição.' }
    ],
    actions: [
      { name: 'Mordida', desc: 'Ataque Corpo a Corpo: +0. Acerto: 1 perfurante.' }
    ],
    parsedAttacks: [
      { id: 'atk-1', name: 'Mordida', attackBonus: 0, damageFormula: '1', damageType: 'Perfurante' }
    ],
    notes: 'Apêndice D do Livro do Jogador (p. 308) — Familiar.'
  }
];

function loadJsonSafe(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`Erro ao ler ${filePath}:`, err.message);
  }
  return fallback;
}

const pocketCatalog = loadJsonSafe(CATALOG_FILE, []);
const detailCache = loadJsonSafe(CACHE_FILE, {});
const pdfBySlug = new Map(PDF_CREATURES.map((c) => [c.slug, c]));

// Pre-semeia o cache com as criaturas do PDF (se não houver versão mais rica já salva)
for (const c of PDF_CREATURES) {
  if (!detailCache[c.slug]) {
    detailCache[c.slug] = c;
  }
}

function saveCache() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(detailCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar bestiary-cache.json:', err.message);
  }
}

function parseAttackFromAction(name, desc, trDesc) {
  const text = `${desc || ''} ${trDesc || ''}`;
  // Procura padrão "+X" ou "Attack: +X" e dado de dano como "(2d6 + 5)" ou "1d8+3"
  const hitMatch = text.match(/(?:Attack|Ataque|atingir)[^+\-\d]*([+-]\d+)/i) || text.match(/\s([+-]\d+),/);
  const dmgMatch = text.match(/\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)/i) || text.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/i);
  if (!hitMatch && !dmgMatch) return null;

  const typeMatch = text.match(/(Bludgeoning|Piercing|Slashing|Fire|Cold|Lightning|Poison|Acid|Psychic|Necrotic|Radiant|Force|Thunder|Concussão|Perfurante|Cortante|Fogo|Frio|Elétrico|Veneno|Ácido|Psíquico|Necrótico|Radiante|Energia|Trovejante)/i);
  const typeMap = {
    bludgeoning: 'Concussão',
    piercing: 'Perfurante',
    slashing: 'Cortante',
    fire: 'Fogo',
    cold: 'Frio',
    lightning: 'Elétrico',
    poison: 'Veneno',
    acid: 'Ácido',
    psychic: 'Psíquico',
    necrotic: 'Necrótico',
    radiant: 'Radiante',
    force: 'Energia',
    thunder: 'Trovejante'
  };
  const rawType = typeMatch ? typeMatch[1].toLowerCase() : 'físico';

  return {
    id: `atk-${Math.random().toString(36).slice(2, 8)}`,
    name,
    attackBonus: hitMatch ? parseInt(hitMatch[1], 10) : 0,
    damageFormula: dmgMatch ? dmgMatch[1].replace(/\s+/g, '') : '1d6',
    damageType: typeMap[rawType] || typeMatch?.[1] || 'Físico'
  };
}

function formatSpeed(speedObj) {
  if (!speedObj) return '9 m';
  if (typeof speedObj === 'string') return speedObj;
  const labels = {
    walk: '',
    fly: 'voo ',
    swim: 'natação ',
    climb: 'escalada ',
    burrow: 'escavação '
  };
  return Object.entries(speedObj)
    .map(([k, v]) => `${labels[k] ?? k + ' '}${v}`)
    .join(', ');
}

function translateActionsList(list, trMap = {}) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    const tr = trMap?.[item.name];
    let name = item.name;
    let desc = item.desc;
    if (typeof tr === 'string') {
      desc = tr;
    } else if (tr && typeof tr === 'object') {
      name = tr.name || item.name;
      desc = tr.desc || item.desc;
    }
    return { name, desc, rawName: item.name, rawDesc: item.desc };
  });
}

async function fetchFromPocketDm(slug) {
  const url = `https://pocketdm.com.br/monstros/${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AetheriaVTT/1.0 (D&D 5e Bestiary Viewer)' }
  });
  if (!res.ok) {
    throw new Error(`PocketDM retornou status ${res.status}`);
  }
  const html = await res.text();

  let monster = null;
  let translation = null;

  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)) {
    let decoded;
    try {
      decoded = JSON.parse(`"${m[1]}"`);
    } catch {
      continue;
    }
    if (!decoded.includes('"monster":{')) continue;

    const extractObj = (key) => {
      const idx = decoded.indexOf(`"${key}":{`);
      if (idx === -1) return null;
      const start = decoded.indexOf('{', idx);
      let depth = 0,
        inStr = false,
        esc = false,
        end = -1;
      for (let i = start; i < decoded.length; i++) {
        const ch = decoded[i];
        if (esc) {
          esc = false;
          continue;
        }
        if (ch === '\\') {
          esc = true;
          continue;
        }
        if (ch === '"') {
          inStr = !inStr;
          continue;
        }
        if (!inStr) {
          if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) {
              end = i;
              break;
            }
          }
        }
      }
      return end > -1 ? JSON.parse(decoded.slice(start, end + 1)) : null;
    };

    monster = extractObj('monster');
    translation = extractObj('initialTranslation');
    if (monster) break;
  }

  if (!monster) {
    throw new Error('Não foi possível extrair os dados da criatura no PocketDM.');
  }

  const catalogMatch = pocketCatalog.find((c) => c.slug === slug);
  const trTraits = translation?.special_abilities || {};
  const trActions = translation?.actions || {};
  const trReactions = translation?.reactions || {};
  const trLegendary = translation?.legendary_actions || {};

  const specialAbilities = translateActionsList(monster.special_abilities, trTraits).map(
    ({ name, desc }) => ({ name, desc })
  );
  const actionsRaw = translateActionsList(monster.actions, trActions);
  const actions = actionsRaw.map(({ name, desc }) => ({ name, desc }));
  const reactions = translateActionsList(monster.reactions, trReactions).map(
    ({ name, desc }) => ({ name, desc })
  );
  const legendaryActions = translateActionsList(
    monster.legendary_actions,
    trLegendary
  ).map(({ name, desc }) => ({ name, desc }));

  const parsedAttacks = actionsRaw
    .filter((a) => !/multiattack|multiataque/i.test(a.name))
    .map((a) => parseAttackFromAction(a.name, a.desc, a.rawDesc))
    .filter(Boolean);

  const acVal = Array.isArray(monster.armor_class)
    ? monster.armor_class[0]?.value ?? 10
    : Number(monster.armor_class ?? 10);

  const rawType = (monster.type || catalogMatch?.type || 'monstrosity').toLowerCase();

  const entry = {
    slug,
    name: translation?.name || catalogMatch?.namePt || monster.name,
    nameEn: monster.name || catalogMatch?.nameEn || '',
    source: pdfBySlug.has(slug) ? 'both' : 'pocketdm',
    size: SIZE_PT[monster.size] || monster.size || 'Médio',
    type: rawType,
    alignment: monster.alignment || 'Imparcial',
    cr: String(monster.cr ?? monster.challenge_rating ?? catalogMatch?.cr ?? '1'),
    xp: monster.xp || 0,
    ac: acVal,
    hp: Number(monster.hit_points ?? 10),
    hpFormula: monster.hp_formula || monster.hit_dice || '2d8',
    speed: formatSpeed(monster.speed),
    tokenUrl: monster.token_url || monster.fallback_token_url || '',
    avatar: AVATAR_BY_TYPE[rawType] || '👹',
    abilities: {
      str: Number(monster.str ?? 10),
      dex: Number(monster.dex ?? 10),
      con: Number(monster.con ?? 10),
      int: Number(monster.int ?? 10),
      wis: Number(monster.wis ?? 10),
      cha: Number(monster.cha ?? 10)
    },
    savingThrows: monster.saving_throws || {},
    skills: monster.skills || {},
    damageVulnerabilities: monster.damage_vulnerabilities || '',
    damageResistances: monster.damage_resistances || '',
    damageImmunities: monster.damage_immunities || '',
    conditionImmunities: monster.condition_immunities || '',
    senses: monster.senses || '',
    languages: monster.languages || '—',
    specialAbilities,
    actions,
    reactions,
    legendaryActions,
    parsedAttacks,
    notes: `Importado de PocketDM (${monster.source || 'SRD'} ${monster.ruleset_version || ''}).`
  };

  detailCache[slug] = entry;
  saveCache();
  return entry;
}

function getMergedCatalog() {
  const bySlug = new Map();

  for (const item of pocketCatalog) {
    bySlug.set(item.slug, {
      slug: item.slug,
      name: item.namePt || item.name,
      namePt: item.namePt || item.name,
      nameEn: item.nameEn || '',
      cr: String(item.cr ?? '0'),
      type: (item.type || 'monstrosity').toLowerCase(),
      source: pdfBySlug.has(item.slug) ? 'both' : 'pocketdm',
      hasFullLocal: Boolean(detailCache[item.slug])
    });
  }

  for (const c of PDF_CREATURES) {
    if (!bySlug.has(c.slug)) {
      bySlug.set(c.slug, {
        slug: c.slug,
        name: c.name,
        namePt: c.name,
        nameEn: c.nameEn || '',
        cr: c.cr,
        type: c.type,
        source: c.source || 'pdf',
        hasFullLocal: true
      });
    }
  }

  return Array.from(bySlug.values()).sort((a, b) =>
    a.namePt.localeCompare(b.namePt, 'pt-BR')
  );
}

export function registerBestiaryRoutes(app) {
  app.get('/api/bestiary', (_req, res) => {
    const items = getMergedCatalog();
    res.json({ total: items.length, typeLabels: TYPE_PT, items });
  });

  app.get('/api/bestiary/:slug', async (req, res) => {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!slug) {
      return res.status(400).json({ error: 'Slug inválido.' });
    }

    // Se já temos no cache de disco ou no PDF (e se for só PDF, retorna direto; se for PocketDM sem tokenUrl, tenta enriquecer)
    const cached = detailCache[slug];
    if (cached && (cached.source === 'pdf' || cached.tokenUrl || cached.fetchedFromPocketDm)) {
      return res.json(cached);
    }

    try {
      const entry = await fetchFromPocketDm(slug);
      entry.fetchedFromPocketDm = true;
      detailCache[slug] = entry;
      saveCache();
      return res.json(entry);
    } catch (err) {
      // Fallback para versão local do PDF se offline
      if (cached) {
        return res.json(cached);
      }
      return res.status(502).json({
        error: 'Não foi possível buscar a ficha completa no PocketDM.',
        details: err.message
      });
    }
  });
}

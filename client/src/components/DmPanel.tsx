import React, { useRef, useState } from 'react';
import {
  Map,
  Eye,
  EyeOff,
  Upload,
  Download,
  Skull,
  FileText,
  Plus,
  Image as ImageIcon,
  Sparkles,
  BookOpen,
  Layers,
  Trash2,
  Save,
  Gift,
  Users,
  Search,
  ArrowLeftRight,
  Dices
} from 'lucide-react';
import {
  CharacterSheet,
  Currency,
  InventoryItem,
  MapConfig,
  OnlineUser,
  RollLimitConfig,
  Token,
  TradeOffer
} from '../types/rpg';
import { BATTLEMAP_LIBRARY, DND_ITEMS, PRESET_MAPS, PRESET_NPCS } from '../data/dnd5e';
import {
  downloadSampleNpcTemplate,
  exportCharacterAsJson,
  parseImportedCharacterJson
} from '../utils/importer';

interface DmPanelProps {
  map: MapConfig;
  dmNotes: string;
  npcs: CharacterSheet[];
  playerCharacters: CharacterSheet[];
  onlineUsers: OnlineUser[];
  playerCharLimits: Record<string, number>;
  allowMultiCharAll: boolean;
  rollLimit: RollLimitConfig;
  trades: TradeOffer[];
  scenes: { id: string; name: string }[];
  activeSceneId?: string;
  onUpdateMap: (patch: Partial<MapConfig>) => void;
  onFillFog: (covered: boolean) => void;
  onAddToken: (token: Omit<Token, 'id'>) => void;
  onSaveCharacter: (char: CharacterSheet) => void;
  onUpdateDmNotes: (notes: string) => void;
  onOpenBestiaryBook: () => void;
  onCreateScene: (
    name: string,
    presetId: string,
    imageUrl?: string,
    cols?: number,
    rows?: number
  ) => void;
  onSwitchScene: (sceneId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onExportBackup: () => void;
  onImportBackup: (data: any) => void;
  onSetPlayerCharLimit: (payload: {
    playerName?: string;
    limit?: number;
    allowAll?: boolean;
  }) => void;
  onSetRollLimit: (cfg: RollLimitConfig) => void;
  onGrantReward: (payload: {
    targetCharIds: string[];
    item?: Partial<InventoryItem>;
    coins?: Partial<Currency>;
  }) => void;
  onCreateTrade: (payload: {
    direction: 'dm_to_player';
    characterId: string;
    item?: Partial<InventoryItem>;
    coins: Partial<Currency>;
  }) => void;
  onRespondTrade: (tradeId: string, accept: boolean, counterCoins?: Partial<Currency>) => void;
  onCounterTrade: (tradeId: string, counterCoins: Partial<Currency>, counterNote?: string) => void;
  onClearResolvedTrades: () => void;
}

export const DmPanel: React.FC<DmPanelProps> = ({
  map,
  dmNotes,
  npcs,
  playerCharacters,
  onlineUsers,
  playerCharLimits,
  allowMultiCharAll,
  rollLimit,
  trades,
  scenes,
  activeSceneId,
  onUpdateMap,
  onFillFog,
  onAddToken,
  onSaveCharacter,
  onUpdateDmNotes,
  onOpenBestiaryBook,
  onCreateScene,
  onSwitchScene,
  onDeleteScene,
  onExportBackup,
  onImportBackup,
  onSetPlayerCharLimit,
  onSetRollLimit,
  onGrantReward,
  onCreateTrade,
  onRespondTrade,
  onCounterTrade,
  onClearResolvedTrades
}) => {
  const [section, setSection] = useState<'npcs' | 'party' | 'map' | 'notes'>('npcs');
  const [mapUrlInput, setMapUrlInput] = useState(map.imageUrl || '');
  const [notesDraft, setNotesDraft] = useState(dmNotes);
  const [importMsg, setImportMsg] = useState('');
  const [newSceneName, setNewSceneName] = useState('');

  // Recompensa & Baú de Itens
  const [rewardTarget, setRewardTarget] = useState<string>('all');
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategory, setItemCategory] = useState('Todos');
  const [selectedRewardItemId, setSelectedRewardItemId] = useState(DND_ITEMS[0].id);
  const [customItemMode, setCustomItemMode] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemWeight, setCustomItemWeight] = useState('0.5');
  const [rewardQty, setRewardQty] = useState(1);
  const [rewardGp, setRewardGp] = useState(0);
  const [rewardSp, setRewardSp] = useState(0);
  const [rewardCp, setRewardCp] = useState(0);
  const [rewardFeedback, setRewardFeedback] = useState('');
  const [newPlayerGrantName, setNewPlayerGrantName] = useState('');

  // Contraproposta em negociações com jogadores
  const [counterTargetId, setCounterTargetId] = useState<string | null>(null);
  const [counterGp, setCounterGp] = useState(0);
  const [counterSp, setCounterSp] = useState(0);
  const [counterCp, setCounterCp] = useState(0);
  const [counterNote, setCounterNote] = useState('');

  // Form rápido de Token customizado
  const [tokName, setTokName] = useState('Bandido');
  const [tokAvatar, setTokAvatar] = useState('🗡️');
  const [tokImageUrl, setTokImageUrl] = useState('');
  const [tokHp, setTokHp] = useState(11);
  const [tokAc, setTokAc] = useState(12);
  const [tokSize, setTokSize] = useState(1);
  const [tokHidden, setTokHidden] = useState(true);

  const npcFileRef = useRef<HTMLInputElement>(null);
  const mapFileRef = useRef<HTMLInputElement>(null);
  const tokenImgRef = useRef<HTMLInputElement>(null);
  const backupFileRef = useRef<HTMLInputElement>(null);

  const handleNpcImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportMsg('');
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseImportedCharacterJson(text, {
        isNpcDefault: true,
        ownerName: 'Mestre'
      });
      for (const npc of imported) {
        onSaveCharacter({ ...npc, isNpc: true });
      }
      setImportMsg(`${imported.length} NPC(s) importado(s) com sucesso!`);
    } catch {
      setImportMsg('Erro ao ler JSON. Use um arquivo válido ou baixe o modelo.');
    } finally {
      e.target.value = '';
    }
  };

  const handleMapUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateMap({ imageUrl: reader.result });
        setMapUrlInput('');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const spawnPresetOrSavedNpc = (
    npc: Omit<CharacterSheet, 'id' | 'ownerName'> & { id?: string },
    hidden: boolean
  ) => {
    // Garante que a ficha do NPC exista na sala para poder rolar ataques
    const charId = npc.id || `npc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (!npc.id) {
      onSaveCharacter({
        ...npc,
        id: charId,
        ownerName: 'Mestre',
        isNpc: true,
        isSecretNpc: hidden
      });
    }

    const size = npc.race.toLowerCase().includes('grande') ? 2 : 1;
    onAddToken({
      name: npc.name,
      x: 5 + Math.floor(Math.random() * 6),
      y: 5 + Math.floor(Math.random() * 5),
      size,
      color: hidden ? '#a855f7' : '#ef4444',
      avatar: npc.avatar || '👹',
      imageUrl: npc.imageUrl,
      hp: npc.hp,
      maxHp: npc.maxHp,
      ac: npc.ac,
      hidden,
      ownerName: 'Mestre',
      characterId: charId,
      type: 'monster',
      conditions: []
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50">
      {/* Sub-abas do Mestre */}
      <div className="p-2 border-b border-slate-800 bg-slate-950/70 grid grid-cols-4 gap-1 text-[11px]">
        <button
          onClick={() => setSection('npcs')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-semibold cursor-pointer ${
            section === 'npcs' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Skull className="w-3.5 h-3.5" />
          NPCs
        </button>
        <button
          onClick={() => setSection('party')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-semibold cursor-pointer relative ${
            section === 'party' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gift className="w-3.5 h-3.5" />
          Grupo
          {trades.filter((t) => t.status === 'pending' && t.direction !== 'dm_to_player').length >
            0 && (
            <span className="ml-0.5 px-1 rounded-full bg-teal-500 text-slate-950 text-[9px] font-black">
              {
                trades.filter((t) => t.status === 'pending' && t.direction !== 'dm_to_player')
                  .length
              }
            </span>
          )}
        </button>
        <button
          onClick={() => setSection('map')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-semibold cursor-pointer ${
            section === 'map' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          Mapas
        </button>
        <button
          onClick={() => setSection('notes')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-semibold cursor-pointer ${
            section === 'notes' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Notas
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {section === 'npcs' && (
          <>
            {/* Livro do Bestiário Completo (PDF + PocketDM) */}
            <button
              onClick={onOpenBestiaryBook}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              Abrir Livro dos Monstros (PDF + PocketDM)
            </button>

            {/* Importação de NPCs via Arquivo */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Importar NPCs / Monstros (.json)
              </div>
              <p className="text-[11px] text-slate-400">
                Importe arquivos JSON prontos (formato Aetheria ou Open5e/5e SRD) para gerar fichas e tokens na hora.
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => npcFileRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importar Arquivo JSON
                </button>
                <button
                  onClick={downloadSampleNpcTemplate}
                  className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                  title="Baixar arquivo JSON modelo de exemplo"
                >
                  <Download className="w-3.5 h-3.5" />
                  Modelo
                </button>
                <input
                  ref={npcFileRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleNpcImport}
                  className="hidden"
                />
              </div>
              {importMsg && (
                <div className="text-[11px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-2 py-1">
                  {importMsg}
                </div>
              )}
            </div>

            {/* NPCs Importados / Salvos na Campanha */}
            {npcs.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase text-slate-400 px-1">
                  NPCs da Campanha ({npcs.length})
                </div>
                {npcs.map((npc) => (
                  <div
                    key={npc.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{npc.avatar}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-100 truncate">
                          {npc.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          PV {npc.maxHp} • CA {npc.ac} {npc.cr ? `• ND ${npc.cr}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => spawnPresetOrSavedNpc(npc, true)}
                        className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/35 text-purple-200 text-[10px] font-semibold cursor-pointer"
                        title="Colocar no mapa OCULTO dos jogadores"
                      >
                        + Oculto
                      </button>
                      <button
                        onClick={() => spawnPresetOrSavedNpc(npc, false)}
                        className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 text-[10px] font-semibold cursor-pointer"
                        title="Colocar no mapa VISÍVEL"
                      >
                        + Visível
                      </button>
                      <button
                        onClick={() => exportCharacterAsJson(npc)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        title="Exportar JSON"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bestiário Rápido (D&D 5e SRD) */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase text-slate-400 px-1">
                Bestiário Rápido (SRD)
              </div>
              {PRESET_NPCS.map((npc, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{npc.avatar}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-200 truncate">{npc.name}</div>
                      <div className="text-[10px] text-slate-400">
                        PV {npc.maxHp} • CA {npc.ac} • ND {npc.cr}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => spawnPresetOrSavedNpc(npc, true)}
                      className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/35 text-purple-200 text-[10px] font-semibold cursor-pointer"
                      title="Invocar oculto dos jogadores"
                    >
                      + Oculto
                    </button>
                    <button
                      onClick={() => spawnPresetOrSavedNpc(npc, false)}
                      className="px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500/35 text-sky-200 text-[10px] font-semibold cursor-pointer"
                      title="Invocar visível no mapa"
                    >
                      + Visível
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Criador Rápido de Token Avulso */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="text-xs font-bold text-slate-200">Criar Token Rápido</div>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                <input
                  type="text"
                  value={tokName}
                  onChange={(e) => setTokName(e.target.value)}
                  placeholder="Nome"
                  className="col-span-3 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100"
                />
                <input
                  type="text"
                  value={tokAvatar}
                  onChange={(e) => setTokAvatar(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-center"
                />
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400">PV</span>
                  <input
                    type="number"
                    value={tokHp}
                    onChange={(e) => setTokHp(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">CA</span>
                  <input
                    type="number"
                    value={tokAc}
                    onChange={(e) => setTokAc(parseInt(e.target.value, 10) || 10)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Tam.</span>
                  <select
                    value={tokSize}
                    onChange={(e) => setTokSize(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-1 py-1 text-slate-100"
                  >
                    <option value={1}>1x1</option>
                    <option value={2}>2x2</option>
                    <option value={3}>3x3</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <input
                  type="text"
                  value={tokImageUrl}
                  onChange={(e) => setTokImageUrl(e.target.value)}
                  placeholder="URL imagem do token (opcional)..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => tokenImgRef.current?.click()}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer"
                  title="Enviar foto do token"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={tokenImgRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') setTokImageUrl(reader.result);
                    };
                    reader.readAsDataURL(f);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tokHidden}
                    onChange={(e) => setTokHidden(e.target.checked)}
                    className="accent-purple-500"
                  />
                  Iniciar Oculto
                </label>
                <button
                  onClick={() =>
                    onAddToken({
                      name: tokName || 'Token',
                      x: 6,
                      y: 6,
                      size: tokSize,
                      color: tokHidden ? '#a855f7' : '#ef4444',
                      avatar: tokAvatar || '🛡️',
                      imageUrl: tokImageUrl.trim() || undefined,
                      hp: tokHp,
                      maxHp: tokHp,
                      ac: tokAc,
                      hidden: tokHidden,
                      ownerName: 'Mestre',
                      type: 'npc',
                      conditions: []
                    })
                  }
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
            </div>
          </>
        )}

        {section === 'party' && (() => {
          const playerNames = Array.from(
            new Set([
              ...onlineUsers.filter((u) => u.role === 'player').map((u) => u.name),
              ...playerCharacters.map((c) => c.ownerName).filter(Boolean),
              ...Object.keys(playerCharLimits || {})
            ])
          );

          const filteredItems = DND_ITEMS.filter((it) => {
            if (itemCategory !== 'Todos' && it.category !== itemCategory) return false;
            if (itemSearch.trim()) {
              const q = itemSearch.trim().toLowerCase();
              return (
                it.name.toLowerCase().includes(q) ||
                it.description.toLowerCase().includes(q)
              );
            }
            return true;
          });

          const activeRewardItem =
            filteredItems.find((i) => i.id === selectedRewardItemId) || filteredItems[0];

          const handleSendReward = (includeItem: boolean) => {
            const targets =
              rewardTarget === 'all'
                ? playerCharacters.map((c) => c.id)
                : [rewardTarget];
            if (targets.length === 0) return;

            const itemPayload = includeItem
              ? customItemMode
                ? customItemName.trim()
                  ? {
                      name: customItemName.trim(),
                      quantity: rewardQty,
                      weightKg: parseFloat(customItemWeight) || 0,
                      category: 'Recompensa'
                    }
                  : undefined
                : activeRewardItem
                ? {
                    name: activeRewardItem.name,
                    quantity: rewardQty,
                    weightKg: activeRewardItem.weightKg,
                    category: activeRewardItem.category,
                    value: activeRewardItem.value,
                    description: activeRewardItem.description
                  }
                : undefined
              : undefined;

            const hasCoins = rewardGp > 0 || rewardSp > 0 || rewardCp > 0;
            if (!itemPayload && !hasCoins) return;

            onGrantReward({
              targetCharIds: targets,
              item: itemPayload,
              coins: hasCoins ? { gp: rewardGp, sp: rewardSp, cp: rewardCp } : undefined
            });
            setRewardFeedback('✓ Recompensa enviada para a mochila!');
            setTimeout(() => setRewardFeedback(''), 2500);
          };

          const pendingTrades = trades.filter((t) => t.status === 'pending');

          return (
            <div className="space-y-3 text-xs">
              {/* Propostas de Comércio / Troca dos Jogadores */}
              <div className="bg-slate-950/80 border border-teal-500/35 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-300 flex items-center gap-1.5">
                    <ArrowLeftRight className="w-3.5 h-3.5" /> Negociações & Trocas ({pendingTrades.length})
                  </span>
                  {trades.some((t) => t.status === 'accepted' || t.status === 'rejected') && (
                    <button
                      onClick={onClearResolvedTrades}
                      className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Limpar histórico
                    </button>
                  )}
                </div>

                {trades.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">
                    Nenhuma proposta de compra ou venda dos jogadores ainda.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {[...trades].reverse().map((tr) => {
                      const fmtCoins = (c?: { pp?: number; gp?: number; ep?: number; sp?: number; cp?: number }) =>
                        [
                          c?.pp ? `${c.pp} PL` : '',
                          c?.gp ? `${c.gp} PO` : '',
                          c?.ep ? `${c.ep} PE` : '',
                          c?.sp ? `${c.sp} PP` : '',
                          c?.cp ? `${c.cp} PC` : ''
                        ]
                          .filter(Boolean)
                          .join(', ') || '0 PO';

                      const coinLabel = fmtCoins(tr.coins);
                      const counterLabel = tr.counterCoins ? fmtCoins(tr.counterCoins) : '';
                      const isEditingCounter = counterTargetId === tr.id;

                      return (
                        <div
                          key={tr.id}
                          className={`rounded-lg border p-2 space-y-1.5 ${
                            tr.status === 'pending'
                              ? 'bg-slate-900 border-teal-500/40'
                              : tr.status === 'countered'
                              ? 'bg-amber-950/25 border-amber-500/45'
                              : tr.status === 'accepted'
                              ? 'bg-emerald-950/20 border-emerald-500/20 opacity-75'
                              : 'bg-rose-950/20 border-rose-500/20 opacity-65'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-100 truncate">
                              {tr.direction === 'sell_to_dm'
                                ? `💰 ${tr.characterName} vende ${tr.item?.quantity || 1}× ${tr.item?.name}`
                                : tr.direction === 'buy_from_dm'
                                ? `🛒 ${tr.characterName} quer ${tr.item?.quantity || 1}× ${tr.item?.name}`
                                : `🏪 Oferta p/ ${tr.characterName}: ${tr.item?.quantity || 1}× ${tr.item?.name}`}
                            </span>
                            <span className="text-[10px] font-mono text-amber-300 shrink-0">
                              {coinLabel}
                            </span>
                          </div>

                          {tr.status === 'countered' && (
                            <div className="text-[10px] bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1 text-amber-200 flex items-center justify-between gap-2">
                              <div>
                                ⚖️ <strong>Contraproposta:</strong>{' '}
                                <span className="font-mono font-bold">{counterLabel}</span>
                                {tr.counterNote ? ` — "${tr.counterNote}"` : ''}
                              </div>
                              <button
                                onClick={() => onRespondTrade(tr.id, false)}
                                className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 font-semibold shrink-0 cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}

                          {tr.status === 'pending' ? (
                            tr.direction === 'dm_to_player' ? (
                              <div className="text-[10px] text-slate-400">
                                Aguardando jogador aceitar...
                              </div>
                            ) : isEditingCounter ? (
                              <div className="bg-slate-950/90 border border-amber-500/40 rounded-lg p-2 space-y-1.5">
                                <div className="text-[10px] font-bold text-amber-300">
                                  {tr.direction === 'sell_to_dm'
                                    ? 'Valor que você aceita pagar pelo item:'
                                    : 'Novo valor pedido ao jogador pelo item:'}
                                </div>
                                <div className="grid grid-cols-3 gap-1 text-center">
                                  <div>
                                    <span className="text-[9px] text-amber-300">PO</span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={counterGp}
                                      onChange={(e) =>
                                        setCounterGp(Math.max(0, parseInt(e.target.value, 10) || 0))
                                      }
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center font-mono text-[11px] text-amber-200"
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-300">PP</span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={counterSp}
                                      onChange={(e) =>
                                        setCounterSp(Math.max(0, parseInt(e.target.value, 10) || 0))
                                      }
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center font-mono text-[11px] text-slate-200"
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-orange-300">PC</span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={counterCp}
                                      onChange={(e) =>
                                        setCounterCp(Math.max(0, parseInt(e.target.value, 10) || 0))
                                      }
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center font-mono text-[11px] text-orange-200"
                                    />
                                  </div>
                                </div>
                                <input
                                  type="text"
                                  value={counterNote}
                                  onChange={(e) => setCounterNote(e.target.value)}
                                  placeholder="Observação opcional (ex: Item usado, pago menos)..."
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-100"
                                />
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => {
                                      onCounterTrade(
                                        tr.id,
                                        { gp: counterGp, sp: counterSp, cp: counterCp },
                                        counterNote
                                      );
                                      setCounterTargetId(null);
                                      setCounterNote('');
                                    }}
                                    className="flex-1 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] cursor-pointer"
                                  >
                                    Enviar Contraproposta
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCounterTargetId(null);
                                      setCounterNote('');
                                    }}
                                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                                  >
                                    Voltar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => onRespondTrade(tr.id, true)}
                                  className="flex-1 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] cursor-pointer"
                                >
                                  ✓ Aceitar
                                </button>
                                <button
                                  onClick={() => {
                                    setCounterTargetId(tr.id);
                                    setCounterGp(tr.coins.gp || 0);
                                    setCounterSp(tr.coins.sp || 0);
                                    setCounterCp(tr.coins.cp || 0);
                                    setCounterNote('');
                                  }}
                                  className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-200 font-semibold text-[10px] cursor-pointer"
                                >
                                  ⚖️ Contrapropor
                                </button>
                                <button
                                  onClick={() => onRespondTrade(tr.id, false)}
                                  className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 font-semibold text-[10px] cursor-pointer"
                                >
                                  Recusar
                                </button>
                              </div>
                            )
                          ) : tr.status === 'countered' ? (
                            <div className="text-[10px] text-amber-300/80">
                              Aguardando {tr.characterName} aceitar ou recusar...
                            </div>
                          ) : (
                            <div className="text-[10px] font-semibold text-slate-400">
                              {tr.status === 'accepted' ? '✓ Concluída' : '✕ Recusada'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Controle de Limite de Rolagens por Jogador */}
              <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Dices className="w-3.5 h-3.5" /> Limite de Rolagens (Jogadores)
                  </span>
                  <button
                    onClick={() => onSetRollLimit({ ...rollLimit, enabled: !rollLimit.enabled })}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                      rollLimit.enabled
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {rollLimit.enabled ? 'Ativo' : 'Livre'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Evita rolagens em excesso: cada jogador pode rolar até{' '}
                  <strong className="text-slate-200">{rollLimit.maxRolls}</strong> vez(es) a cada{' '}
                  <strong className="text-slate-200">{rollLimit.windowSeconds}s</strong> (o Mestre não tem limite).
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-0.5">
                      Máx. Rolagens
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={rollLimit.maxRolls}
                      onChange={(e) =>
                        onSetRollLimit({
                          ...rollLimit,
                          maxRolls: Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1))
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-0.5">
                      Janela (segundos)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={300}
                      step={5}
                      value={rollLimit.windowSeconds}
                      onChange={(e) =>
                        onSetRollLimit({
                          ...rollLimit,
                          windowSeconds: Math.max(
                            5,
                            Math.min(300, parseInt(e.target.value, 10) || 40)
                          )
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Controle de Criação de Fichas por Jogador */}
              <div className="bg-slate-950/80 border border-sky-500/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Criação de Personagens
                  </span>
                  <button
                    onClick={() => onSetPlayerCharLimit({ allowAll: !allowMultiCharAll })}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                      allowMultiCharAll
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {allowMultiCharAll ? 'Livre p/ Todos' : 'Padrão: 1 Ficha'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Por padrão, cada jogador só pode criar <strong>1 ficha</strong> e mover apenas seu próprio token. Libere espaços extras abaixo se precisar:
                </p>

                {playerNames.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">
                    Nenhum jogador conectado ainda.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {playerNames.map((pName) => {
                      const count = playerCharacters.filter((c) => c.ownerName === pName).length;
                      const limit = playerCharLimits?.[pName] ?? 1;
                      return (
                        <div
                          key={pName}
                          className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5"
                        >
                          <div>
                            <div className="font-semibold text-slate-200">{pName}</div>
                            <div className="text-[10px] text-slate-400">
                              Fichas: {count} / {allowMultiCharAll ? '∞' : limit}
                            </div>
                          </div>
                          {!allowMultiCharAll && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  onSetPlayerCharLimit({
                                    playerName: pName,
                                    limit: Math.max(1, limit - 1)
                                  })
                                }
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <button
                                onClick={() =>
                                  onSetPlayerCharLimit({ playerName: pName, limit: limit + 1 })
                                }
                                className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-200 font-bold cursor-pointer"
                              >
                                +1 Ficha
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {!allowMultiCharAll && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newPlayerGrantName.trim()) return;
                      const cur = playerCharLimits?.[newPlayerGrantName.trim()] ?? 1;
                      onSetPlayerCharLimit({
                        playerName: newPlayerGrantName.trim(),
                        limit: cur + 1
                      });
                      setNewPlayerGrantName('');
                    }}
                    className="flex gap-1.5 pt-1"
                  >
                    <input
                      type="text"
                      value={newPlayerGrantName}
                      onChange={(e) => setNewPlayerGrantName(e.target.value)}
                      placeholder="Liberar +1 ficha por nome do jogador..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-100"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-semibold text-[11px] cursor-pointer"
                    >
                      +1
                    </button>
                  </form>
                )}
              </div>

              {/* Baú de Recompensas & Catálogo de Itens */}
              <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3 space-y-2.5">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Gift className="w-4 h-4" /> Baú de Itens & Recompensas
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    Destinatário
                  </label>
                  <select
                    value={rewardTarget}
                    onChange={(e) => setRewardTarget(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100"
                  >
                    <option value="all">
                      Todos os Personagens de Jogadores ({playerCharacters.length})
                    </option>
                    {playerCharacters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.avatar} {c.name} ({c.ownerName || 'Sem dono'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Alternar Catálogo PHB vs Customizado */}
                <div className="flex gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCustomItemMode(false)}
                    className={`flex-1 py-1 rounded font-semibold cursor-pointer ${
                      !customItemMode ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    Lista Oficial D&D 5e ({DND_ITEMS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomItemMode(true)}
                    className={`flex-1 py-1 rounded font-semibold cursor-pointer ${
                      customItemMode ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    Item Personalizado
                  </button>
                </div>

                {!customItemMode ? (
                  <div className="space-y-1.5">
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
                        <input
                          type="text"
                          value={itemSearch}
                          onChange={(e) => setItemSearch(e.target.value)}
                          placeholder="Buscar item (poção, espada, anel)..."
                          className="w-full pl-7 pr-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-slate-100"
                        />
                      </div>
                      <select
                        value={itemCategory}
                        onChange={(e) => setItemCategory(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200"
                      >
                        <option value="Todos">Todos</option>
                        <option value="Poção">Poção</option>
                        <option value="Arma">Arma</option>
                        <option value="Armadura">Armadura</option>
                        <option value="Equipamento">Equipamento</option>
                        <option value="Mágico / Tesouro">Mágico / Tesouro</option>
                      </select>
                    </div>

                    <select
                      size={5}
                      value={activeRewardItem?.id || ''}
                      onChange={(e) => setSelectedRewardItemId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-[11px] text-slate-100"
                    >
                      {filteredItems.map((it) => (
                        <option key={it.id} value={it.id} className="py-1">
                          [{it.category}] {it.name} — {it.weightKg}kg ({it.value})
                        </option>
                      ))}
                    </select>

                    {activeRewardItem && (
                      <div className="text-[10px] text-amber-200/90 bg-slate-900/90 border border-slate-800 rounded-lg p-2">
                        <strong>{activeRewardItem.name}:</strong> {activeRewardItem.description}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    <input
                      type="text"
                      value={customItemName}
                      onChange={(e) => setCustomItemName(e.target.value)}
                      placeholder="Nome do item..."
                      className="col-span-2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-100"
                    />
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      value={customItemWeight}
                      onChange={(e) => setCustomItemWeight(e.target.value)}
                      placeholder="Peso kg"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-100 font-mono"
                    />
                  </div>
                )}

                {/* Quantidade + Moedas de Recompensa */}
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400">Qtd Item</span>
                    <input
                      type="number"
                      min={1}
                      value={rewardQty}
                      onChange={(e) => setRewardQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-1 py-1 text-center font-mono text-slate-100"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-300">+ PO</span>
                    <input
                      type="number"
                      min={0}
                      value={rewardGp}
                      onChange={(e) => setRewardGp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-1 py-1 text-center font-mono text-amber-200"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-300">+ PP</span>
                    <input
                      type="number"
                      min={0}
                      value={rewardSp}
                      onChange={(e) => setRewardSp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-1 py-1 text-center font-mono text-slate-200"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-orange-300">+ PC</span>
                    <input
                      type="number"
                      min={0}
                      value={rewardCp}
                      onChange={(e) => setRewardCp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-1 py-1 text-center font-mono text-orange-200"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    disabled={playerCharacters.length === 0}
                    onClick={() => handleSendReward(true)}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    🎁 Dar Item{rewardGp || rewardSp || rewardCp ? ' + Moedas' : ''}
                  </button>
                  {rewardTarget !== 'all' && (rewardGp > 0 || rewardSp > 0 || rewardCp > 0) && (
                    <button
                      disabled={playerCharacters.length === 0}
                      onClick={() => {
                        const itemPayload = customItemMode
                          ? customItemName.trim()
                            ? {
                                name: customItemName.trim(),
                                quantity: rewardQty,
                                weightKg: parseFloat(customItemWeight) || 0,
                                category: 'Loja'
                              }
                            : undefined
                          : activeRewardItem
                          ? {
                              name: activeRewardItem.name,
                              quantity: rewardQty,
                              weightKg: activeRewardItem.weightKg,
                              category: activeRewardItem.category,
                              value: activeRewardItem.value,
                              description: activeRewardItem.description
                            }
                          : undefined;
                        if (!itemPayload) return;
                        onCreateTrade({
                          direction: 'dm_to_player',
                          characterId: rewardTarget,
                          item: itemPayload,
                          coins: { gp: rewardGp, sp: rewardSp, cp: rewardCp }
                        });
                        setRewardFeedback('✓ Oferta de venda enviada ao jogador!');
                        setTimeout(() => setRewardFeedback(''), 2500);
                      }}
                      className="py-2 px-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/35 border border-teal-500/40 text-teal-200 font-bold text-xs cursor-pointer"
                      title="Enviar proposta para o jogador pagar as moedas e receber o item"
                    >
                      🏪 Vender
                    </button>
                  )}
                  {(rewardGp > 0 || rewardSp > 0 || rewardCp > 0) && (
                    <button
                      disabled={playerCharacters.length === 0}
                      onClick={() => handleSendReward(false)}
                      className="py-2 px-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-200 font-bold text-xs cursor-pointer"
                    >
                      Só Moedas
                    </button>
                  )}
                </div>

                {rewardFeedback && (
                  <div className="text-center text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-lg py-1">
                    {rewardFeedback}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {section === 'map' && (
          <div className="space-y-3">
            {/* Gerenciador de Múltiplas Cenas / Mapas */}
            <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3 space-y-2">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Cenas & Mapas da Campanha
              </div>
              <div className="space-y-1">
                {scenes.map((sc) => {
                  const isActive = sc.id === activeSceneId;
                  return (
                    <div
                      key={sc.id}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <button
                        onClick={() => onSwitchScene(sc.id)}
                        className="flex-1 text-left truncate cursor-pointer"
                      >
                        {isActive ? '▶ ' : ''}
                        {sc.name}
                      </button>
                      {scenes.length > 1 && (
                        <button
                          onClick={() => onDeleteScene(sc.id)}
                          className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                          title="Excluir Cena"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onCreateScene(newSceneName.trim() || `Cena ${scenes.length + 1}`, 'dungeon');
                  setNewSceneName('');
                }}
                className="flex gap-1.5 pt-1"
              >
                <input
                  type="text"
                  value={newSceneName}
                  onChange={(e) => setNewSceneName(e.target.value)}
                  placeholder="Nova cena (ex: Taverna)..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  + Cena
                </button>
              </form>
            </div>

            {/* Controle da Névoa de Guerra */}
            <div className="bg-slate-950/80 border border-purple-500/30 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300">Névoa de Guerra (Fog of War)</span>
                <button
                  onClick={() => onUpdateMap({ fogEnabled: !map.fogEnabled })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    map.fogEnabled
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {map.fogEnabled ? 'Ativada' : 'Desativada'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Use as ferramentas de Olho na barra esquerda do tabuleiro para pintar ou revelar células. Para você (Mestre) a névoa é transparente; para os jogadores ela é 100% preta.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onFillFog(true)}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-semibold cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5" /> Cobrir Tudo
                </button>
                <button
                  onClick={() => onFillFog(false)}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-xs font-semibold cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Revelar Tudo
                </button>
              </div>
            </div>

            {/* Mapas Ilustrados da Mesa */}
            <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3 space-y-2">
              <div className="text-xs font-bold text-emerald-300 flex items-center justify-between">
                <span>Mapas Ilustrados ({BATTLEMAP_LIBRARY.length})</span>
                <span className="text-[10px] font-normal text-slate-400">Clique para aplicar</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {BATTLEMAP_LIBRARY.map((bm) => {
                  const isActive = map.imageUrl === bm.imageUrl;
                  return (
                    <div
                      key={bm.id}
                      className={`rounded-xl border overflow-hidden transition ${
                        isActive
                          ? 'border-amber-400 bg-amber-500/15'
                          : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 p-2">
                        <img
                          src={bm.imageUrl}
                          alt={bm.name}
                          className="w-16 h-11 object-cover rounded-lg border border-slate-700 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-100 truncate">
                            {bm.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {bm.tag} • Grid {bm.cols}×{bm.rows}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => {
                              onUpdateMap({
                                imageUrl: bm.imageUrl,
                                cols: bm.cols,
                                rows: bm.rows,
                                gridColor: 'rgba(255, 255, 255, 0.05)'
                              });
                              setMapUrlInput(bm.imageUrl);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                              isActive
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 border border-emerald-500/40'
                            }`}
                          >
                            {isActive ? 'Ativo' : 'Usar'}
                          </button>
                          <button
                            onClick={() =>
                              onCreateScene(bm.name, 'dungeon', bm.imageUrl, bm.cols, bm.rows)
                            }
                            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                            title="Criar uma nova cena separada com este mapa"
                          >
                            + Cena
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cenários Prontos */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="text-xs font-bold text-slate-200">Cenários Prontos</div>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESET_MAPS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onUpdateMap({
                        presetId: preset.id,
                        imageUrl: '',
                        cols: 26,
                        rows: 18,
                        gridColor: 'rgba(255, 255, 255, 0.14)'
                      });
                      setMapUrlInput('');
                    }}
                    className={`p-2 rounded-lg border text-xs text-left cursor-pointer transition ${
                      !map.imageUrl && map.presetId === preset.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Imagem Customizada de Mapa */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                Imagem de Mapa Customizada
              </div>
              <button
                onClick={() => mapFileRef.current?.click()}
                className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Enviar Imagem do Computador
              </button>
              <input
                ref={mapFileRef}
                type="file"
                accept="image/*"
                onChange={handleMapUpload}
                className="hidden"
              />
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={mapUrlInput}
                  onChange={(e) => setMapUrlInput(e.target.value)}
                  placeholder="Ou cole a URL da imagem..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                />
                <button
                  onClick={() => onUpdateMap({ imageUrl: mapUrlInput })}
                  className="px-3 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Aplicar
                </button>
              </div>
            </div>

            {/* Dimensões e Visibilidade da Grade */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">Grade do Tabuleiro</span>
                <div className="flex gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                  {(
                    [
                      ['rgba(255, 255, 255, 0.14)', 'Normal'],
                      ['rgba(255, 255, 255, 0.05)', 'Discreta'],
                      ['transparent', 'Oculta']
                    ] as const
                  ).map(([val, lbl]) => (
                    <button
                      key={lbl}
                      onClick={() => onUpdateMap({ gridColor: val })}
                      className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                        map.gridColor === val
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400">Colunas</span>
                  <input
                    type="number"
                    min={8}
                    max={100}
                    value={map.cols}
                    onChange={(e) => onUpdateMap({ cols: Math.max(8, parseInt(e.target.value, 10) || 20) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Linhas</span>
                  <input
                    type="number"
                    min={8}
                    max={100}
                    value={map.rows}
                    onChange={(e) => onUpdateMap({ rows: Math.max(8, parseInt(e.target.value, 10) || 15) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Grid (px)</span>
                  <input
                    type="number"
                    min={28}
                    max={100}
                    value={map.gridSize}
                    onChange={(e) =>
                      onUpdateMap({ gridSize: Math.max(28, parseInt(e.target.value, 10) || 52) })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {section === 'notes' && (
          <div className="space-y-2 h-full flex flex-col">
            <div className="text-xs text-purple-300 bg-purple-500/10 border border-purple-500/30 rounded-xl p-2.5">
              🔒 <strong>Área Privada do Mestre:</strong> Estas anotações nunca são enviadas para os jogadores.
            </div>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={() => onUpdateDmNotes(notesDraft)}
              rows={14}
              placeholder="Escreva segredos da trama, CDs de armadilhas, tesouros..."
              className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={() => onUpdateDmNotes(notesDraft)}
              className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              Salvar Notas do Mestre
            </button>

            <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2">
              <button
                onClick={onExportBackup}
                className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" /> Backup Mesa
              </button>
              <button
                onClick={() => backupFileRef.current?.click()}
                className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-sky-400" /> Restaurar JSON
              </button>
              <input
                ref={backupFileRef}
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const data = JSON.parse(await file.text());
                    onImportBackup(data);
                  } catch {
                    // ignore invalid
                  }
                  e.target.value = '';
                }}
                className="hidden"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

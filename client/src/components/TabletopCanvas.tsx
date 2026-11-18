import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MousePointer,
  Ruler,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Hand,
  Trash2,
  Swords,
  Heart,
  Shield,
  Plus,
  Minus,
  Pencil,
  Eraser,
  CircleDot,
  Flame,
  RotateCw,
  Users,
  X
} from 'lucide-react';
import { MapConfig, MapDrawing, MapPing, Role, Token } from '../types/rpg';
import { DND_CONDITIONS, PRESET_MAPS } from '../data/dnd5e';
import { getMonster3DSprite } from '../utils/monsterSpriteRenderer';

interface TabletopCanvasProps {
  map: MapConfig;
  tokens: Token[];
  drawings: MapDrawing[];
  pings: MapPing[];
  activeTokenId?: string;
  role: Role;
  userName: string;
  onMoveToken: (id: string, x: number, y: number) => void;
  onUpdateToken: (id: string, patch: Partial<Token>) => void;
  onUpdateTokens?: (updates: { id: string; patch: Partial<Token> }[]) => void;
  onDeleteToken: (id: string) => void;
  onToggleFogCells: (cells: string[], covered: boolean) => void;
  onAddToInitiative: (token: Token | Token[]) => void;
  onAddDrawing: (drawing: MapDrawing) => void;
  onClearDrawings: () => void;
  onPing: (x: number, y: number, color: string) => void;
}

type ToolMode = 'select' | 'pan' | 'measure' | 'draw' | 'aoe' | 'ping' | 'fog-reveal' | 'fog-cover';
type AoeShape = 'sphere' | 'cone' | 'cube' | 'line';

export const TabletopCanvas: React.FC<TabletopCanvasProps> = ({
  map,
  tokens,
  drawings,
  pings,
  activeTokenId,
  role,
  userName,
  onMoveToken,
  onUpdateToken,
  onUpdateTokens,
  onDeleteToken,
  onToggleFogCells,
  onAddToInitiative,
  onAddDrawing,
  onClearDrawings,
  onPing
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const tokenImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const [tool, setTool] = useState<ToolMode>('select');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [modelStyle3d, setModelStyle3d] = useState<'model' | 'standee'>('model');
  const [drawColor, setDrawColor] = useState('#f59e0b');
  const [aoeShape, setAoeShape] = useState<AoeShape>('sphere');
  const [aoeMeters, setAoeMeters] = useState(6);
  const [aoePos, setAoePos] = useState<{ x: number; y: number; angle: number } | null>(null);
  const [activeStroke, setActiveStroke] = useState<{ x: number; y: number }[] | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);

  // Estados de interação com ponteiro
  const [groupDrag, setGroupDrag] = useState<{
    anchorId: string;
    startCol: number;
    startRow: number;
    deltaX: number;
    deltaY: number;
    items: { id: string; origX: number; origY: number; size: number }[];
  } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [measureLine, setMeasureLine] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const isPaintingFogRef = useRef(false);
  const paintedCellsRef = useRef<Set<string>>(new Set());

  const selectedTokens = tokens.filter((t) => selectedTokenIds.includes(t.id));
  const selectedToken = selectedTokens.length === 1 ? selectedTokens[0] : null;

  const yScale = viewMode === '3d' ? 0.68 : 1;

  const fitMapToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const vw = container.clientWidth;
    const vh = container.clientHeight;
    const mapW = map.cols * map.gridSize;
    const mapH = map.rows * map.gridSize * yScale;
    if (!vw || !vh || !mapW || !mapH) return;
    const nextZoom = Math.max(
      0.2,
      Math.min(1.15, +Math.min((vw - 70) / mapW, (vh - 60) / mapH).toFixed(2))
    );
    setZoom(nextZoom);
    setPan({
      x: Math.round((vw - mapW * nextZoom) / 2),
      y: Math.round((vh - mapH * nextZoom) / 2)
    });
  }, [map.cols, map.rows, map.gridSize, yScale]);

  // Ajusta o zoom/enquadramento ao trocar de mapa ou dimensões
  useEffect(() => {
    fitMapToScreen();
  }, [map.imageUrl, map.cols, map.rows, fitMapToScreen]);

  // Carrega imagem de mapa customizada quando imageUrl muda
  useEffect(() => {
    bgImageRef.current = null;
    if (!map.imageUrl) {
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      bgImageRef.current = img;
    };
    img.src = map.imageUrl;
  }, [map.imageUrl]);

  // Converte coordenada do mouse no canvas para coordenada do mundo (mapa)
  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { wx: 0, wy: 0, col: 0, row: 0 };
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const wx = (sx - pan.x) / zoom;
      const wy = (sy - pan.y) / (zoom * yScale);
      const col = Math.floor(wx / map.gridSize);
      const row = Math.floor(wy / map.gridSize);
      return { wx, wy, col, row };
    },
    [pan, zoom, yScale, map.gridSize]
  );

  // Retorna IDs dos tokens cuja área no grid intersecta a caixa de seleção
  const getTokenIdsInBox = useCallback(
    (box: { startX: number; startY: number; endX: number; endY: number }) => {
      const minX = Math.min(box.startX, box.endX);
      const maxX = Math.max(box.startX, box.endX);
      const minY = Math.min(box.startY, box.endY);
      const maxY = Math.max(box.startY, box.endY);
      return tokens
        .filter((t) => {
          const tx1 = t.x * map.gridSize;
          const ty1 = t.y * map.gridSize;
          const tx2 = tx1 + t.size * map.gridSize;
          const ty2 = ty1 + t.size * map.gridSize;
          return tx2 >= minX && tx1 <= maxX && ty2 >= minY && ty1 <= maxY;
        })
        .map((t) => t.id);
    },
    [tokens, map.gridSize]
  );

  // Limpa seleção ao pressionar Esc
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setSelectedTokenIds([]);
        setSelectionBox(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Desenho principal do tabuleiro
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animId = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Fundo externo da mesa
      ctx.fillStyle = '#090b10';
      ctx.fillRect(0, 0, width, height);

      // Aplica Pan, Zoom e Perspectiva 3D (quando ativa)
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom * yScale);

      const mapW = map.cols * map.gridSize;
      const mapH = map.rows * map.gridSize;
      const preset = PRESET_MAPS.find((p) => p.id === map.presetId) || PRESET_MAPS[0];

      // Espessura da prancha 3D da mesa
      if (viewMode === '3d') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, mapH, mapW, 22);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, mapH, mapW, 12);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0, mapH, mapW, 22);
      }

      // Fundo do mapa
      ctx.fillStyle = preset.bgColor;
      ctx.fillRect(0, 0, mapW, mapH);

      if (map.imageUrl && bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, mapW, mapH);
      } else {
        // Desenha mapa procedural estilizado conforme o preset
        drawPresetMap(ctx, preset.id, mapW, mapH, map.gridSize, preset.floorColor, preset.accentColor);
      }

      // Grid
      if (map.gridColor !== 'transparent') {
        ctx.strokeStyle = map.gridColor || 'rgba(255,255,255,0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let c = 0; c <= map.cols; c++) {
          const x = c * map.gridSize;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, mapH);
        }
        for (let r = 0; r <= map.rows; r++) {
          const y = r * map.gridSize;
          ctx.moveTo(0, y);
          ctx.lineTo(mapW, y);
        }
        ctx.stroke();
      }

      // Borda do mapa
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, mapW, mapH);

      // Desenhos Livres salvos + traço ativo
      const allStrokes = [
        ...(drawings || []),
        ...(activeStroke && activeStroke.length > 1
          ? [{ id: 'active', color: drawColor, width: 3, points: activeStroke }]
          : [])
      ];
      for (const stroke of allStrokes) {
        if (stroke.points.length < 2) continue;
        ctx.save();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Tokens (ordenados por linha em 3D para oclusão realista frente/trás)
      const orderedTokens =
        viewMode === '3d'
          ? [...tokens].sort((a, b) => a.y - b.y)
          : tokens;

      const marqueeIds =
        selectionBox &&
        (Math.abs(selectionBox.endX - selectionBox.startX) > 6 ||
          Math.abs(selectionBox.endY - selectionBox.startY) > 6)
          ? getTokenIdsInBox(selectionBox)
          : [];

      for (const token of orderedTokens) {
        const dragItem = groupDrag?.items.find((it) => it.id === token.id);
        const drawCol = dragItem ? dragItem.origX + groupDrag!.deltaX : token.x;
        const drawRow = dragItem ? dragItem.origY + groupDrag!.deltaY : token.y;
        const isTokenSelected =
          selectedTokenIds.includes(token.id) || marqueeIds.includes(token.id);
        const sizePx = token.size * map.gridSize;
        const cx = drawCol * map.gridSize + sizePx / 2;
        const cy = drawRow * map.gridSize + sizePx / 2;
        const radius = sizePx * 0.4;

        ctx.save();
        if (token.hidden) {
          ctx.globalAlpha = 0.5;
        }

        // Halo pulsante de Turno Ativo na Iniciativa
        if (activeTokenId && token.id === activeTokenId) {
          const pulse = 4 + Math.sin(Date.now() / 220) * 2.5;
          ctx.beginPath();
          ctx.arc(cx, cy, radius + pulse, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Carrega / cacheia imagem do token se existir
        let cachedImg: HTMLImageElement | undefined;
        let hasLoadedImg = false;
        if (token.imageUrl) {
          cachedImg = tokenImagesRef.current.get(token.imageUrl);
          if (!cachedImg) {
            cachedImg = new Image();
            cachedImg.src = token.imageUrl;
            tokenImagesRef.current.set(token.imageUrl, cachedImg);
          }
          hasLoadedImg = Boolean(cachedImg.complete && cachedImg.naturalWidth > 0);
        }

        const baseColor = token.hidden
          ? '#c084fc'
          : isTokenSelected
          ? '#fbbf24'
          : token.color || '#3b82f6';

        if (viewMode === '3d') {
          // MODO 3D: Pedestal cilíndrico no chão + Miniatura Standee em pé!
          // Sombra projetada
          ctx.beginPath();
          ctx.arc(cx + 3, cy + 5, radius * 1.02, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fill();

          // Lateral extrudada do pedestal
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI);
          ctx.lineTo(cx - radius, cy - 8);
          ctx.arc(cx, cy - 8, radius, Math.PI, 0, true);
          ctx.closePath();
          ctx.fillStyle = '#0f172a';
          ctx.fill();

          // Topo da base
          ctx.beginPath();
          ctx.arc(cx, cy - 8, radius, 0, Math.PI * 2);
          ctx.fillStyle = '#1e293b';
          ctx.fill();
          ctx.lineWidth = isTokenSelected ? 3.5 : 2.5;
          ctx.strokeStyle = baseColor;
          ctx.stroke();

          // Miniatura vertical (desfaz achatamento Y para ficar em pé sobre o pedestal!)
          ctx.save();
          ctx.translate(cx, cy - 8);
          ctx.scale(1, 1 / yScale);

          const stW = sizePx * 0.74;
          const stH = sizePx * 0.94;
          let stY = -stH + 2;

          const sprite3d =
            modelStyle3d === 'model'
              ? getMonster3DSprite(
                  `${token.id}:${token.modelSlug || token.name}:${token.modelNameEn || ''}:${token.modelType || token.type}`,
                  {
                    slug: token.modelSlug,
                    name: token.name,
                    nameEn: token.modelNameEn,
                    type: token.modelType,
                    tokenType: token.type
                  },
                  performance.now(),
                  token.facing ?? 24
                )
              : null;

          if (sprite3d) {
            // Sombra de contato da miniatura sobre o pedestal
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 0.54, radius * 0.22, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fill();

            const drawSize = sizePx * 1.48;
            ctx.drawImage(sprite3d, -drawSize / 2, -drawSize * 0.85, drawSize, drawSize);
            stY = -drawSize * 0.78;
          } else {
            const stX = -stW / 2;

            // Moldura da miniatura Standee em pé
            ctx.beginPath();
            ctx.roundRect(stX, stY, stW, stH, [stW * 0.42, stW * 0.42, 6, 6]);
            ctx.fillStyle = token.type === 'pc' ? '#0f172a' : '#181024';
            ctx.fill();

            if (hasLoadedImg && cachedImg) {
              ctx.save();
              ctx.beginPath();
              ctx.roundRect(stX + 2, stY + 2, stW - 4, stH - 4, [stW * 0.38, stW * 0.38, 4, 4]);
              ctx.clip();
              ctx.drawImage(cachedImg, stX + 2, stY + 2, stW - 4, stH - 4);
              ctx.restore();
            } else {
              ctx.font = `${Math.floor(sizePx * 0.56)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#ffffff';
              ctx.fillText(token.avatar || '🛡️', 0, stY + stH * 0.52);
            }

            ctx.beginPath();
            ctx.roundRect(stX, stY, stW, stH, [stW * 0.42, stW * 0.42, 6, 6]);
            ctx.lineWidth = isTokenSelected ? 3 : 2;
            if (token.hidden) ctx.setLineDash([5, 3]);
            ctx.strokeStyle = baseColor;
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Barra de HP acima da miniatura
          if (token.maxHp > 0) {
            const barW = sizePx * 0.76;
            const barH = 4;
            const barX = -barW / 2;
            const barY = stY - 7;
            const ratio = Math.max(0, Math.min(1, token.hp / token.maxHp));
            ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
            ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
            ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
            ctx.fillRect(barX, barY, barW * ratio, barH);
          }

          // Nome flutuante da miniatura 3D
          ctx.font = '600 10.5px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const label3d = token.hidden ? `👁️ ${token.name}` : token.name;
          const tw3d = ctx.measureText(label3d).width;
          ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
          ctx.fillRect(-tw3d / 2 - 4, stY - 24, tw3d + 8, 13);
          ctx.fillStyle = token.hidden ? '#e9d5ff' : '#f8fafc';
          ctx.fillText(label3d, 0, stY - 17.5);

          // Condições
          if (token.conditions && token.conditions.length > 0) {
            ctx.font = '11px sans-serif';
            token.conditions.slice(0, 3).forEach((cid, bIdx) => {
              const def = DND_CONDITIONS.find((c) => c.id === cid);
              const bx = stW / 2 + 4;
              const by = stY + 8 + bIdx * 13;
              ctx.beginPath();
              ctx.arc(bx, by, 7, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(88, 28, 135, 0.92)';
              ctx.fill();
              ctx.strokeStyle = '#d8b4fe';
              ctx.lineWidth = 1;
              ctx.stroke();
              ctx.fillText(def?.icon || '⚠️', bx, by + 0.5);
            });
          }

          ctx.restore();
          ctx.restore();
          continue;
        }

        // MODO 2D (Topo Clássico)
        // Sombra do token
        ctx.beginPath();
        ctx.arc(cx, cy + 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fill();

        // Círculo base
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();

        if (hasLoadedImg && cachedImg) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, radius - 1.5, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(cachedImg, cx - radius, cy - radius, radius * 2, radius * 2);
          ctx.restore();
        }

        // Borda colorida
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.lineWidth = isTokenSelected ? 4 : 2.5;
        if (token.hidden) {
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = isTokenSelected ? '#fbbf24' : '#c084fc';
        } else {
          ctx.strokeStyle = baseColor;
        }
        ctx.stroke();
        ctx.setLineDash([]);

        if (!hasLoadedImg) {
          ctx.font = `${Math.floor(radius * 1.05)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(token.avatar || '🛡️', cx, cy + 1);
        }

        // Barra de HP abaixo do token
        if (token.maxHp > 0) {
          const barW = sizePx * 0.76;
          const barH = 4;
          const barX = cx - barW / 2;
          const barY = cy + radius + 2;
          const ratio = Math.max(0, Math.min(1, token.hp / token.maxHp));

          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
          ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
          ctx.fillRect(barX, barY, barW * ratio, barH);
        }

        // Nome do Token (sempre centralizado)
        ctx.font = '600 10.5px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = token.hidden ? `👁️ ${token.name}` : token.name;
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
        ctx.fillRect(cx - textWidth / 2 - 4, cy - radius - 16, textWidth + 8, 13);
        ctx.fillStyle = token.hidden ? '#e9d5ff' : '#f8fafc';
        ctx.fillText(label, cx, cy - radius - 9.5);

        // Badges de Condições D&D 5e no token
        if (token.conditions && token.conditions.length > 0) {
          const badges = token.conditions.slice(0, 3).map((cid) => {
            const def = DND_CONDITIONS.find((c) => c.id === cid);
            return def?.icon || '⚠️';
          });
          ctx.font = '11px sans-serif';
          badges.forEach((icon, bIdx) => {
            const bx = cx + radius - 6;
            const by = cy - radius + 6 + bIdx * 13;
            ctx.beginPath();
            ctx.arc(bx, by, 7, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(88, 28, 135, 0.92)';
            ctx.fill();
            ctx.strokeStyle = '#d8b4fe';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, bx, by + 0.5);
          });
        }

        ctx.restore();
      }

      // Fog of War (Névoa de Guerra)
      if (map.fogEnabled) {
        const fogKeys = Object.keys(map.fogCells || {});
        if (fogKeys.length > 0) {
          // Jogador vê totalmente opaco; Mestre vê translúcido para enxergar por baixo!
          ctx.fillStyle = role === 'dm' ? 'rgba(15, 10, 35, 0.55)' : '#05070c';
          for (const key of fogKeys) {
            const [cStr, rStr] = key.split(',');
            const c = parseInt(cStr, 10);
            const r = parseInt(rStr, 10);
            if (!Number.isNaN(c) && !Number.isNaN(r)) {
              ctx.fillRect(c * map.gridSize, r * map.gridSize, map.gridSize + 0.5, map.gridSize + 0.5);
            }
          }
        }
      }

      // Template de Área de Magia (AoE)
      if (tool === 'aoe' && aoePos) {
        const pxPerMeter = map.gridSize / 1.5;
        const sizePx = aoeMeters * pxPerMeter;
        ctx.save();
        ctx.fillStyle = 'rgba(249, 115, 22, 0.25)';
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 2;
        if (aoeShape === 'sphere') {
          ctx.beginPath();
          ctx.arc(aoePos.x, aoePos.y, sizePx, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (aoeShape === 'cube') {
          ctx.fillRect(aoePos.x - sizePx / 2, aoePos.y - sizePx / 2, sizePx, sizePx);
          ctx.strokeRect(aoePos.x - sizePx / 2, aoePos.y - sizePx / 2, sizePx, sizePx);
        } else if (aoeShape === 'cone') {
          ctx.translate(aoePos.x, aoePos.y);
          ctx.rotate(aoePos.angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, sizePx, -Math.PI / 6, Math.PI / 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (aoeShape === 'line') {
          ctx.translate(aoePos.x, aoePos.y);
          ctx.rotate(aoePos.angle);
          const w = map.gridSize;
          ctx.fillRect(0, -w / 2, sizePx, w);
          ctx.strokeRect(0, -w / 2, sizePx, w);
        }
        ctx.restore();
      }

      // Pings no mapa (efeito pulsar)
      const now = Date.now();
      for (const ping of pings) {
        const age = now - ping.timestamp;
        if (age > 3000) continue;
        const progress = (age % 1000) / 1000;
        const alpha = Math.max(0, 1 - age / 3000);
        const radius = 10 + progress * map.gridSize * 0.9;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(ping.x, ping.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = ping.color || '#fbbf24';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillStyle = '#fde68a';
        ctx.textAlign = 'center';
        ctx.fillText(ping.sender, ping.x, ping.y - 16);
        ctx.restore();
      }

      // Régua de Medição de Distância
      if (measureLine) {
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(measureLine.x1, measureLine.y1);
        ctx.lineTo(measureLine.x2, measureLine.y2);
        ctx.stroke();
        ctx.setLineDash([]);

        const dx = Math.abs(measureLine.x2 - measureLine.x1) / map.gridSize;
        const dy = Math.abs(measureLine.y2 - measureLine.y1) / map.gridSize;
        // Regra padrão D&D 5e (maior eixo em grid ou euclidiana)
        const squares = Math.round(Math.max(dx, dy) * 10) / 10;
        const meters = (squares * 1.5).toFixed(1).replace('.0', '');
        const feet = Math.round(squares * 5);

        const midX = (measureLine.x1 + measureLine.x2) / 2;
        const midY = (measureLine.y1 + measureLine.y2) / 2;
        const text = `${meters}m (${feet}ft)`;
        ctx.font = 'bold 13px Inter, sans-serif';
        const tw = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(midX - tw / 2 - 8, midY - 14, tw + 16, 24);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1;
        ctx.strokeRect(midX - tw / 2 - 8, midY - 14, tw + 16, 24);
        ctx.fillStyle = '#fde68a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, midX, midY - 2);
        ctx.restore();
      }

      // Caixa de Seleção em Área (Botão Esquerdo do Mestre)
      if (selectionBox) {
        const rx = Math.min(selectionBox.startX, selectionBox.endX);
        const ry = Math.min(selectionBox.startY, selectionBox.endY);
        const rw = Math.abs(selectionBox.endX - selectionBox.startX);
        const rh = Math.abs(selectionBox.endY - selectionBox.startY);
        if (rw > 4 || rh > 4) {
          ctx.save();
          ctx.fillStyle = 'rgba(251, 191, 36, 0.14)';
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = Math.max(1.5, 2 / zoom);
          ctx.setLineDash([6 / zoom, 4 / zoom]);
          ctx.strokeRect(rx, ry, rw, rh);
          ctx.restore();
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    map,
    tokens,
    drawings,
    activeStroke,
    drawColor,
    pings,
    activeTokenId,
    viewMode,
    modelStyle3d,
    yScale,
    role,
    zoom,
    pan,
    groupDrag,
    selectionBox,
    selectedTokenIds,
    getTokenIdsInBox,
    measureLine,
    tool,
    aoePos,
    aoeShape,
    aoeMeters
  ]);

  const canControlToken = (token: Token) => {
    if (role === 'dm') return true;
    return Boolean(token.ownerName) && token.ownerName === userName;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Botão direito (ou do meio / ferramenta Mão) move exclusivamente o mapa
    if (e.button === 1 || e.button === 2 || tool === 'pan') {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      return;
    }

    const { wx, wy, col, row } = screenToWorld(e.clientX, e.clientY);

    if (e.altKey || tool === 'ping') {
      onPing(wx, wy, drawColor);
      return;
    }

    if (tool === 'draw') {
      setActiveStroke([{ x: wx, y: wy }]);
      return;
    }

    if (tool === 'aoe') {
      setAoePos({ x: wx, y: wy, angle: aoePos?.angle ?? 0 });
      return;
    }

    if (tool === 'measure') {
      const cx = (col + 0.5) * map.gridSize;
      const cy = (row + 0.5) * map.gridSize;
      setMeasureLine({ x1: cx, y1: cy, x2: cx, y2: cy });
      return;
    }

    if ((tool === 'fog-reveal' || tool === 'fog-cover') && role === 'dm') {
      if (col >= 0 && col < map.cols && row >= 0 && row < map.rows) {
        isPaintingFogRef.current = true;
        const key = `${col},${row}`;
        paintedCellsRef.current = new Set([key]);
        onToggleFogCells([key], tool === 'fog-cover');
      }
      return;
    }

    // Selecionar / Arrastar token ou grupo de tokens
    const clickedToken = [...tokens].reverse().find((t) => {
      return col >= t.x && col < t.x + t.size && row >= t.y && row < t.y + t.size;
    });

    if (clickedToken) {
      if (role === 'dm' && e.shiftKey) {
        setSelectedTokenIds((prev) =>
          prev.includes(clickedToken.id)
            ? prev.filter((id) => id !== clickedToken.id)
            : [...prev, clickedToken.id]
        );
        return;
      }

      const activeSelection =
        role === 'dm' && selectedTokenIds.includes(clickedToken.id) && selectedTokenIds.length > 1
          ? selectedTokenIds
          : [clickedToken.id];

      setSelectedTokenIds(activeSelection);

      if (canControlToken(clickedToken)) {
        const dragTokens = tokens.filter(
          (t) => activeSelection.includes(t.id) && canControlToken(t)
        );
        setGroupDrag({
          anchorId: clickedToken.id,
          startCol: col,
          startRow: row,
          deltaX: 0,
          deltaY: 0,
          items: dragTokens.map((t) => ({
            id: t.id,
            origX: t.x,
            origY: t.y,
            size: t.size
          }))
        });
      }
    } else if (role === 'dm') {
      // Para o Mestre, clique esquerdo + arrastar no vazio desenha área de seleção de grupo
      if (!e.shiftKey) {
        setSelectedTokenIds([]);
      }
      setSelectionBox({ startX: wx, startY: wy, endX: wx, endY: wy });
    } else {
      setSelectedTokenIds([]);
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
      return;
    }

    const { wx, wy, col, row } = screenToWorld(e.clientX, e.clientY);

    if (tool === 'draw' && activeStroke) {
      setActiveStroke((prev) => (prev ? [...prev, { x: wx, y: wy }] : null));
      return;
    }

    if (tool === 'aoe') {
      if (e.buttons === 1 && aoePos) {
        const angle = Math.atan2(wy - aoePos.y, wx - aoePos.x);
        setAoePos({ ...aoePos, angle });
      } else {
        setAoePos({ x: wx, y: wy, angle: aoePos?.angle ?? 0 });
      }
      return;
    }

    if (tool === 'measure' && measureLine) {
      const cx = (col + 0.5) * map.gridSize;
      const cy = (row + 0.5) * map.gridSize;
      setMeasureLine((prev) => (prev ? { ...prev, x2: cx, y2: cy } : null));
      return;
    }

    if (isPaintingFogRef.current && role === 'dm' && (tool === 'fog-reveal' || tool === 'fog-cover')) {
      if (col >= 0 && col < map.cols && row >= 0 && row < map.rows) {
        const key = `${col},${row}`;
        if (!paintedCellsRef.current.has(key)) {
          paintedCellsRef.current.add(key);
          onToggleFogCells([key], tool === 'fog-cover');
        }
      }
      return;
    }

    if (selectionBox) {
      setSelectionBox((prev) => (prev ? { ...prev, endX: wx, endY: wy } : null));
      return;
    }

    if (groupDrag) {
      const rawDx = col - groupDrag.startCol;
      const rawDy = row - groupDrag.startRow;
      let minDx = -Infinity;
      let maxDx = Infinity;
      let minDy = -Infinity;
      let maxDy = Infinity;
      for (const item of groupDrag.items) {
        minDx = Math.max(minDx, -item.origX);
        maxDx = Math.min(maxDx, Math.max(0, map.cols - item.size) - item.origX);
        minDy = Math.max(minDy, -item.origY);
        maxDy = Math.min(maxDy, Math.max(0, map.rows - item.size) - item.origY);
      }
      const clampedDx = Math.max(minDx, Math.min(maxDx, rawDx));
      const clampedDy = Math.max(minDy, Math.min(maxDy, rawDy));
      if (clampedDx !== groupDrag.deltaX || clampedDy !== groupDrag.deltaY) {
        setGroupDrag((prev) => (prev ? { ...prev, deltaX: clampedDx, deltaY: clampedDy } : null));
      }
    }
  };

  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (isPaintingFogRef.current) {
      isPaintingFogRef.current = false;
      paintedCellsRef.current.clear();
    }
    if (activeStroke) {
      if (activeStroke.length > 1) {
        onAddDrawing({
          id: `drw-${Date.now()}`,
          color: drawColor,
          width: 3,
          points: activeStroke
        });
      }
      setActiveStroke(null);
    }
    if (measureLine) {
      setMeasureLine(null);
    }
    if (selectionBox) {
      const draggedDist =
        Math.abs(selectionBox.endX - selectionBox.startX) +
        Math.abs(selectionBox.endY - selectionBox.startY);
      if (draggedDist > 10) {
        const hitIds = getTokenIdsInBox(selectionBox);
        setSelectedTokenIds((prev) => Array.from(new Set([...prev, ...hitIds])));
      }
      setSelectionBox(null);
    }
    if (groupDrag) {
      if (groupDrag.deltaX !== 0 || groupDrag.deltaY !== 0) {
        const updates = groupDrag.items.map((item) => ({
          id: item.id,
          patch: { x: item.origX + groupDrag.deltaX, y: item.origY + groupDrag.deltaY }
        }));
        if (updates.length > 1 && onUpdateTokens) {
          onUpdateTokens(updates);
        } else {
          updates.forEach((u) => onMoveToken(u.id, u.patch.x!, u.patch.y!));
        }
      }
      setGroupDrag(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((z) => Math.max(0.2, Math.min(2.5, +(z + delta).toFixed(2))));
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
      <canvas
        ref={canvasRef}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        className={`w-full h-full block ${
          tool === 'pan' || isPanning
            ? 'cursor-grab active:cursor-grabbing'
            : tool === 'measure'
            ? 'cursor-crosshair'
            : tool === 'fog-reveal' || tool === 'fog-cover'
            ? 'cursor-cell'
            : 'cursor-default'
        }`}
      />

      {/* Barra de Ferramentas Flutuante + Sub-barras / Inspetor (Sem Colisão ou Corte) */}
      <div className="pointer-events-none absolute inset-x-2.5 top-2.5 bottom-14 z-10 flex items-start gap-2">
        <div className="pointer-events-auto shrink-0 max-h-full flex flex-col flex-wrap content-start gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-xl shadow-xl">
          <ToolButton
            active={tool === 'select'}
            onClick={() => setTool('select')}
            title={
              role === 'dm'
                ? 'Selecionar / Arrastar área para grupo de NPCs (Botão Esquerdo)'
                : 'Selecionar / Mover Token'
            }
            icon={<MousePointer className="w-4 h-4" />}
          />
          <ToolButton
            active={tool === 'pan'}
            onClick={() => setTool('pan')}
            title="Mover Câmera (ou Arraste com Botão Direito)"
            icon={<Hand className="w-4 h-4" />}
          />
          <ToolButton
            active={tool === 'measure'}
            onClick={() => setTool('measure')}
            title="Medir Distância (Régua 1,5m)"
            icon={<Ruler className="w-4 h-4" />}
          />
          <ToolButton
            active={tool === 'draw'}
            onClick={() => setTool('draw')}
            title="Desenhar no Mapa"
            icon={<Pencil className="w-4 h-4" />}
          />
          <ToolButton
            active={tool === 'aoe'}
            onClick={() => setTool('aoe')}
            title="Template de Área de Magia (AoE)"
            icon={<Flame className="w-4 h-4 text-orange-400" />}
          />
          <ToolButton
            active={tool === 'ping'}
            onClick={() => setTool('ping')}
            title="Ping no Mapa (ou Alt+Clique)"
            icon={<CircleDot className="w-4 h-4 text-amber-400" />}
          />

          {role === 'dm' && (
            <>
              <ToolButton
                active={tool === 'fog-reveal'}
                onClick={() => setTool('fog-reveal')}
                title="Mestre: Revelar Névoa de Guerra"
                icon={<Eye className="w-4 h-4 text-emerald-400" />}
                dmAccent
              />
              <ToolButton
                active={tool === 'fog-cover'}
                onClick={() => setTool('fog-cover')}
                title="Mestre: Cobrir com Névoa de Guerra"
                icon={<EyeOff className="w-4 h-4 text-purple-400" />}
                dmAccent
              />
              <ToolButton
                active={false}
                onClick={onClearDrawings}
                title="Mestre: Limpar Todos os Desenhos"
                icon={<Eraser className="w-4 h-4 text-rose-400" />}
                dmAccent
              />
            </>
          )}
        </div>

        <div className="flex-1 min-w-0 max-h-full flex flex-col items-start gap-2 overflow-hidden">
          {/* Sub-barra de opções para Desenho ou AoE */}
          {tool === 'draw' && (
            <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-slate-900/95 border border-slate-700 px-2.5 py-1.5 rounded-xl shadow-xl text-xs">
              <span className="text-slate-400">Cor:</span>
              {['#f59e0b', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#ffffff'].map((c) => (
                <button
                  key={c}
                  onClick={() => setDrawColor(c)}
                  className={`w-4 h-4 rounded-full border cursor-pointer ${
                    drawColor === c ? 'border-white scale-110' : 'border-slate-700'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}

          {tool === 'aoe' && (
            <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-slate-900/95 border border-orange-500/40 px-2.5 py-1.5 rounded-xl shadow-xl text-xs max-w-full">
              {(
                [
                  ['sphere', 'Esfera'],
                  ['cone', 'Cone'],
                  ['cube', 'Cubo'],
                  ['line', 'Linha']
                ] as const
              ).map(([sh, lbl]) => (
                <button
                  key={sh}
                  onClick={() => setAoeShape(sh)}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                    aoeShape === sh
                      ? 'bg-orange-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {lbl}
                </button>
              ))}
              <select
                value={aoeMeters}
                onChange={(e) => setAoeMeters(parseFloat(e.target.value))}
                className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-orange-200 font-mono"
              >
                <option value={1.5}>1,5m (5ft)</option>
                <option value={3}>3m (10ft)</option>
                <option value={4.5}>4,5m (15ft)</option>
                <option value={6}>6m (20ft)</option>
                <option value={9}>9m (30ft)</option>
                <option value={18}>18m (60ft)</option>
              </select>
            </div>
          )}

          {/* Inspetor Rápido do Token Selecionado */}
          {selectedToken && (
            <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-xl p-3 shadow-2xl w-full max-w-[260px] max-h-full overflow-y-auto text-xs">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 font-semibold text-slate-100 truncate">
              <span className="text-lg">{selectedToken.avatar}</span>
              <span className="truncate">{selectedToken.name}</span>
            </div>
            {selectedToken.hidden && (
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-semibold">
                Oculto
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mb-2 flex items-center justify-between gap-1">
            <span>
              Dono:{' '}
              <strong className={selectedToken.ownerName === userName ? 'text-emerald-300' : 'text-slate-200'}>
                {selectedToken.ownerName || 'Mestre'}
              </strong>
            </span>
            <div className="flex items-center gap-1">
              {viewMode === '3d' && modelStyle3d === 'model' && canControlToken(selectedToken) && (
                <button
                  onClick={() =>
                    onUpdateToken(selectedToken.id, {
                      facing: ((selectedToken.facing ?? 24) + 45) % 360
                    })
                  }
                  className="px-1.5 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/40 text-sky-200 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                  title="Girar orientação do modelo 3D no mapa"
                >
                  <RotateCw className="w-2.5 h-2.5" /> Girar
                </button>
              )}
              {role !== 'dm' && !canControlToken(selectedToken) && (
                <span className="text-rose-300 font-semibold">Somente leitura</span>
              )}
            </div>
          </div>
          {role === 'dm' && (
            <div className="mb-2">
              <input
                type="text"
                value={selectedToken.ownerName || ''}
                onChange={(e) =>
                  onUpdateToken(selectedToken.id, { ownerName: e.target.value })
                }
                placeholder="Atribuir jogador dono..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-2.5">
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2">
              <div className="flex items-center gap-1 text-rose-400 font-semibold mb-1">
                <Heart className="w-3 h-3" /> PV
              </div>
              <div className="flex items-center justify-between gap-1">
                <button
                  onClick={() =>
                    canControlToken(selectedToken) &&
                    onUpdateToken(selectedToken.id, { hp: Math.max(0, selectedToken.hp - 1) })
                  }
                  className="p-1 rounded bg-slate-800 hover:bg-rose-500/30 text-slate-200 cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-mono font-bold text-slate-100">
                  {selectedToken.hp}/{selectedToken.maxHp}
                </span>
                <button
                  onClick={() =>
                    canControlToken(selectedToken) &&
                    onUpdateToken(selectedToken.id, {
                      hp: Math.min(selectedToken.maxHp, selectedToken.hp + 1)
                    })
                  }
                  className="p-1 rounded bg-slate-800 hover:bg-emerald-500/30 text-slate-200 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 flex flex-col justify-between">
              <div className="flex items-center gap-1 text-sky-400 font-semibold">
                <Shield className="w-3 h-3" /> CA
              </div>
              <div className="font-mono font-bold text-base text-slate-100">{selectedToken.ac}</div>
            </div>
          </div>

          {/* Condições rápidas no Token */}
          {canControlToken(selectedToken) && (
            <div className="mb-2.5 space-y-1.5">
              {(selectedToken.conditions || []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedToken.conditions.map((cid) => {
                    const def = DND_CONDITIONS.find((c) => c.id === cid);
                    return (
                      <button
                        key={cid}
                        onClick={() =>
                          onUpdateToken(selectedToken.id, {
                            conditions: selectedToken.conditions.filter((c) => c !== cid)
                          })
                        }
                        className="px-1.5 py-0.5 rounded bg-purple-500/25 border border-purple-400/50 text-purple-100 text-[10px] font-semibold cursor-pointer hover:bg-rose-500/30"
                        title="Clique para remover condição"
                      >
                        {def?.icon} {cid} ×
                      </button>
                    );
                  })}
                </div>
              )}
              <select
                value=""
                onChange={(e) => {
                  const cid = e.target.value;
                  if (!cid) return;
                  const current = selectedToken.conditions || [];
                  const next = current.includes(cid)
                    ? current.filter((c) => c !== cid)
                    : [...current, cid];
                  onUpdateToken(selectedToken.id, { conditions: next });
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200"
              >
                <option value="">+ Alternar Condição D&D 5e...</option>
                {DND_CONDITIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name} ({c.short})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {role === 'dm' && (
              <>
                <button
                  onClick={() =>
                    onUpdateToken(selectedToken.id, { hidden: !selectedToken.hidden })
                  }
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg font-medium transition cursor-pointer ${
                    selectedToken.hidden
                      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                  }`}
                >
                  {selectedToken.hidden ? (
                    <>
                      <Eye className="w-3.5 h-3.5" /> Revelar
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" /> Ocultar
                    </>
                  )}
                </button>

                <button
                  onClick={() => onAddToInitiative(selectedToken)}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-medium cursor-pointer"
                  title="Adicionar à Iniciativa"
                >
                  <Swords className="w-3.5 h-3.5" /> Init
                </button>
              </>
            )}

            {canControlToken(selectedToken) && (
              <button
                onClick={() => {
                  onDeleteToken(selectedToken.id);
                  setSelectedTokenIds([]);
                }}
                className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/30 cursor-pointer"
                title="Remover Token"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

          {/* Inspetor de Seleção em Grupo (Mestre) */}
          {selectedTokens.length > 1 && (
            <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-amber-500/45 rounded-xl p-3 shadow-2xl w-full max-w-[280px] max-h-full overflow-y-auto text-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Grupo ({selectedTokens.length} tokens)</span>
                </div>
                <button
                  onClick={() => setSelectedTokenIds([])}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  title="Limpar seleção (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-[11px] text-slate-300 bg-slate-950/70 border border-slate-800 rounded-lg px-2 py-1.5">
                Arraste qualquer token destacado com o <strong>botão esquerdo</strong> para mover o grupo junto.
              </div>

              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {selectedTokens.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-200 max-w-[125px] truncate"
                  >
                    <span>{t.avatar}</span>
                    <span className="truncate">{t.name}</span>
                  </span>
                ))}
              </div>

              {role === 'dm' && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedTokens.some((t) => t.type === 'pc') &&
                    selectedTokens.some((t) => t.type !== 'pc') && (
                      <button
                        onClick={() =>
                          setSelectedTokenIds(
                            selectedTokens.filter((t) => t.type !== 'pc').map((t) => t.id)
                          )
                        }
                        className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[11px] font-semibold cursor-pointer"
                        title="Remover jogadores da seleção e manter apenas NPCs/Monstros"
                      >
                        Só NPCs ({selectedTokens.filter((t) => t.type !== 'pc').length})
                      </button>
                    )}

                  <button
                    onClick={() => {
                      const shouldHide = selectedTokens.some((t) => !t.hidden);
                      if (onUpdateTokens) {
                        onUpdateTokens(
                          selectedTokens.map((t) => ({ id: t.id, patch: { hidden: shouldHide } }))
                        );
                      } else {
                        selectedTokens.forEach((t) => onUpdateToken(t.id, { hidden: shouldHide }));
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-[11px] font-semibold cursor-pointer"
                  >
                    {selectedTokens.some((t) => !t.hidden) ? (
                      <>
                        <EyeOff className="w-3 h-3" /> Ocultar todos
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" /> Revelar todos
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onAddToInitiative(selectedTokens)}
                    className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-semibold cursor-pointer"
                    title="Adicionar todos à iniciativa"
                  >
                    <Swords className="w-3 h-3" /> Init
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Controles de Zoom (Canto Inferior Esquerdo) */}
      <div className="absolute bottom-2.5 left-2.5 z-10 max-w-[calc(100%-1.25rem)] flex flex-wrap items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2 py-1 rounded-xl shadow-xl text-xs">
        <button
          onClick={() => setZoom((z) => Math.max(0.2, +(z - 0.1).toFixed(2)))}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 cursor-pointer"
          title="Diminuir Zoom"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="px-1.5 font-mono text-slate-300">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)))}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 cursor-pointer"
          title="Aumentar Zoom"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={fitMapToScreen}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 cursor-pointer"
          title="Ajustar e Centralizar Mapa na Tela"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-slate-700 mx-0.5" />
        <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
          {(['2d', '3d'] as const).map((vm) => (
            <button
              key={vm}
              onClick={() => setViewMode(vm)}
              className={`px-2 py-0.5 rounded-md font-bold uppercase text-[11px] cursor-pointer transition ${
                viewMode === vm
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={vm === '2d' ? 'Visão Clássica de Topo (2D)' : 'Visão em Perspectiva c/ Modelos 3D'}
            >
              {vm}
            </button>
          ))}
        </div>
        {viewMode === '3d' && (
          <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setModelStyle3d('model')}
              className={`px-1.5 py-0.5 rounded-md font-semibold text-[10px] cursor-pointer transition ${
                modelStyle3d === 'model'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Exibir bonecos 3D modelados para cada criatura"
            >
              Boneco 3D
            </button>
            <button
              onClick={() => setModelStyle3d('standee')}
              className={`px-1.5 py-0.5 rounded-md font-semibold text-[10px] cursor-pointer transition ${
                modelStyle3d === 'standee'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Exibir miniaturas com arte 2D/retrato"
            >
              Arte 2D
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

function ToolButton({
  active,
  onClick,
  title,
  icon,
  dmAccent = false
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  dmAccent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition cursor-pointer ${
        active
          ? 'bg-amber-500 text-slate-950 shadow'
          : dmAccent
          ? 'bg-slate-950/70 border border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:text-white'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {icon}
    </button>
  );
}

// Desenha mapas procedurais bonitos quando nenhuma imagem externa foi carregada
function drawPresetMap(
  ctx: CanvasRenderingContext2D,
  presetId: string,
  w: number,
  h: number,
  grid: number,
  floorColor: string,
  accentColor: string
) {
  ctx.save();
  if (presetId === 'tavern') {
    // Piso de tábuas de madeira
    ctx.fillStyle = floorColor;
    ctx.fillRect(grid, grid, w - grid * 2, h - grid * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    for (let y = grid; y < h - grid; y += grid / 2) {
      ctx.beginPath();
      ctx.moveTo(grid, y);
      ctx.lineTo(w - grid, y);
      ctx.stroke();
    }
    // Balcão da taverna
    ctx.fillStyle = accentColor;
    ctx.fillRect(grid * 2, grid * 2, grid * 7, grid * 1.5);
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3;
    ctx.strokeRect(grid * 2, grid * 2, grid * 7, grid * 1.5);
    // Mesas redondas
    const tables = [
      [6, 8],
      [12, 6],
      [12, 12],
      [19, 8],
      [19, 13]
    ];
    for (const [tc, tr] of tables) {
      ctx.beginPath();
      ctx.arc(tc * grid, tr * grid, grid * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.fill();
      ctx.stroke();
    }
  } else if (presetId === 'forest') {
    ctx.fillStyle = floorColor;
    ctx.fillRect(0, 0, w, h);
    // Trilha de terra
    ctx.strokeStyle = '#5c4938';
    ctx.lineWidth = grid * 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.65);
    ctx.quadraticCurveTo(w * 0.4, h * 0.35, w, h * 0.5);
    ctx.stroke();
    // Árvores nas bordas
    const trees = [
      [2, 2], [5, 3], [10, 2], [18, 3], [23, 2],
      [3, 15], [8, 14], [15, 15], [21, 14], [24, 10]
    ];
    for (const [tc, tr] of trees) {
      ctx.beginPath();
      ctx.arc(tc * grid, tr * grid, grid * 1.15, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.fill();
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  } else if (presetId === 'arena') {
    // Arena circular de pedra
    ctx.fillStyle = floorColor;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.44, h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 8;
    ctx.stroke();
    // Pilares
    const pillars = [
      [8, 5], [18, 5], [8, 13], [18, 13]
    ];
    for (const [pc, pr] of pillars) {
      ctx.fillStyle = accentColor;
      ctx.fillRect(pc * grid - grid * 0.5, pr * grid - grid * 0.5, grid, grid);
    }
  } else {
    // Dungeon padrão
    ctx.fillStyle = floorColor;
    ctx.fillRect(grid * 1, grid * 3, grid * 9, grid * 11);
    ctx.fillRect(grid * 10, grid * 7, grid * 4, grid * 3);
    ctx.fillRect(grid * 14, grid * 2, grid * 10, grid * 13);

    // Paredes / Pilares internos
    ctx.fillStyle = accentColor;
    const blocks = [
      [16, 4], [21, 4], [16, 12], [21, 12]
    ];
    for (const [bc, br] of blocks) {
      ctx.fillRect(bc * grid, br * grid, grid, grid);
    }
  }
  ctx.restore();
}

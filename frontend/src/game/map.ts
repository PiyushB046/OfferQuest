/**
 * The office floor plan (spec §9.2), loaded from the Tiled map `public/assets/maps/office.json`.
 * Open that file in Tiled to move walls, doors, furniture, rooms or standing spots: the game
 * follows. Layers: `floor` (tiles), `rooms`, `furniture`, `spots` (objects).
 */
import office from "../../public/assets/maps/office.json";
import { COLS, ROWS, TILE, type Pt } from "./config";

export interface Room { id: string; name: string; x: number; y: number; w: number; h: number }
export interface Furniture { type: string; x: number; y: number; w: number; h: number; solid?: boolean; wall?: boolean }

interface TiledObject {
  name: string; x: number; y: number; width: number; height: number;
  properties?: { name: string; value: unknown }[];
}
interface TiledLayer { name: string; data?: number[]; objects?: TiledObject[] }

const layer = (name: string) => (office.layers as TiledLayer[]).find((l) => l.name === name)!;
const prop = (o: TiledObject, name: string) => o.properties?.find((p) => p.name === name)?.value;
const t = (px: number) => Math.floor(px / TILE);

/** Floor kind per tile id, from the tileset (gid 1 = first tile). */
const KINDS: string[] = office.tilesets[0].tiles.map((tile) => tile.type);

export const ROOMS: Room[] = layer("rooms").objects!.map((o) => ({
  id: o.name, name: String(prop(o, "label") ?? ""), x: t(o.x), y: t(o.y), w: t(o.width), h: t(o.height),
}));

export const FURNITURE: Furniture[] = layer("furniture").objects!.map((o) => ({
  type: o.name, x: t(o.x), y: t(o.y), w: Math.max(1, t(o.width)), h: Math.max(1, t(o.height)),
  solid: Boolean(prop(o, "solid")), wall: Boolean(prop(o, "wall")),
}));

/** Where agents stand when sent to `room:<id>`. The room's owner takes the first spot. */
export const SPOTS: Record<string, Pt[]> = {};
for (const o of [...layer("spots").objects!].sort((a, b) => Number(prop(a, "order")) - Number(prop(b, "order")))) {
  (SPOTS[o.name] ??= []).push({ x: t(o.x), y: t(o.y) });
}

export const floorAt: string[][] = [];
export const blocked: boolean[][] = [];
const data = layer("floor").data!;
for (let y = 0; y < ROWS; y++) {
  floorAt.push([]);
  blocked.push([]);
  for (let x = 0; x < COLS; x++) {
    const kind = KINDS[data[y * COLS + x] - 1] ?? "wall";
    floorAt[y].push(kind);
    blocked[y].push(kind === "wall");
  }
}
for (const f of FURNITURE) {
  if (!f.solid) continue;
  for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) blocked[y][x] = true;
}

export const isWall = (x: number, y: number) => y < 0 || y >= ROWS || x < 0 || x >= COLS || floorAt[y][x] === "wall";
export const walkable = (x: number, y: number) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !blocked[y][x];

export function roomOf(p: Pt): string | null {
  return ROOMS.find((r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h)?.id ?? null;
}

/** Tiles that cannot be reached from `from`: a door blocked by furniture seals a room silently. */
export function unreachable(from: Pt, targets: Pt[]): Pt[] {
  const seen = new Set<number>([from.y * COLS + from.x]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const p = { x: queue[i].x + dx, y: queue[i].y + dy };
      if (!walkable(p.x, p.y) || seen.has(p.y * COLS + p.x)) continue;
      seen.add(p.y * COLS + p.x);
      queue.push(p);
    }
  }
  return targets.filter((t2) => !seen.has(t2.y * COLS + t2.x));
}

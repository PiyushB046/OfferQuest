import { COLS, ROWS, type Pt } from "./config";
import { walkable } from "./map";

const key = (x: number, y: number) => y * COLS + x;

/** Breadth-first search on the 4-connected tile grid (all steps cost the same, so BFS is optimal). */
export function findPath(from: Pt, to: Pt): Pt[] | null {
  if (from.x === to.x && from.y === to.y) return [];
  if (!walkable(to.x, to.y)) return null;
  const prev = new Int32Array(COLS * ROWS).fill(-1);
  const start = key(from.x, from.y);
  const goal = key(to.x, to.y);
  prev[start] = start;
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    if (cur === goal) break;
    const cx = cur % COLS;
    const cy = (cur - cx) / COLS;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!walkable(nx, ny) || prev[key(nx, ny)] !== -1) continue;
      prev[key(nx, ny)] = cur;
      queue.push(key(nx, ny));
    }
  }
  if (prev[goal] === -1) return null;
  const path: Pt[] = [];
  for (let cur = goal; cur !== start; cur = prev[cur]) path.unshift({ x: cur % COLS, y: Math.floor(cur / COLS) });
  return path;
}

/** The free tile next to `target` that is quickest to reach from `from`. */
export function nearestNeighbour(from: Pt, target: Pt, taken: (p: Pt) => boolean): Pt | null {
  let best: { p: Pt; len: number } | null = null;
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 2], [2, 0], [-2, 0]]) {
    const p = { x: target.x + dx, y: target.y + dy };
    if (!walkable(p.x, p.y) || taken(p)) continue;
    const path = findPath(from, p);
    // Prefer tiles directly beside the target: diagonal and two-away ones are fallbacks.
    const len = path ? path.length + (Math.abs(dx) + Math.abs(dy) - 1) * 6 : Infinity;
    if (path && (!best || len < best.len)) best = { p, len };
  }
  return best?.p ?? null;
}

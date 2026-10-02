/**
 * All of OfferQuest's pixel art, drawn in code at boot. No image files, so nothing to license.
 * Floors, walls and characters are drawn pixel by pixel at full resolution; furniture is blocked
 * in on a 16px grid (`r`) and then detailed and outlined at full resolution (`q`).
 */
import Phaser from "phaser";
import { AGENTS, COLS, type Dir, type Gait, H, type Look, PAL, ROWS, TILE, W } from "./config";
import { FURNITURE, type Furniture, ROOMS, floorAt, isWall } from "./map";
import { store } from "../state/store";

type Ctx = CanvasRenderingContext2D;
const P = 2;

/** A block on the 16px furniture grid. */
function r(c: Ctx, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = col;
  c.fillRect(Math.round(x * P), Math.round(y * P), Math.round(w * P), Math.round(h * P));
}

/** A rectangle in real pixels. */
function q(c: Ctx, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Deterministic noise so the office looks the same on every load. */
function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const CARPET: Record<string, string> = {
  carpetTeal: "#7fb5ad", carpetMint: "#b5d8c0", carpetSand: "#e3cfa0", carpetPlum: "#b79bbd",
  carpetLeaf: "#a9cf9a", carpetBlue: "#9db8dc",
};

function drawFloor(c: Ctx, tx: number, ty: number, kind: string) {
  const x = tx * TILE;
  const y = ty * TILE;
  if (kind === "wood" || kind === "door") {
    const base = kind === "door" ? PAL.woodDark : PAL.wood;
    for (let row = 0; row < 4; row++) {
      const gy = ty * 4 + row;
      const off = (gy * 19) % 48;                         // planks are staggered row by row
      for (let px = 0; px < TILE; ) {
        const plank = Math.floor((x + px + off) / 48);
        const next = Math.min(TILE, (plank + 1) * 48 - off - x);
        q(c, x + px, y + row * 8, next - px, 8, shade(base, (hash(plank, gy) - 0.5) * 0.09));
        if ((x + px + off) % 48 === 0) q(c, x + px, y + row * 8, 1, 8, shade(base, -0.16)); // plank end
        px = next;
      }
      q(c, x, y + row * 8, TILE, 1, shade(base, 0.07));
      q(c, x, y + row * 8 + 7, TILE, 1, shade(base, -0.14));
      for (let g = 0; g < 2; g++) {                       // grain
        const gx = Math.floor(hash(tx * 7 + g, gy * 3) * 22);
        q(c, x + gx, y + row * 8 + 2 + g * 3, 6 + Math.floor(hash(gx, gy) * 5), 1, shade(base, -0.06));
      }
    }
    if (kind === "door") {
      q(c, x, y, TILE, 2, PAL.gold);
      q(c, x, y + TILE - 2, TILE, 2, PAL.gold);
    }
  } else if (kind === "checker") {
    const dark = (tx + ty) % 2 === 0;
    const base = dark ? PAL.creamDark : PAL.cream;
    q(c, x, y, TILE, TILE, base);
    c.strokeStyle = dark ? "rgba(122,86,55,0.16)" : "rgba(122,86,55,0.10)";    // marble veins
    c.lineWidth = 1;
    for (let v = 0; v < 2; v++) {
      const a = hash(tx * 3 + v, ty * 5) * TILE;
      c.beginPath();
      c.moveTo(x + a, y);
      c.lineTo(x + ((a + 14 + v * 9) % TILE), y + TILE);
      c.stroke();
    }
    q(c, x, y, TILE, 1, shade(base, 0.08));
    q(c, x, y, 1, TILE, shade(base, 0.08));
    q(c, x, y + TILE - 1, TILE, 1, shade(base, -0.12));
    q(c, x + TILE - 1, y, 1, TILE, shade(base, -0.12));
  } else if (kind === "terracotta") {
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const col = shade(PAL.terracotta, (hash(tx * 2 + i, ty * 2 + j) - 0.5) * 0.1);
        q(c, x + i * 16, y + j * 16, 16, 16, PAL.sand);                       // grout
        q(c, x + i * 16 + 1, y + j * 16 + 1, 15, 15, col);
        q(c, x + i * 16 + 1, y + j * 16 + 1, 15, 1, shade(PAL.terracotta, 0.1));
        q(c, x + i * 16 + 4 + Math.floor(hash(tx + i, ty + j) * 8), y + j * 16 + 6, 2, 1, shade(PAL.terracotta, -0.12));
      }
    }
  } else {
    const base = CARPET[kind] ?? PAL.grey;
    q(c, x, y, TILE, TILE, base);
    for (let j = 0; j < TILE; j += 2) {                   // woven texture
      for (let i = (j / 2) % 2 ? 0 : 2; i < TILE; i += 4) q(c, x + i, y + j, 2, 1, shade(base, -0.035));
    }
    for (let i = 0; i < 6; i++) {
      q(c, x + Math.floor(hash(tx * 9 + i, ty * 7) * 31), y + Math.floor(hash(tx * 3, ty * 11 + i) * 31), 1, 1,
        shade(base, i % 2 ? 0.1 : -0.1));
    }
    // a darker border where the carpet meets a wall, like a fitted carpet's edging
    const edge = shade(base, -0.16);
    const trim = shade(base, 0.1);
    if (isWall(tx, ty - 1)) q(c, x, y, TILE, 3, edge), q(c, x, y + 3, TILE, 1, trim);
    if (isWall(tx, ty + 1)) q(c, x, y + TILE - 3, TILE, 3, edge), q(c, x, y + TILE - 4, TILE, 1, trim);
    if (isWall(tx - 1, ty)) q(c, x, y, 3, TILE, edge), q(c, x + 3, y, 1, TILE, trim);
    if (isWall(tx + 1, ty)) q(c, x + TILE - 3, y, 3, TILE, edge), q(c, x + TILE - 4, y, 1, TILE, trim);
  }
}

export interface Ambience { time: "day" | "evening" | "night"; rain: boolean }

/** Day/night follows the real clock; rain falls in the monsoon months. Settings can override both. */
export function ambience(): Ambience {
  const pick = store.getState().settings.ambience;
  const now = new Date();
  const h = now.getHours();
  const clock = h >= 19 || h < 6 ? "night" : h >= 17 ? "evening" : "day";
  const monsoon = now.getMonth() >= 5 && now.getMonth() <= 8;
  if (pick === "auto") return { time: clock, rain: monsoon };
  if (pick === "rain") return { time: "day", rain: true };
  return { time: pick, rain: false };
}

function skyColours(): [string, string] {
  const a = ambience();
  if (a.rain) return ["#6f7f96", "#93a2b5"];
  if (a.time === "night") return ["#1b2148", "#343d7a"];
  if (a.time === "evening") return ["#e8944a", "#f4cf5d"];
  return ["#6fb2e0", "#b6e0f2"];
}

/** Top-wall windows, in pixels: where rain is drawn. */
export const WINDOWS = Array.from({ length: COLS }, (_, tx) => tx).filter((tx) => tx % 5 === 3 && isWall(tx, 0) && !isWall(tx, 1))
  .map((tx) => ({ x: tx * TILE + 6, y: 13, w: 20, h: 11 }));

function drawWall(c: Ctx, tx: number, ty: number) {
  const x = tx * TILE;
  const y = ty * TILE;
  // the top of the wall, seen from above: plum brickwork
  q(c, x, y, TILE, TILE, PAL.plum);
  for (let row = 0; row < 4; row++) {
    q(c, x, y + row * 8 + 7, TILE, 1, shade(PAL.plum, -0.07));
    q(c, x + ((row % 2) * 8 + (tx % 2) * 16) % TILE, y + row * 8, 1, 7, shade(PAL.plum, -0.07));
  }
  if (!isWall(tx - 1, ty)) q(c, x, y, 2, TILE, PAL.plumLight);
  if (!isWall(tx + 1, ty)) q(c, x + TILE - 2, y, 2, TILE, shade(PAL.plum, -0.1));
  if (!isWall(tx, ty - 1)) q(c, x, y, TILE, 2, PAL.plumLight);
  if (isWall(tx, ty + 1)) return;

  // the wall's face, visible from below: this is what gives the 3/4 view its depth
  q(c, x, y + 9, TILE, 23, PAL.cream);
  q(c, x, y + 9, TILE, 1, shade(PAL.plum, -0.12));
  q(c, x, y + 10, TILE, 2, "rgba(43,34,51,0.16)");           // shadow under the wall cap
  q(c, x, y + 20, TILE, 1, PAL.woodDark);                    // chair rail
  q(c, x, y + 21, TILE, 9, PAL.sand);                        // wainscot
  for (let g = 0; g < TILE; g += 8) q(c, x + g, y + 22, 1, 7, shade(PAL.sand, -0.12));
  q(c, x, y + 21, TILE, 1, shade(PAL.sand, 0.1));
  q(c, x, y + 29, TILE, 3, PAL.woodDeep);                    // skirting board
  q(c, x, y + 29, TILE, 1, PAL.woodDark);
  if (ty === 0 && tx % 5 === 3) {
    const [top, bottom] = skyColours();
    q(c, x + 3, y + 10, 26, 17, PAL.woodDeep);               // window frame
    q(c, x + 5, y + 12, 22, 13, top);
    q(c, x + 5, y + 19, 22, 6, bottom);
    q(c, x + 15, y + 12, 2, 13, PAL.woodDeep);               // mullions
    q(c, x + 5, y + 18, 22, 1, PAL.woodDeep);
    q(c, x + 2, y + 27, 28, 2, PAL.cream);                   // sill
    q(c, x + 5, y + 12, 3, 13, PAL.redDark);                 // curtains
    q(c, x + 24, y + 12, 3, 13, PAL.redDark);
    q(c, x + 6, y + 12, 1, 13, PAL.red);
    q(c, x + 25, y + 12, 1, 13, PAL.red);
    q(c, x + 9, y + 13, 3, 1, "rgba(255,255,255,0.5)");      // glint
  }
}

function drawBackground(c: Ctx) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const kind = floorAt[ty][tx];
      if (kind === "wall") {
        drawWall(c, tx, ty);
        continue;
      }
      drawFloor(c, tx, ty, kind);
      // soft shadows where floor meets wall
      if (isWall(tx, ty - 1)) [0.2, 0.13, 0.07].forEach((a, i) => q(c, tx * TILE, ty * TILE + i * 3, TILE, 3, `rgba(43,34,51,${a})`));
      if (isWall(tx - 1, ty)) [0.12, 0.06].forEach((a, i) => q(c, tx * TILE + i * 2, ty * TILE, 2, TILE, `rgba(43,34,51,${a})`));
    }
  }
  // contact shadows ground the furniture on the floor
  for (const f of FURNITURE) {
    if (!f.solid || f.wall) continue;
    q(c, f.x * TILE + 1, (f.y + f.h) * TILE - 5, f.w * TILE + 3, 8, "rgba(43,34,51,0.2)");
    q(c, f.x * TILE + 3, (f.y + f.h) * TILE + 3, f.w * TILE - 1, 2, "rgba(43,34,51,0.1)");
  }
}

/** Dark outline around whatever is drawn on `src`: the single biggest step from "blocks" to "pixel art". */
function outlined(src: HTMLCanvasElement, colour: string = PAL.ink): HTMLCanvasElement {
  const sil = document.createElement("canvas");
  sil.width = src.width;
  sil.height = src.height;
  const s = sil.getContext("2d")!;
  s.drawImage(src, 0, 0);
  s.globalCompositeOperation = "source-in";
  s.fillStyle = colour;
  s.fillRect(0, 0, sil.width, sil.height);
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const o = out.getContext("2d")!;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) o.drawImage(sil, dx, dy);
  o.drawImage(src, 0, 0);
  return out;
}

// ---------------------------------------------------------------- furniture
/** Extra height (logical px) a piece rises above its tile footprint. */
const RISE: Record<string, number> = {
  desk: 9, bigdesk: 9, reception: 9, plant: 10, bookshelf: 12, cabinet: 8, pinboard: 8, whiteboard: 8,
  bigscreen: 10, toolbench: 8, trophies: 12, printer: 5, cooler: 10, chaicounter: 9, sofa: 5, table: 4,
  meetingtable: 4,
};

function monitor(c: Ctx, x: number, y: number) {
  r(c, x, y, 9, 7, PAL.ink);
  r(c, x + 1, y + 1, 7, 5, PAL.screen);
  r(c, x + 2, y + 2, 4, 1, PAL.white);
  r(c, x + 2, y + 4, 3, 1, PAL.tealDark);
  r(c, x + 3, y + 7, 3, 2, PAL.greyDark);
}

function desk(c: Ctx, w: number, rise: number, top: string) {
  r(c, 0, rise, w, 8, top);
  r(c, 0, rise, w, 1, shade(top, 0.12));
  r(c, 0, rise + 8, w, 8, shade(top, -0.18));
  r(c, 1, rise + 10, w - 2, 5, shade(top, -0.28));
  r(c, 0, rise + 15, w, 1, PAL.ink);
}

const DRAW: Record<string, (c: Ctx, w: number, h: number, rise: number) => void> = {
  desk(c, w, _h, rise) {
    desk(c, w, rise, PAL.wood);
    monitor(c, 3, rise - 8);
    r(c, 18, rise + 2, 8, 4, PAL.paper);
    r(c, 19, rise + 3, 5, 1, PAL.grey);
    r(c, 14, rise + 1, 3, 3, PAL.red);
  },
  bigdesk(c, w, _h, rise) {
    desk(c, w, rise, PAL.woodDeep);
    monitor(c, 5, rise - 8);
    r(c, 22, rise + 2, 9, 4, PAL.paper);
    r(c, 34, rise, 6, 5, PAL.redDark);   // the approval stamp
    r(c, 36, rise - 3, 2, 3, PAL.woodDark);
    r(c, 42, rise + 1, 4, 4, PAL.white); // coffee mug
    r(c, 43, rise + 2, 2, 1, PAL.woodDeep);
  },
  reception(c, w, _h, rise) {
    desk(c, w, rise, PAL.teal);
    r(c, 0, rise + 8, w, 2, PAL.gold);
    monitor(c, 30, rise - 8);
    r(c, 6, rise + 1, 8, 5, PAL.paper);  // clipboard
    r(c, 8, rise, 4, 1, PAL.greyDark);
    r(c, 20, rise + 1, 4, 4, PAL.yellow);
  },
  table(c, w, _h, rise) {
    desk(c, w, rise, PAL.wood);
    r(c, 10, rise + 2, 7, 4, PAL.paper);
    r(c, 22, rise + 2, 2, 3, PAL.blue);
  },
  meetingtable(c, w, h, rise) {
    r(c, 0, rise, w, h - 6, PAL.woodDark);
    r(c, 1, rise + 1, w - 2, h - 9, PAL.wood);
    r(c, 0, rise + h - 6, w, 6, shade(PAL.woodDark, -0.2));
    r(c, 0, rise + h - 1, w, 1, PAL.ink);
    for (let i = 0; i < 4; i++) r(c, 8 + i * 14, rise + 6 + (i % 2) * 8, 6, 4, i % 2 ? PAL.paper : PAL.mint);
  },
  plant(c, _w, _h, rise) {
    r(c, 4, rise + 8, 8, 7, PAL.terracotta);
    r(c, 3, rise + 7, 10, 2, shade(PAL.terracotta, -0.12));
    r(c, 4, rise + 15, 8, 1, PAL.ink);
    r(c, 3, rise - 4, 10, 10, PAL.leafDark);
    r(c, 1, rise - 1, 6, 6, PAL.leaf);
    r(c, 9, rise - 7, 6, 8, PAL.leaf);
    r(c, 5, rise - 9, 5, 6, PAL.leaf);
    r(c, 6, rise - 6, 2, 2, PAL.mint);
    r(c, 11, rise - 4, 2, 2, PAL.mint);
  },
  bookshelf(c, w, _h, rise) {
    r(c, 0, 0, w, rise + 16, PAL.woodDeep);
    const cols = [PAL.red, PAL.blue, PAL.yellow, PAL.leaf, PAL.purple, PAL.orange, PAL.teal];
    for (let row = 0; row < 3; row++) {
      r(c, 1, 1 + row * 9, w - 2, 8, shade(PAL.woodDeep, -0.15));
      for (let i = 0; i < w - 4; i += 3) {
        const hgt = 5 + Math.floor(hash(i, row) * 3);
        r(c, 2 + i, 9 + row * 9 - hgt, 2, hgt, cols[(i + row * 2) % cols.length]);
      }
    }
    r(c, 0, rise + 15, w, 1, PAL.ink);
  },
  cabinet(c, w, _h, rise) {
    r(c, 0, 0, w, rise + 16, PAL.greyDark);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 3; j++) {
        r(c, 1 + i * 16, 1 + j * 8, 14, 7, PAL.grey);
        r(c, 6 + i * 16, 4 + j * 8, 4, 1, PAL.ink);
      }
    }
  },
  pinboard(c, w, _h, rise) {
    r(c, 0, 0, w, rise + 12, PAL.woodDeep);
    r(c, 1, 1, w - 2, rise + 10, PAL.cork);
    const cols = [PAL.yellow, PAL.pink, PAL.mint, PAL.sky, PAL.paper, PAL.orange];
    for (let i = 0; i < 9; i++) {
      const x = 3 + ((i * 7) % (w - 9));
      const y = 2 + ((i * 5) % (rise + 3));
      r(c, x, y, 5, 5, cols[i % cols.length]);
      r(c, x + 2, y, 1, 1, PAL.red);
    }
    c.strokeStyle = PAL.red;
    c.lineWidth = P;
    c.beginPath();
    c.moveTo(6 * P, 5 * P);
    c.lineTo(30 * P, 12 * P);
    c.lineTo(52 * P, 6 * P);
    c.stroke();
  },
  whiteboard(c, w, _h, rise) {
    r(c, 0, 0, w, rise + 12, PAL.greyDark);
    r(c, 1, 1, w - 2, rise + 10, PAL.white);
    c.strokeStyle = PAL.blue;
    c.lineWidth = P;
    c.beginPath();
    c.arc(12 * P, 8 * P, 4 * P, 0, Math.PI * 2);
    c.moveTo(16 * P, 8 * P);
    c.lineTo(26 * P, 5 * P);
    c.moveTo(16 * P, 9 * P);
    c.lineTo(26 * P, 13 * P);
    c.stroke();
    r(c, 26, 3, 4, 4, PAL.red);
    r(c, 26, 11, 4, 4, PAL.leaf);
    for (let i = 0; i < 4; i++) r(c, 36, 4 + i * 3, 20 - i * 3, 1, PAL.ink);
    r(c, 4, rise + 12, 2, 4, PAL.greyDark);
    r(c, w - 6, rise + 12, 2, 4, PAL.greyDark);
    r(c, 20, rise + 10, 10, 2, PAL.grey);
  },
  bigscreen(c, w, _h, rise) {
    r(c, 0, 0, w, rise + 10, PAL.ink);
    r(c, 1, 1, w - 2, rise + 8, "#1d2b3a");
    const cols = [PAL.mint, PAL.screen, PAL.yellow, PAL.pink];
    for (let i = 0; i < 7; i++) r(c, 3 + (i % 3) * 2, 3 + i * 2, 8 + ((i * 5) % 14), 1, cols[i % cols.length]);
    r(c, 13, rise + 10, 6, 6, PAL.greyDark);
  },
  toolbench(c, w, _h, rise) {
    desk(c, w, rise, PAL.woodDark);
    r(c, 3, rise - 6, 2, 8, PAL.grey);       // wrench
    r(c, 2, rise - 7, 4, 2, PAL.grey);
    r(c, 10, rise - 4, 8, 6, PAL.red);       // toolbox
    r(c, 12, rise - 5, 4, 1, PAL.ink);
    r(c, 24, rise - 5, 12, 7, PAL.ink);      // laptop
    r(c, 25, rise - 4, 10, 5, PAL.screen);
    r(c, 40, rise - 2, 3, 4, PAL.yellow);
  },
  trophies(c, w, _h, rise) {
    r(c, 0, 0, w, rise + 16, PAL.woodDeep);
    for (let row = 0; row < 2; row++) {
      r(c, 1, 2 + row * 13, w - 2, 11, shade(PAL.woodDeep, -0.15));
      for (let i = 0; i < 3; i++) {
        const x = 4 + i * 9;
        r(c, x, 5 + row * 13, 5, 4, PAL.gold);
        r(c, x + 2, 9 + row * 13, 1, 2, PAL.gold);
        r(c, x + 1, 11 + row * 13, 3, 1, PAL.woodDark);
      }
    }
  },
  printer(c, _w, _h, rise) {
    r(c, 1, rise + 4, 14, 11, PAL.grey);
    r(c, 2, rise, 12, 5, PAL.greyDark);
    r(c, 4, rise - 3, 8, 5, PAL.paper);
    r(c, 3, rise + 9, 10, 2, PAL.ink);
    r(c, 12, rise + 6, 2, 1, PAL.leaf);
    r(c, 1, rise + 15, 14, 1, PAL.ink);
  },
  cooler(c, _w, _h, rise) {
    r(c, 4, rise - 6, 8, 9, PAL.sky);
    r(c, 5, rise - 5, 2, 6, PAL.white);
    r(c, 3, rise + 3, 10, 12, PAL.white);
    r(c, 5, rise + 6, 2, 2, PAL.blue);
    r(c, 9, rise + 6, 2, 2, PAL.red);
    r(c, 3, rise + 15, 10, 1, PAL.ink);
  },
  chaicounter(c, w, _h, rise) {
    desk(c, w, rise, PAL.creamDark);
    r(c, 4, rise - 5, 9, 8, PAL.grey);       // kettle
    r(c, 13, rise - 3, 3, 2, PAL.grey);
    r(c, 6, rise - 7, 5, 2, PAL.ink);
    for (let i = 0; i < 4; i++) {            // chai glasses
      r(c, 22 + i * 7, rise, 4, 5, PAL.white);
      r(c, 23 + i * 7, rise + 1, 2, 3, PAL.woodDark);
    }
    r(c, 52, rise - 3, 8, 6, PAL.yellow);    // biscuit tin
    r(c, 52, rise - 3, 8, 2, PAL.red);
  },
  sofa(c, w, _h, rise) {
    r(c, 0, rise, w, 16, PAL.purple);
    r(c, 0, rise, w, 6, shade(PAL.purple, -0.15));
    r(c, 2, rise + 6, w / 2 - 3, 7, shade(PAL.purple, 0.12));
    r(c, w / 2 + 1, rise + 6, w / 2 - 3, 7, shade(PAL.purple, 0.12));
    r(c, 0, rise + 15, w, 1, PAL.ink);
  },
  rug(c, w, h) {
    r(c, 0, 0, w, h, PAL.redDark);
    r(c, 2, 2, w - 4, h - 4, PAL.red);
    r(c, 5, 5, w - 10, h - 10, PAL.sand);
    r(c, 8, 8, w - 16, h - 16, PAL.red);
    for (let i = 12; i < w - 12; i += 8) r(c, i, h / 2 - 2, 4, 4, PAL.gold);
  },
  rangoli(c, w, h) {
    const cx = (w / 2) * P;
    const cy = (h / 2) * P;
    const rings: [number, string][] = [[14, PAL.red], [11, PAL.yellow], [8, PAL.orange], [5, PAL.pink], [2, PAL.white]];
    for (const [rad, col] of rings) {
      c.fillStyle = col;
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        const px = Math.round((cx + Math.cos(ang) * rad * P) / P) * P;
        const py = Math.round((cy + Math.sin(ang) * rad * P) / P) * P;
        c.fillRect(px - P, py - P, P * 3, P * 3);
      }
    }
  },
  questboard(c, w) {
    r(c, 0, 1, w, 14, PAL.woodDeep);
    r(c, 1, 2, w - 2, 12, PAL.cork);
    const cols = [PAL.paper, PAL.yellow, PAL.mint, PAL.sky, PAL.pink, PAL.paper, PAL.gold];
    for (let i = 0; i < 7; i++) {
      r(c, 3 + i * 8.5, 4, 6, 8, cols[i]);
      r(c, 4 + i * 8.5, 6, 4, 1, PAL.greyDark);
      r(c, 4 + i * 8.5, 8, 3, 1, PAL.greyDark);
    }
  },
  worldmap(c, w) {
    r(c, 0, 1, w, 14, PAL.woodDeep);
    r(c, 1, 2, w - 2, 12, PAL.sky);
    r(c, 5, 4, 10, 5, PAL.leaf);
    r(c, 8, 9, 5, 4, PAL.leaf);
    r(c, 20, 3, 14, 6, PAL.leaf);
    r(c, 26, 9, 5, 3, PAL.leaf);
    r(c, 37, 8, 6, 4, PAL.leaf);
    r(c, 27, 8, 2, 2, PAL.red);
  },
  clock(c) {
    r(c, 4, 4, 8, 8, PAL.ink);
    r(c, 5, 5, 6, 6, PAL.white);
    r(c, 8, 6, 1, 3, PAL.ink);
    r(c, 8, 8, 2, 1, PAL.red);
  },
  door(c, w) {
    r(c, 0, 0, w, 16, PAL.woodDeep);
    r(c, 1, 2, w / 2 - 2, 14, PAL.sky);
    r(c, w / 2 + 1, 2, w / 2 - 2, 14, PAL.sky);
    r(c, w / 2 - 3, 9, 2, 2, PAL.gold);
    r(c, w / 2 + 1, 9, 2, 2, PAL.gold);
    r(c, 3, 4, 2, 6, PAL.white);
    r(c, w / 2 + 3, 4, 2, 6, PAL.white);
  },
};

export function furnitureKey(f: Furniture) {
  return `f-${f.type}-${f.w}x${f.h}`;
}
export function furnitureRise(type: string) {
  return (RISE[type] ?? 0) * P;
}


// ---- room-specific pieces: every agent's workplace says what they do
Object.assign(RISE, {
  desk_intel: 9, desk_clinic: 9, desk_workshop: 9, desk_scout: 9, desk_coach: 9, chair: 3, bosschair: 5,
  visitorchair: 2, evidence: 6, filebox: 4, floorlamp: 14, lightbox: 8, resumestack: 4, serverrack: 8, crate: 3,
  coffeemachine: 8, chart: 10, globe: 8, telescope: 10, bench: 2, studentdesk: 4, waterjug: 6, fridge: 12, cafetable: 4,
  magtable: 2, umbrellastand: 6,
});

function chair(c: Ctx, rise: number, main: string, tall = false) {
  r(c, 2, 0, 12, rise + 10, shade(main, -0.2));          // backrest, visible around the sitter
  r(c, 3, 1, 10, rise + 8, main);
  r(c, 4, 2, 8, 1, shade(main, 0.15));
  if (tall) for (let i = 0; i < 3; i++) r(c, 5 + i * 3, 4, 1, 1, PAL.gold);
  r(c, 1, rise + 6, 2, 5, shade(main, -0.3));            // armrests
  r(c, 13, rise + 6, 2, 5, shade(main, -0.3));
  r(c, 3, rise + 10, 10, 3, shade(main, -0.1));          // seat
  r(c, 7, rise + 13, 2, 2, PAL.greyDark);
  r(c, 4, rise + 15, 8, 1, PAL.ink);
}

Object.assign(DRAW, {
  chair: (c: Ctx, _w: number, _h: number, rise: number) => chair(c, rise, PAL.blueDark),
  bosschair: (c: Ctx, _w: number, _h: number, rise: number) => chair(c, rise, PAL.woodDeep, true),
  visitorchair: (c: Ctx, _w: number, _h: number, rise: number) => chair(c, rise, PAL.teal),

  desk_intel(c: Ctx, w: number, _h: number, rise: number) {
    desk(c, w, rise, PAL.woodDark);
    monitor(c, 3, rise - 8);
    r(c, 15, rise + 1, 7, 5, PAL.sand);                  // case folders
    r(c, 16, rise + 2, 7, 5, PAL.yellow);
    r(c, 17, rise + 3, 4, 1, PAL.woodDeep);
    c.strokeStyle = PAL.ink;                             // magnifying glass
    c.lineWidth = 2;
    c.beginPath();
    c.arc(27 * P, (rise + 3) * P, 2.5 * P, 0, Math.PI * 2);
    c.stroke();
    r(c, 29, rise + 5, 2, 1, PAL.woodDeep);
    r(c, 13, rise, 2, 3, PAL.white);                     // mug
  },
  desk_clinic(c: Ctx, w: number, _h: number, rise: number) {
    desk(c, w, rise, PAL.white);
    monitor(c, 3, rise - 8);
    r(c, 16, rise + 1, 8, 6, PAL.paper);                 // a resume under the red pen
    r(c, 17, rise + 2, 5, 1, PAL.grey);
    r(c, 17, rise + 4, 6, 1, PAL.red);
    r(c, 17, rise + 5, 3, 1, PAL.grey);
    r(c, 26, rise - 2, 3, 4, PAL.teal);                  // pen cup
    r(c, 26, rise - 4, 1, 2, PAL.red);
    r(c, 28, rise - 5, 1, 3, PAL.blue);
    r(c, 13, rise + 1, 2, 2, PAL.red);
  },
  desk_workshop(c: Ctx, w: number, _h: number, rise: number) {
    desk(c, w, rise, PAL.wood);
    monitor(c, 2, rise - 8);
    monitor(c, 12, rise - 8);                            // two screens of code
    r(c, 13, rise - 7, 5, 1, PAL.mint);
    r(c, 13, rise - 5, 3, 1, PAL.yellow);
    r(c, 3, rise + 2, 12, 3, PAL.greyDark);              // keyboard
    r(c, 4, rise + 3, 10, 1, PAL.grey);
    r(c, 24, rise, 2, 5, PAL.leaf);                      // energy drink
    r(c, 27, rise + 2, 4, 2, PAL.orange);                // pliers
    r(c, 28, rise + 4, 1, 2, PAL.grey);
  },
  desk_scout(c: Ctx, w: number, _h: number, rise: number) {
    desk(c, w, rise, PAL.wood);
    r(c, 3, rise - 8, 9, 7, PAL.ink);                    // a map on the screen
    r(c, 4, rise - 7, 7, 5, PAL.sky);
    r(c, 5, rise - 6, 3, 2, PAL.leaf);
    r(c, 9, rise - 4, 2, 2, PAL.leaf);
    r(c, 8, rise - 6, 1, 1, PAL.red);
    r(c, 6, rise - 1, 3, 2, PAL.greyDark);
    r(c, 16, rise + 2, 3, 4, PAL.ink);                   // binoculars
    r(c, 20, rise + 2, 3, 4, PAL.ink);
    r(c, 19, rise + 3, 1, 2, PAL.greyDark);
    r(c, 26, rise + 1, 4, 5, PAL.blueDark);              // passport
    r(c, 27, rise + 3, 2, 1, PAL.gold);
  },
  desk_coach(c: Ctx, w: number, _h: number, rise: number) {
    desk(c, w, rise, PAL.wood);
    r(c, 4, rise - 6, 5, 4, PAL.gold);                   // trophy cup
    r(c, 3, rise - 5, 1, 2, PAL.gold);
    r(c, 9, rise - 5, 1, 2, PAL.gold);
    r(c, 6, rise - 2, 1, 2, PAL.gold);
    r(c, 5, rise, 3, 1, PAL.woodDeep);
    r(c, 14, rise + 1, 7, 6, PAL.woodDark);              // clipboard
    r(c, 15, rise + 2, 5, 4, PAL.paper);
    r(c, 16, rise + 3, 3, 1, PAL.blue);
    c.fillStyle = PAL.white;                             // stopwatch
    c.beginPath();
    c.arc(27 * P, (rise + 4) * P, 2.5 * P, 0, Math.PI * 2);
    c.fill();
    r(c, 26.5, rise + 0.5, 1, 1, PAL.red);
    r(c, 27, rise + 3, 0.5, 1.5, PAL.ink);
  },
  evidence(c: Ctx, w: number, _h: number, rise: number) {
    for (const [x, y, bw] of [[1, rise + 6, 14], [16, rise + 4, 14], [5, rise - 2, 14]] as const) {
      r(c, x, y, bw, 10, PAL.cork);
      r(c, x, y, bw, 2, shade(PAL.cork, 0.12));
      r(c, x + 5, y + 4, 5, 3, PAL.paper);
      r(c, x + 6, y + 5, 3, 1, PAL.red);
    }
    void w;
  },
  filebox(c: Ctx, _w: number, _h: number, rise: number) {
    r(c, 2, rise + 4, 12, 11, PAL.blueDark);
    r(c, 2, rise + 4, 12, 2, PAL.blue);
    for (let i = 0; i < 4; i++) r(c, 3 + i * 3, rise + 1 - (i % 2), 2, 4, [PAL.paper, PAL.yellow, PAL.mint, PAL.pink][i]);
    r(c, 6, rise + 9, 4, 2, PAL.paper);
  },
  floorlamp(c: Ctx, _w: number, _h: number, rise: number) {
    r(c, 7, 8, 2, rise + 6, PAL.greyDark);
    r(c, 5, rise + 14, 6, 2, PAL.ink);
    r(c, 3, 0, 10, 8, PAL.yellow);
    r(c, 4, 1, 8, 2, PAL.paper);
    r(c, 3, 7, 10, 1, PAL.gold);
  },
  lightbox(c: Ctx, w: number, _h: number, rise: number) {
    desk(c, w, rise, PAL.grey);
    r(c, 2, rise - 2, w - 4, 8, PAL.white);              // the lit examination table
    r(c, 3, rise - 1, w - 6, 6, "#e9fbff");
    for (let i = 0; i < 3; i++) {
      r(c, 5 + i * 14, rise - 1, 9, 6, PAL.paper);
      r(c, 6 + i * 14, rise, 6, 1, PAL.greyDark);
      r(c, 6 + i * 14, rise + 2, 7, 1, i === 1 ? PAL.red : PAL.grey);
      r(c, 6 + i * 14, rise + 3, 4, 1, PAL.grey);
    }
  },
  redcross(c: Ctx) {
    r(c, 4, 6, 8, 8, PAL.white);
    r(c, 7, 7, 2, 6, PAL.red);
    r(c, 5, 9, 6, 2, PAL.red);
  },
  resumestack(c: Ctx, _w: number, _h: number, rise: number) {
    for (let i = 0; i < 6; i++) r(c, 3 + (i % 2), rise + 13 - i * 2, 10, 2, i % 2 ? PAL.paper : PAL.cream);
    r(c, 5, rise + 3, 5, 1, PAL.red);
  },
  pegboard(c: Ctx, w: number) {
    r(c, 1, 5, w - 2, 9, PAL.sand);
    r(c, 3, 6, 1, 6, PAL.greyDark);                      // wrench
    r(c, 2, 6, 3, 2, PAL.greyDark);
    r(c, 8, 6, 2, 3, PAL.red);                           // hammer
    r(c, 8.5, 9, 1, 4, PAL.woodDeep);
    r(c, 14, 6, 1, 7, PAL.yellow);                       // screwdrivers
    r(c, 18, 6, 1, 7, PAL.blue);
    r(c, 23, 7, 5, 5, PAL.grey);                         // saw
    r(c, 28, 8, 2, 3, PAL.woodDeep);
  },
  serverrack(c: Ctx, _w: number, h: number, rise: number) {
    r(c, 1, 0, 14, rise + h, PAL.ink);
    r(c, 2, 1, 12, rise + h - 3, "#1d2b3a");
    for (let i = 0; i < 7; i++) {
      r(c, 3, 3 + i * 5, 10, 3, PAL.greyDark);
      r(c, 4, 4 + i * 5, 1, 1, i % 3 ? PAL.mint : PAL.red);
      r(c, 6, 4 + i * 5, 1, 1, PAL.mint);
      r(c, 9, 4 + i * 5, 3, 1, PAL.ink);
    }
  },
  crate(c: Ctx, _w: number, _h: number, rise: number) {
    r(c, 1, rise + 2, 14, 13, PAL.woodDark);
    r(c, 2, rise + 3, 12, 11, PAL.wood);
    r(c, 1, rise + 7, 14, 2, PAL.woodDark);
    r(c, 7, rise + 3, 2, 11, PAL.woodDark);
  },
  chart(c: Ctx, _w: number, _h: number, rise: number) {
    r(c, 3, rise + 6, 1, 10, PAL.woodDeep);              // an easel with the readiness chart
    r(c, 12, rise + 6, 1, 10, PAL.woodDeep);
    r(c, 1, 0, 14, rise + 7, PAL.woodDeep);
    r(c, 2, 1, 12, rise + 5, PAL.paper);
    for (let i = 0; i < 5; i++) r(c, 3 + i * 2, rise + 4 - i * 2, 1.5, 2 + i * 2, i > 2 ? PAL.leaf : PAL.blue);
    r(c, 3, 2, 6, 1, PAL.red);
  },
  coffeemachine(c: Ctx, _w: number, _h: number, rise: number) {
    r(c, 2, rise + 8, 12, 7, PAL.woodDark);
    r(c, 3, rise - 4, 10, 12, PAL.ink);
    r(c, 4, rise - 3, 8, 3, PAL.red);
    r(c, 6, rise + 3, 4, 4, PAL.white);
    r(c, 7, rise + 4, 2, 1, PAL.woodDeep);
    r(c, 11, rise, 1, 1, PAL.mint);
  },
  rugcabin(c: Ctx, w: number, h: number) {
    r(c, 0, 0, w, h, PAL.gold);
    r(c, 1, 1, w - 2, h - 2, PAL.blueDark);
    r(c, 3, 3, w - 6, h - 6, PAL.night);
    for (let i = 8; i < w - 8; i += 10) r(c, i, h / 2 - 1, 3, 3, PAL.gold);
  },
  globe(c: Ctx, _w: number, _h: number, rise: number) {
    r(c, 6, rise + 9, 4, 5, PAL.woodDeep);
    r(c, 4, rise + 14, 8, 1, PAL.ink);
    c.fillStyle = PAL.sky;
    c.beginPath();
    c.arc(8 * P, (rise + 3) * P, 6 * P, 0, Math.PI * 2);
    c.fill();
    r(c, 4, rise, 4, 4, PAL.leaf);
    r(c, 9, rise + 3, 4, 3, PAL.leaf);
    r(c, 6, rise + 6, 2, 2, PAL.leaf);
  },
  telescope(c: Ctx, _w: number, _h: number, rise: number) {
    c.strokeStyle = PAL.woodDeep;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(8 * P, (rise + 2) * P);
    c.lineTo(3 * P, (rise + 15) * P);
    c.moveTo(8 * P, (rise + 2) * P);
    c.lineTo(13 * P, (rise + 15) * P);
    c.moveTo(8 * P, (rise + 2) * P);
    c.lineTo(8 * P, (rise + 15) * P);
    c.stroke();
    c.strokeStyle = PAL.ink;
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(3 * P, (rise + 4) * P);
    c.lineTo(13 * P, (rise - 3) * P);
    c.stroke();
    r(c, 12, rise - 5, 3, 3, PAL.gold);
  },
  noticeboard(c: Ctx, w: number) {
    r(c, 1, 3, w - 2, 12, PAL.woodDeep);
    r(c, 2, 4, w - 4, 10, PAL.cork);
    const cols = [PAL.paper, PAL.yellow, PAL.pink, PAL.mint, PAL.sky];
    for (let i = 0; i < 5; i++) {
      r(c, 4 + i * 5, 5 + (i % 2) * 3, 4, 5, cols[i]);
      r(c, 5.5 + i * 5, 5 + (i % 2) * 3, 1, 1, PAL.red);
    }
  },
  bench(c: Ctx, w: number, _h: number, rise: number) {
    r(c, 0, rise + 4, w, 5, PAL.wood);
    r(c, 0, rise + 4, w, 1, shade(PAL.wood, 0.12));
    r(c, 0, rise + 9, w, 3, PAL.woodDark);
    r(c, 2, rise + 12, 2, 4, PAL.woodDeep);
    r(c, w - 4, rise + 12, 2, 4, PAL.woodDeep);
  },
  studentdesk(c: Ctx, _w: number, _h: number, rise: number) {
    r(c, 1, rise + 3, 14, 6, PAL.wood);
    r(c, 1, rise + 3, 14, 1, shade(PAL.wood, 0.12));
    r(c, 1, rise + 9, 14, 3, PAL.woodDark);
    r(c, 2, rise + 12, 2, 4, PAL.greyDark);
    r(c, 12, rise + 12, 2, 4, PAL.greyDark);
    r(c, 4, rise + 4, 6, 4, PAL.paper);                  // notebook
    r(c, 5, rise + 5, 4, 1, PAL.blue);
    r(c, 11, rise + 4, 1, 4, PAL.yellow);                // pencil
  },
  poster(c: Ctx) {
    r(c, 3, 3, 10, 12, PAL.night);
    r(c, 4, 4, 8, 1, PAL.yellow);
    c.fillStyle = PAL.yellow;
    c.font = '8px "Press Start 2P"';
    c.fillText("O(n)", 7, 24);
  },
  certificate(c: Ctx) {
    r(c, 3, 4, 10, 9, PAL.gold);
    r(c, 4, 5, 8, 7, PAL.paper);
    r(c, 5, 6, 6, 1, PAL.greyDark);
    r(c, 5, 8, 4, 1, PAL.grey);
    r(c, 9, 9, 2, 2, PAL.red);
  },
  waterjug(c: Ctx, _w: number, _h: number, rise: number) {
    r(c, 2, rise + 6, 12, 3, PAL.wood);
    r(c, 3, rise + 9, 2, 6, PAL.woodDeep);
    r(c, 11, rise + 9, 2, 6, PAL.woodDeep);
    r(c, 4, rise - 2, 5, 8, PAL.sky);                    // jug
    r(c, 5, rise - 1, 1, 5, PAL.white);
    r(c, 9, rise, 2, 2, PAL.sky);
    r(c, 11, rise + 2, 2, 4, PAL.white);                 // glasses
    r(c, 13.5, rise + 2, 2, 4, PAL.white);
  },
  screen(c: Ctx, w: number) {
    r(c, 2, 2, w - 4, 1, PAL.greyDark);
    r(c, 3, 3, w - 6, 11, PAL.white);
    r(c, 6, 5, 14, 2, PAL.plum);                         // a slide
    r(c, 6, 8, 20, 1, PAL.grey);
    r(c, 6, 10, 16, 1, PAL.grey);
    for (let i = 0; i < 4; i++) r(c, 31 + i * 3, 11 - i * 1.5, 2, 1 + i * 1.5, PAL.leaf);
  },
  fridge(c: Ctx, _w: number, _h: number, rise: number) {
    r(c, 2, 0, 12, rise + 15, PAL.grey);
    r(c, 3, 1, 10, 9, PAL.white);
    r(c, 3, 11, 10, rise + 3, PAL.white);
    r(c, 11, 4, 1, 4, PAL.greyDark);
    r(c, 11, 13, 1, 6, PAL.greyDark);
    r(c, 5, 3, 3, 3, PAL.yellow);                        // a sticky note
    r(c, 2, rise + 15, 12, 1, PAL.ink);
  },
  cafetable(c: Ctx, _w: number, _h: number, rise: number) {
    r(c, 7, rise + 8, 2, 7, PAL.greyDark);
    r(c, 4, rise + 15, 8, 1, PAL.ink);
    c.fillStyle = PAL.wood;
    c.beginPath();
    c.ellipse(8 * P, (rise + 6) * P, 7.5 * P, 4.5 * P, 0, 0, Math.PI * 2);
    c.fill();
    r(c, 4, rise + 4, 5, 2, PAL.white);                  // a plate of samosas
    r(c, 5, rise + 3, 1.5, 1.5, PAL.gold);
    r(c, 7, rise + 3, 1.5, 1.5, PAL.gold);
    r(c, 10, rise + 4, 2, 3, PAL.white);                 // two cutting-chai glasses
    r(c, 10.5, rise + 5, 1, 2, PAL.woodDark);
    r(c, 12.5, rise + 6, 2, 3, PAL.white);
  },
  menu(c: Ctx, w: number) {
    r(c, 1, 2, w - 2, 12, PAL.woodDeep);
    r(c, 2, 3, w - 4, 10, "#2f3b35");
    c.fillStyle = PAL.paper;
    c.font = '8px "Press Start 2P"';
    c.fillText("CHAI 10", 10, 20);
    r(c, 30, 6, 12, 1, PAL.yellow);
    r(c, 30, 9, 9, 1, PAL.pink);
  },
  logosign(c: Ctx, w: number) {
    r(c, 1, 3, w - 2, 11, PAL.gold);
    r(c, 2, 4, w - 4, 9, PAL.plum);
    c.fillStyle = PAL.gold;
    c.font = '10px "Press Start 2P"';
    c.textAlign = "center";
    c.fillText("OFFERQUEST", w * P / 2, 24);
    c.textAlign = "left";
  },
  magtable(c: Ctx, _w: number, _h: number, rise: number) {
    r(c, 1, rise + 6, 14, 5, PAL.wood);
    r(c, 1, rise + 6, 14, 1, shade(PAL.wood, 0.12));
    r(c, 2, rise + 11, 2, 4, PAL.woodDeep);
    r(c, 12, rise + 11, 2, 4, PAL.woodDeep);
    r(c, 3, rise + 5, 5, 3, PAL.red);                    // magazines
    r(c, 7, rise + 6, 5, 3, PAL.sky);
  },
  umbrellastand(c: Ctx, _w: number, _h: number, rise: number) {
    r(c, 5, rise + 7, 6, 8, PAL.greyDark);
    r(c, 5, rise + 7, 6, 1, PAL.grey);
    r(c, 6, rise - 4, 1, 12, PAL.red);
    r(c, 9, rise - 2, 1, 10, PAL.blue);
    r(c, 6, rise - 5, 2, 1, PAL.woodDeep);
    r(c, 9, rise - 3, 2, 1, PAL.woodDeep);
  },
  welcomemat(c: Ctx, w: number, h: number) {
    r(c, 2, 5, w - 4, h - 9, PAL.woodDeep);
    r(c, 3, 6, w - 6, h - 11, PAL.terracotta);
    c.fillStyle = PAL.sand;
    c.font = '6px "Press Start 2P"';
    c.textAlign = "center";
    c.fillText("WELCOME", w * P / 2, 21);
    c.textAlign = "left";
  },
});

/** Flat or wall-hung pieces keep their own edges; everything else gets a pixel-art outline. */
const NO_OUTLINE = new Set(["rug", "rugcabin", "rangoli", "welcomemat"]);

// ---------------------------------------------------------------- characters
export const CHAR_W = 32;
export const CHAR_H = 48;
const DIRS: Dir[] = ["down", "up", "left", "right"];
/** Frames per direction, in sheet order (spec §9.4). */
export const POSES: [string, number][] = [["idle", 4], ["walk", 6], ["type", 2], ["read", 2], ["write", 2],
  ["talk", 2], ["cheer", 2], ["confused", 2], ["carry", 6], ["wave", 2], ["sip", 2]];
export const FRAMES = POSES.reduce((n, [, count]) => n + count, 0);
const DEFAULT_GAIT: Gait = { speed: 1, bounce: 1, swing: 2, stride: 4 };

/** A limb: a thick line from joint to joint, so arms and legs can point anywhere. */
function limb(c: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, col: string) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  c.fillStyle = col;
  for (let i = 0; i <= n; i++) {
    c.fillRect(Math.round(x0 + ((x1 - x0) * i) / n - w / 2), Math.round(y0 + ((y1 - y0) * i) / n - w / 2), w, w);
  }
}

interface Body { pose: string; ph: number; yb: number; t: number; walking: boolean; gait: Gait; look: Look; sleeve: string }

function bodyOf(look: Look, pose: string, ph: number, gait: Gait): Body {
  const walking = pose === "walk" || pose === "carry";
  const t = walking ? (ph / 6) * Math.PI * 2 : 0;
  // the body rises as the legs pass under it; how much is part of each agent's walking style
  const yb = walking ? -Math.round(Math.abs(Math.cos(t)) * gait.bounce)
    : pose === "cheer" ? -ph * 2 : pose === "idle" && ph === 1 ? 1 : 0;
  return { pose, ph, yb, t, walking, gait, look, sleeve: look.extra === "coat" ? PAL.white : look.top };
}

function hand(c: Ctx, x: number, y: number, skin: string) {
  q(c, x - 2, y - 2, 4, 4, skin);
  q(c, x - 2, y + 1, 4, 1, shade(skin, -0.12));
}

/** Where the hands are for each pose, seen from the front. [leftX, leftY, rightX, rightY] */
function frontHands(b: Body): [number, number, number, number] {
  const { pose, ph, yb } = b;
  const s = b.walking ? Math.round(Math.sin(b.t) * b.gait.swing) : 0;
  switch (pose) {
    case "walk": return [7 + Math.abs(s) / 2, 30 + yb - s, 24 - Math.abs(s) / 2, 30 + yb + s];
    case "type": return [11, 29 - ph + yb, 20, 28 + ph + yb];
    case "read": case "carry": return [10, 28 + yb, 21, 28 + yb];
    case "write": return [7, 30 + yb, 25, 19 - ph * 2 + yb];
    case "talk": return [7, 30 + yb, 25, 26 - ph * 3 + yb];
    case "cheer": return [5, 9 + yb, 26, 9 + yb];
    case "confused": return [7, 30 + yb, 22 + ph, 8 + yb];
    case "wave": return [7, 30 + yb, 26 + ph * 2 - 1, 8 + yb];
    case "sip": return [7, 30 + yb, 19, 18 - ph + yb];
    default: return [7, 30 + yb, 24, 30 + yb];
  }
}

function drawLegsFront(c: Ctx, b: Body) {
  const { look, yb, t, walking } = b;
  const lift = [walking ? Math.max(0, Math.sin(t)) * 4 : 0, walking ? Math.max(0, -Math.sin(t)) * 4 : 0];
  [10, 17].forEach((lx, i) => {
    const foot = 43 - Math.round(lift[i]);
    q(c, lx, 31 + yb, 5, foot - 31 - yb, look.bottom);
    q(c, lx + (i ? 0 : 4), 31 + yb, 1, foot - 31 - yb, shade(look.bottom, -0.14));        // inner seam
    q(c, lx + 1, 37 + yb - Math.round(lift[i] / 2), 3, 1, shade(look.bottom, 0.1));     // knee
    q(c, lx - 1 + i, foot, 6, 3, look.shoes);
    q(c, lx - 1 + i, foot + 2, 6, 1, shade(look.shoes, -0.25));
  });
}

function drawTorsoFront(c: Ctx, b: Body, back: boolean) {
  const { look, yb } = b;
  const y = 19 + yb;
  q(c, 14, y - 2, 4, 3, shade(look.skin, -0.1));                    // neck
  q(c, 9, y, 14, 13, look.top);
  q(c, 21, y, 2, 13, shade(look.top, -0.12));                       // side shading
  q(c, 9, y + 12, 14, 1, shade(look.bottom, -0.2));                 // belt line
  if (back) {
    if (look.extra === "coat") q(c, 9, y, 14, 18, PAL.white), q(c, 15, y + 10, 1, 8, PAL.grey);
    if (look.extra === "backpack") q(c, 10, y + 1, 12, 11, PAL.woodDeep), q(c, 12, y + 3, 8, 4, PAL.woodDark), q(c, 15, y + 8, 2, 2, PAL.gold);
    if (look.hairStyle === "hood") q(c, 11, y - 1, 10, 4, shade(look.top, -0.1));
    return;
  }
  q(c, 14, y, 4, 2, look.skin);                                     // neckline
  switch (look.extra) {
    case "coat":
      q(c, 9, y, 14, 18, PAL.white);
      q(c, 15, y, 2, 18, look.top === PAL.white ? PAL.sky : look.top);
      q(c, 21, y, 2, 18, PAL.grey);
      q(c, 10, y + 8, 4, 1, PAL.grey);                              // pocket, with the red pen
      q(c, 11, y + 5, 1, 4, PAL.red);
      break;
    case "blazer":
      q(c, 13, y, 6, 8, PAL.white);
      q(c, 15, y + 2, 2, 6, PAL.pink);
      q(c, 12, y, 2, 7, shade(look.top, 0.14));
      q(c, 18, y, 2, 7, shade(look.top, 0.14));
      q(c, 15, y + 9, 1, 1, PAL.gold);
      break;
    case "tie":
      q(c, 15, y + 1, 2, 2, PAL.redDark);
      q(c, 15, y + 3, 2, 7, PAL.red);
      q(c, 12, y, 2, 2, PAL.grey);
      q(c, 18, y, 2, 2, PAL.grey);
      break;
    case "whistle":
      q(c, 12, y + 1, 1, 5, PAL.white);
      q(c, 19, y + 1, 1, 5, PAL.white);
      q(c, 13, y + 6, 6, 1, PAL.white);
      q(c, 15, y + 7, 3, 2, PAL.yellow);
      q(c, 9, y + 9, 14, 1, PAL.white);                             // tracksuit stripe
      break;
    case "backpack":
      q(c, 10, y, 2, 12, PAL.woodDeep);
      q(c, 20, y, 2, 12, PAL.woodDeep);
      break;
    default:
      q(c, 13, y + 4, 6, 1, shade(look.top, 0.12));
  }
  if (look.hairStyle === "hood") {
    q(c, 12, y + 2, 1, 4, PAL.cream);                               // drawstrings and pocket
    q(c, 19, y + 2, 1, 4, PAL.cream);
    q(c, 11, y + 8, 10, 4, shade(look.top, -0.1));
  }
}

function drawArmsFront(c: Ctx, b: Body, back: boolean) {
  const { look, pose, ph, yb, sleeve } = b;
  const [lx, ly, rx, ry] = frontHands(b);
  const stripe = look.extra === "whistle";
  if (!back) {
    // whatever the hands hold is drawn first, so fingers wrap over it
    if (pose === "read") {
      q(c, 10, 21 + yb - ph, 12, 9, PAL.paper);
      for (let i = 0; i < 3; i++) q(c, 12, 23 + yb - ph + i * 2, 8 - i * 2, 1, PAL.grey);
    }
    if (pose === "carry") {
      q(c, 9, 23 + yb, 14, 8, PAL.yellow);
      q(c, 9, 23 + yb, 6, 2, PAL.gold);
      q(c, 9, 30 + yb, 14, 1, PAL.gold);
    }
  }
  limb(c, 8, 21 + yb, lx, ly, 4, sleeve);
  limb(c, 23, 21 + yb, rx, ry, 4, shade(sleeve, -0.06));
  if (stripe) limb(c, 7, 21 + yb, lx - 1, ly, 1, PAL.white), limb(c, 25, 21 + yb, rx + 2, ry, 1, PAL.white);
  hand(c, lx, ly + 1, look.skin);
  hand(c, rx, ry + 1, look.skin);
  if (back) return;
  if (pose === "write") q(c, rx + 1, ry - 5, 1, 5, PAL.red), q(c, rx + 1, ry - 6, 1, 1, PAL.ink);
  if (pose === "sip") q(c, rx - 3, ry - 3, 5, 5, PAL.white), q(c, rx - 2, ry - 2, 3, 1, PAL.woodDark), q(c, rx + 2, ry - 2, 2, 3, PAL.white);
}

function drawHeadFront(c: Ctx, b: Body, back: boolean) {
  const { look, pose, ph } = b;
  const y = 5 + b.yb;
  const hair = look.hair;
  const dark = shade(look.skin, -0.22);
  if (look.hairStyle === "long") q(c, 7, y + 2, 18, 17, hair);              // hair falling behind the shoulders
  q(c, 10, y, 12, 13, look.skin);                                          // a rounded head
  q(c, 9, y + 1, 14, 11, look.skin);
  q(c, 8, y + 5, 1, 3, dark);                                              // ears
  q(c, 23, y + 5, 1, 3, dark);
  if (back) {
    q(c, 10, y - 2, 12, 2, hair);
    q(c, 9, y - 1, 14, 12, hair);
    q(c, 8, y + 1, 16, 8, hair);
    q(c, 11, y + 11, 10, 1, shade(hair, -0.15));
  } else {
    // face
    const blink = pose === "idle" && ph === 3;
    for (const ex of [12, 18]) {
      if (blink) q(c, ex, y + 7, 2, 1, PAL.ink);
      else q(c, ex, y + 5, 2, 3, PAL.ink), q(c, ex, y + 5, 1, 1, PAL.white);
      q(c, ex - 1, y + 3 - (pose === "confused" && ex === 18 ? 1 : 0), 4, 1, shade(hair, -0.1));   // eyebrows
    }
    q(c, 15, y + 8, 2, 1, dark);                                           // nose
    q(c, 10, y + 9, 2, 1, "rgba(217,83,79,0.35)");                         // cheeks
    q(c, 20, y + 9, 2, 1, "rgba(217,83,79,0.35)");
    if ((pose === "talk" && ph) || pose === "cheer") q(c, 14, y + 10, 4, 2, PAL.redDark), q(c, 14, y + 10, 4, 1, PAL.ink);
    else if (pose === "confused") q(c, 14, y + 11, 3, 1, dark);
    else q(c, 14, y + 10, 4, 1, dark), q(c, 13, y + 9, 1, 1, dark), q(c, 18, y + 9, 1, 1, dark);   // a small smile
    // hair
    q(c, 10, y - 2, 12, 2, hair);
    q(c, 9, y - 1, 14, 4, hair);
    q(c, 8, y + 1, 2, 5, hair);
    q(c, 22, y + 1, 2, 5, hair);
    q(c, 11, y + 3, 3, 1, hair);                                           // fringe
    q(c, 17, y + 3, 4, 1, hair);
    q(c, 12, y - 1, 5, 1, shade(hair, 0.16));                              // shine
    if (look.extra === "glasses") {
      c.strokeStyle = PAL.ink;
      c.lineWidth = 1;
      c.strokeRect(10.5, y + 4.5, 5, 4);
      c.strokeRect(16.5, y + 4.5, 5, 4);
    }
  }
  if (look.hairStyle === "long" && !back) q(c, 7, y + 2, 2, 15, hair), q(c, 23, y + 2, 2, 15, hair);
  if (look.hairStyle === "bun") q(c, 13, y - 5, 6, 4, hair), q(c, 14, y - 6, 4, 1, hair), q(c, 14, y - 5, 2, 1, shade(hair, 0.16));
  if (look.hairStyle === "hood") {
    q(c, 8, y - 3, 16, 5, look.top);
    q(c, 7, y - 1, 3, 15, look.top);
    q(c, 22, y - 1, 3, 15, look.top);
    q(c, 9, y - 3, 14, 1, shade(look.top, 0.14));
    if (back) q(c, 8, y - 2, 16, 15, look.top), q(c, 12, y + 2, 8, 8, shade(look.top, -0.08));
  }
  if (look.hairStyle === "cap") {
    q(c, 9, y - 3, 14, 5, hair);
    q(c, 10, y - 4, 12, 1, hair);
    q(c, 9, y - 3, 14, 1, shade(hair, 0.16));
    if (back) q(c, 13, y + 1, 6, 2, shade(hair, -0.25));
    else q(c, 7, y + 2, 18, 2, shade(hair, -0.22)), q(c, 14, y - 2, 4, 3, PAL.white);
  }
  if (look.extra === "headphones") {
    q(c, 9, y - 3, 14, 2, PAL.ink);
    q(c, 6, y + 2, 3, 7, PAL.ink);
    q(c, 23, y + 2, 3, 7, PAL.ink);
    q(c, 6, y + 4, 1, 3, PAL.red);
    q(c, 25, y + 4, 1, 3, PAL.red);
  }
}

function drawFront(c: Ctx, b: Body, back: boolean) {
  drawLegsFront(c, b);
  drawTorsoFront(c, b, back);
  const raised = ["cheer", "wave", "confused", "write", "sip"].includes(b.pose);
  if (!raised) drawArmsFront(c, b, back);
  drawHeadFront(c, b, back);
  if (raised) drawArmsFront(c, b, back);         // a raised arm passes in front of the head
}

/** Facing right. Facing left is the same drawing, mirrored. */
function drawSide(c: Ctx, b: Body) {
  const { look, pose, ph, yb, t, walking, gait, sleeve } = b;
  const hip = 31 + yb;
  const reach = walking ? Math.sin(t) : 0;
  const feet = [
    { x: 16 - reach * gait.stride, lift: walking ? Math.max(0, -Math.cos(t)) * 3 : 0, far: true },
    { x: 16 + reach * gait.stride, lift: walking ? Math.max(0, Math.cos(t)) * 3 : 0, far: false },
  ];
  // where the near hand is; the far arm mirrors the swing
  const swing = walking ? Math.sin(t) * gait.swing * 2.2 : 0;
  let near: [number, number] = [16 - swing, 30 + yb];
  if (pose === "type") near = [22, 28 + ph + yb];
  else if (pose === "read" || pose === "carry") near = [22, 27 + yb];
  else if (pose === "write") near = [24, 19 - ph * 2 + yb];
  else if (pose === "talk") near = [23, 25 - ph * 3 + yb];
  else if (pose === "cheer") near = [20, 8 + yb];
  else if (pose === "confused") near = [19 + ph, 8 + yb];
  else if (pose === "wave") near = [24, 8 + yb + ph * 2];
  else if (pose === "sip") near = [22, 17 - ph + yb];

  const leg = (f: (typeof feet)[number]) => {
    const fy = 42 - Math.round(f.lift);
    const col = f.far ? shade(look.bottom, -0.16) : look.bottom;
    // a bent knee: the thigh swings from the hip, the shin drops to the foot
    const kx = (16 + f.x) / 2 + (f.lift > 0.5 ? 2 : 0);
    limb(c, 16, hip + 1, kx, hip + 6, 5, col);
    limb(c, kx, hip + 6, f.x, fy - 1, 5, col);
    q(c, f.x - 3, fy, 8, 3, f.far ? shade(look.shoes, -0.18) : look.shoes);
    q(c, f.x - 3, fy + 2, 8, 1, shade(look.shoes, -0.3));
  };

  if (walking) limb(c, 16, 22 + yb, 16 + swing, 30 + yb, 4, shade(sleeve, -0.18)), hand(c, 16 + swing, 31 + yb, shade(look.skin, -0.12));
  if (look.extra === "backpack") q(c, 6, 20 + yb, 6, 11, PAL.woodDeep), q(c, 7, 22 + yb, 3, 4, PAL.woodDark);
  leg(feet[0]);
  leg(feet[1]);

  // torso
  q(c, 14, 17 + yb, 4, 3, shade(look.skin, -0.1));
  q(c, 11, 19 + yb, 10, 13, look.top);
  q(c, 11, 19 + yb, 2, 13, shade(look.top, -0.12));
  q(c, 11, 31 + yb, 10, 1, shade(look.bottom, -0.2));
  if (look.extra === "coat") q(c, 11, 19 + yb, 10, 18, PAL.white), q(c, 19, 19 + yb, 2, 18, PAL.sky), q(c, 11, 19 + yb, 2, 18, PAL.grey);
  if (look.extra === "blazer") q(c, 18, 19 + yb, 3, 8, PAL.white);
  if (look.extra === "tie") q(c, 19, 20 + yb, 2, 8, PAL.red);
  if (look.extra === "whistle") q(c, 11, 28 + yb, 10, 1, PAL.white), q(c, 19, 25 + yb, 3, 2, PAL.yellow);
  if (look.hairStyle === "hood") q(c, 9, 18 + yb, 5, 4, shade(look.top, -0.1));

  // head, in profile
  const y = 5 + yb;
  const hair = look.hair;
  const dark = shade(look.skin, -0.22);
  if (look.hairStyle === "long") q(c, 7, y + 2, 9, 17, hair);
  q(c, 10, y, 12, 13, look.skin);
  q(c, 9, y + 1, 14, 11, look.skin);
  q(c, 23, y + 6, 1, 3, look.skin);                                        // nose
  q(c, 13, y + 5, 2, 3, dark);                                             // ear
  const blink = pose === "idle" && ph === 3;
  if (blink) q(c, 19, y + 7, 2, 1, PAL.ink);
  else q(c, 19, y + 5, 2, 3, PAL.ink), q(c, 20, y + 5, 1, 1, PAL.white);
  q(c, 18, y + 3, 4, 1, shade(hair, -0.1));
  q(c, 21, y + 9, 1, 1, "rgba(217,83,79,0.35)");
  if ((pose === "talk" && ph) || pose === "cheer") q(c, 20, y + 10, 3, 2, PAL.redDark);
  else q(c, 20, y + 10, 3, 1, dark);
  q(c, 10, y - 2, 12, 2, hair);
  q(c, 9, y - 1, 14, 4, hair);
  q(c, 8, y + 1, 6, 9, hair);                                              // hair covers the back of the head
  q(c, 9, y + 10, 4, 2, hair);
  q(c, 19, y + 3, 3, 1, hair);
  q(c, 12, y - 1, 5, 1, shade(hair, 0.16));
  if (look.hairStyle === "bun") q(c, 6, y + 1, 4, 5, hair), q(c, 5, y + 2, 1, 3, hair);
  if (look.hairStyle === "hood") q(c, 7, y - 3, 14, 5, look.top), q(c, 7, y - 1, 8, 15, look.top), q(c, 8, y - 3, 12, 1, shade(look.top, 0.14));
  if (look.hairStyle === "cap") q(c, 9, y - 3, 14, 5, hair), q(c, 10, y - 4, 11, 1, hair), q(c, 20, y + 2, 8, 2, shade(hair, -0.22));
  if (look.extra === "glasses") q(c, 17, y + 4, 6, 1, PAL.ink), q(c, 17, y + 4, 1, 5, PAL.ink), q(c, 22, y + 4, 1, 5, PAL.ink), q(c, 17, y + 8, 6, 1, PAL.ink), q(c, 13, y + 5, 4, 1, PAL.ink);
  if (look.extra === "headphones") q(c, 10, y - 3, 8, 2, PAL.ink), q(c, 11, y + 2, 5, 8, PAL.ink), q(c, 12, y + 4, 3, 4, PAL.red);

  // the near arm and whatever it holds
  if (pose === "read") q(c, 21, 20 + yb - ph, 8, 10, PAL.paper), q(c, 23, 23 + yb - ph, 4, 1, PAL.grey), q(c, 23, 25 + yb - ph, 3, 1, PAL.grey);
  if (pose === "carry") q(c, 20, 22 + yb, 9, 8, PAL.yellow), q(c, 20, 22 + yb, 9, 2, PAL.gold);
  // a touch darker than the torso, with a shadow line, so the arm reads against the body
  limb(c, 17, 22 + yb, near[0] + 1, near[1], 4, shade(sleeve, -0.2));
  limb(c, 16, 22 + yb, near[0], near[1], 4, shade(sleeve, -0.07));
  if (look.extra === "whistle") limb(c, 15, 22 + yb, near[0] - 1, near[1], 1, PAL.white);
  hand(c, near[0], near[1] + 1, look.skin);
  if (pose === "write") q(c, near[0] + 2, near[1] - 5, 1, 6, PAL.red);
  if (pose === "sip") q(c, near[0], near[1] - 3, 5, 5, PAL.white), q(c, near[0] + 1, near[1] - 2, 3, 1, PAL.woodDark);
}

function drawFrame(look: Look, dir: Dir, frame: number, gait: Gait): HTMLCanvasElement {
  const cell = document.createElement("canvas");
  cell.width = CHAR_W;
  cell.height = CHAR_H;
  const c = cell.getContext("2d")!;
  let f = frame;
  let pose = "idle";
  for (const [name, count] of POSES) {
    if (f < count) {
      pose = name;
      break;
    }
    f -= count;
  }
  const body = bodyOf(look, pose, f, gait);
  if (dir === "left") {
    c.translate(CHAR_W, 0);
    c.scale(-1, 1);
  }
  if (dir === "down" || dir === "up") drawFront(c, body, dir === "up");
  else drawSide(c, body);
  return outlined(cell);
}

export function drawCharacterSheet(look: Look, gait: Gait = DEFAULT_GAIT): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CHAR_W * FRAMES;
  canvas.height = CHAR_H * DIRS.length;
  const c = canvas.getContext("2d")!;
  DIRS.forEach((dir, row) => {
    for (let f = 0; f < FRAMES; f++) c.drawImage(drawFrame(look, dir, f, gait), f * CHAR_W, row * CHAR_H);
  });
  return canvas;
}

/** Creates the texture, or redraws it in place so sprites already using it update live. */
function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void) {
  const tex = scene.textures.exists(key)
    ? (scene.textures.get(key) as Phaser.Textures.CanvasTexture)
    : scene.textures.createCanvas(key, w, h)!;
  tex.getContext().clearRect(0, 0, w, h);
  draw(tex.getContext());
  tex.refresh();
  return tex;
}

export function redrawBackground(scene: Phaser.Scene) {
  canvasTexture(scene, "office-bg", W, H, drawBackground);
}

export function registerCharacter(scene: Phaser.Scene, id: string, look: Look) {
  const key = `char-${id}`;
  const fresh = !scene.textures.exists(key);
  const gait = AGENTS[id]?.gait ?? DEFAULT_GAIT;
  const sheet = drawCharacterSheet(look, gait);
  const tex = canvasTexture(scene, key, sheet.width, sheet.height, (c) => c.drawImage(sheet, 0, 0));
  if (!fresh) return; // same frames and animations, new pixels
  DIRS.forEach((dir, row) => {
    for (let f = 0; f < FRAMES; f++) tex.add(row * FRAMES + f, 0, f * CHAR_W, row * CHAR_H, CHAR_W, CHAR_H);
    let start = 0;
    for (const [pose, count] of POSES) {
      const frames = Array.from({ length: count }, (_, i) => ({ key, frame: row * FRAMES + start + i }));
      const rate = pose === "idle" ? 1.8 : pose === "walk" || pose === "carry" ? 11 * gait.speed : pose === "read" || pose === "sip" ? 1.6 : 4.5;
      scene.anims.create({ key: `${id}-${pose}-${dir}`, frames, frameRate: rate, repeat: -1 });
      start += count;
    }
  });
}

/** Builds every texture the game uses. Called once from BootScene. */
export function makeTextures(scene: Phaser.Scene) {
  canvasTexture(scene, "office-bg", W, H, drawBackground);

  const seen = new Set<string>();
  for (const f of FURNITURE) {
    const key = furnitureKey(f);
    if (seen.has(key) || !DRAW[f.type]) continue;
    seen.add(key);
    const rise = RISE[f.type] ?? 0;
    const w = f.w * TILE;
    const h = f.h * TILE + rise * P;
    const raw = document.createElement("canvas");
    raw.width = w;
    raw.height = h;
    const ctx = raw.getContext("2d")!;
    if (f.type.startsWith("desk")) {
      ctx.translate(w, 0);          // the sitter is at the left tile: put the monitor on the right
      ctx.scale(-1, 1);
    }
    DRAW[f.type](ctx, f.w * 16, f.h * 16, rise);
    const art = NO_OUTLINE.has(f.type) ? raw : outlined(raw);
    canvasTexture(scene, key, w, h, (c) => c.drawImage(art, 0, 0));
  }

  for (const a of Object.values(AGENTS)) registerCharacter(scene, a.id, a.look);

  canvasTexture(scene, "shadow", 28, 10, (c) => {
    c.fillStyle = "rgba(43,34,51,0.28)";
    c.beginPath();
    c.ellipse(14, 5, 12, 4, 0, 0, Math.PI * 2);
    c.fill();
  });
  canvasTexture(scene, "glow", 96, 96, (c) => {
    const g = c.createRadialGradient(48, 48, 2, 48, 48, 48);
    g.addColorStop(0, "rgba(255,214,140,0.55)");
    g.addColorStop(1, "rgba(255,214,140,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 96, 96);
  });
  canvasTexture(scene, "drop", 2, 6, (c) => q(c, 0, 0, 2, 6, "#dfefff"));
  canvasTexture(scene, "dot", 6, 6, (c) => q(c, 0, 0, 6, 6, "#ffffff"));
  // a ceiling fan seen from below: four blades on a hub
  canvasTexture(scene, "fan", 72, 72, (c) => {
    c.translate(36, 36);
    c.fillStyle = "rgba(122,86,55,0.75)";
    for (let i = 0; i < 4; i++) {
      c.rotate(Math.PI / 2);
      c.fillRect(4, -5, 30, 10);
    }
    c.fillStyle = PAL.ink;
    c.beginPath();
    c.arc(0, 0, 6, 0, Math.PI * 2);
    c.fill();
  });
  // the "!" that says an agent has something for you
  canvasTexture(scene, "ring", 24, 12, (c) => {
    c.strokeStyle = PAL.gold;
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(12, 6, 10, 4, 0, 0, Math.PI * 2);
    c.stroke();
  });
}

export const ROOM_LABELS = ROOMS.filter((room) => room.name);

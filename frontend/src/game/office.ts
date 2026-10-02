import Phaser from "phaser";
import { H, PAL, TILE, W } from "./config";
import { ROOM_LABELS, WINDOWS, ambience, furnitureKey, redrawBackground } from "./art";
import { FURNITURE } from "./map";
import { store } from "../state/store";

export const PIXEL_FONT = '"Press Start 2P", monospace';
export const TEXT_FONT = '"VT323", monospace';

/** Floor, walls, furniture, room signs and the small things that make the office feel alive. */
export function buildOffice(scene: Phaser.Scene, opts: { signs?: boolean } = {}) {
  scene.add.image(0, 0, "office-bg").setOrigin(0).setDepth(0);
  const calm = store.getState().settings.reduceMotion;
  const pieces: Record<string, Phaser.GameObjects.Image[]> = {};
  const lamps: Phaser.GameObjects.Image[] = [];

  for (const f of FURNITURE) {
    const bottom = (f.y + f.h) * TILE;
    const img = scene.add.image(f.x * TILE, bottom, furnitureKey(f)).setOrigin(0, 1);
    // Flat things lie on the floor; wall things hang on the wall; the rest is Y-sorted with the characters.
    img.setDepth(f.type === "rug" || f.type === "rangoli" ? 1 : f.wall ? 2 : bottom - 6);
    (pieces[f.type] ??= []).push(img);
    if (f.type === "plant" && !calm) {
      img.setOrigin(0.5, 1).setX(f.x * TILE + TILE / 2);
      scene.tweens.add({ targets: img, angle: { from: -2, to: 2 }, duration: 1800 + f.x * 40, yoyo: true,
        repeat: -1, ease: "Sine.easeInOut" });
    }
    if (["desk", "bigdesk", "reception", "bigscreen", "toolbench"].includes(f.type)) {
      // A monitor's glow: only lit when the office is dark.
      lamps.push(scene.add.image(f.x * TILE + 24, f.y * TILE, "glow").setBlendMode(Phaser.BlendModes.ADD).setDepth(8001));
    }
  }

  if (opts.signs !== false) {
    for (const room of ROOM_LABELS) {
      scene.add.text((room.x + room.w / 2) * TILE, room.y * TILE - 21, room.name, {
        fontFamily: PIXEL_FONT, fontSize: "8px", color: PAL.cream, backgroundColor: PAL.plum,
        padding: { x: 5, y: 3 },
      }).setOrigin(0.5, 0).setDepth(3).setResolution(2);
    }
  }

  if (!calm) {
    // Steam from the kettle at the chai counter.
    scene.add.particles(32 * TILE + 16, 14 * TILE - 14, "dot", {
      speedY: { min: -22, max: -12 }, speedX: { min: -5, max: 5 }, scale: { start: 0.5, end: 0.1 },
      alpha: { start: 0.55, end: 0 }, lifespan: 1500, frequency: 380,
    }).setDepth(15 * TILE);
  }

  // Ceiling fans turning slowly over the hall and reception.
  for (const [fx, fy] of [[13, 10], [26, 10], [10, 21], [30, 21]]) {
    const fan = scene.add.image(fx * TILE, fy * TILE, "fan").setDepth(7600).setAlpha(0.42);
    if (!calm) scene.tweens.add({ targets: fan, angle: 360, duration: 2600, repeat: -1 });
  }

  // Day/night and weather (spec §9.3): the windows show the sky, night dims the room, rain runs down the glass.
  const dark = scene.add.rectangle(0, 0, W, H, 0x141a44).setOrigin(0).setDepth(8000);
  const rain = WINDOWS.map((win) =>
    scene.add.particles(win.x, win.y, "drop", {
      x: { min: 0, max: win.w }, y: 0, speedY: { min: 30, max: 46 }, lifespan: (win.h / 38) * 1000,
      alpha: { start: 0.9, end: 0.3 }, frequency: 90, scaleY: 0.6,
    }).setDepth(4));
  const apply = () => {
    const a = ambience();
    redrawBackground(scene);
    dark.setAlpha(a.time === "night" ? 0.4 : a.time === "evening" ? 0.12 : a.rain ? 0.1 : 0);
    lamps.forEach((l) => l.setVisible(a.time === "night"));
    rain.forEach((r) => r.setVisible(a.rain && !store.getState().settings.reduceMotion));
  };
  apply();
  let last = store.getState().settings.ambience;
  const unsubscribe = store.subscribe((s) => {
    if (s.settings.ambience !== last) {
      last = s.settings.ambience;
      apply();
    }
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
  return pieces;
}

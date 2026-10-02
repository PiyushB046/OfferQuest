import Phaser from "phaser";
import { AGENTS, H, type Look, W } from "./config";
import { registerCharacter } from "./art";
import { BootScene } from "./scenes/BootScene";
import { IntroScene } from "./scenes/IntroScene";
import { MenuScene } from "./scenes/MenuScene";
import { OfficeScene, type OfficeData } from "./scenes/OfficeScene";
import { TitleScene } from "./scenes/TitleScene";

let game: Phaser.Game | null = null;
const PLAY = ["Office", "Intro", "Title", "Menu", "Boot"];

export function startGame(parent: HTMLElement): Phaser.Game {
  game ??= new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    pixelArt: true,
    backgroundColor: "#2b2233",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, TitleScene, MenuScene, IntroScene, OfficeScene],
  });
  // Phaser sleeps while the tab is hidden (so a student never misses a step). This handle lets
  // automated checks wake it: `__game.loop.resume()`.
  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
  return game;
}

function go(key: string, data?: object) {
  if (!game) return;
  for (const k of PLAY) if (k !== key) game.scene.stop(k);
  game.scene.start(key, data);
}

export const goToMenu = () => go("Menu");
export const goToIntro = () => go("Intro");
export const goToOffice = (data: OfficeData = {}) => go("Office", data);
export const skipIntro = () => game?.events.emit("skip-intro");

/** Redraws the student's sprite in place, so the change shows at once in whatever scene is open. */
export function applyAvatar(look: Look) {
  AGENTS.student.look = look;
  const scene = game?.scene.getScenes(true)[0];
  if (scene) registerCharacter(scene, "student", look);
}

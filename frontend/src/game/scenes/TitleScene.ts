import Phaser from "phaser";
import { AGENTS, CREW, H, PAL, W } from "../config";
import { Agent } from "../characters/Agent";
import { PIXEL_FONT, TEXT_FONT, buildOffice } from "../office";
import { sfx, unlock } from "../audio";
import attract from "../attract.json";
import { type VisualEvent, store } from "../../state/store";

export const VERSION = "v0.1";

/** The office seen from outside, with the crew quietly at their desks. Shared by Title and Menu. */
export function backdrop(scene: Phaser.Scene) {
  buildOffice(scene, { signs: false });
  const crew = CREW.map((id) => new Agent(scene, AGENTS[id]));
  crew.forEach((a) => a.update(0));
  const hour = new Date().getHours();
  const dusk = hour >= 19 || hour < 6;
  scene.add.rectangle(0, 0, W, H, dusk ? 0x1a1d3a : 0x2b2233, dusk ? 0.72 : 0.6).setOrigin(0).setDepth(5000);
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    store.setState({ scene: "title" });
    backdrop(this);
    const calm = store.getState().settings.reduceMotion;

    const logo = this.add.text(W / 2, 250, "OFFERQUEST", {
      fontFamily: PIXEL_FONT, fontSize: "84px", color: PAL.gold, stroke: PAL.ink, strokeThickness: 14,
      shadow: { offsetX: 6, offsetY: 6, color: PAL.redDark, fill: true },
    }).setOrigin(0.5).setDepth(6000);
    this.add.text(W / 2, 150, "🏆", { fontSize: "64px" }).setOrigin(0.5).setDepth(6000);
    this.add.text(W / 2, 350, "Every company is a new quest. Your crew prepares you for it.", {
      fontFamily: TEXT_FONT, fontSize: "34px", color: PAL.cream,
    }).setOrigin(0.5).setDepth(6000);
    const start = this.add.text(W / 2, 520, "PRESS START", { fontFamily: PIXEL_FONT, fontSize: "30px", color: PAL.white })
      .setOrigin(0.5).setDepth(6000);
    this.add.text(W / 2, 580, "Enter  ·  Space  ·  Click  ·  Tap", { fontFamily: TEXT_FONT, fontSize: "24px", color: PAL.grey })
      .setOrigin(0.5).setDepth(6000);
    this.add.text(W - 16, H - 14, `${VERSION} · Team OfferQuest`, { fontFamily: TEXT_FONT, fontSize: "20px", color: PAL.grey })
      .setOrigin(1, 1).setDepth(6000);

    if (!calm) {
      this.tweens.add({ targets: logo, y: 242, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.tweens.add({ targets: start, alpha: 0.15, duration: 520, yoyo: true, repeat: -1 });
    }

    let pressed = false;
    const press = () => {
      if (pressed) return;
      pressed = true;
      unlock(); // the Start press is the user gesture that lets the browser play sound
      sfx("start");
      if (calm) {
        this.scene.start("Menu");
        return;
      }
      this.tweens.add({ targets: start, alpha: { from: 1, to: 0 }, duration: 70, yoyo: true, repeat: 4 });
      // Pixel wipe: columns of ink drop down the screen.
      const cols = 20;
      for (let i = 0; i < cols; i++) {
        const bar = this.add.rectangle(i * (W / cols), 0, W / cols + 1, 0, 0x2b2233).setOrigin(0).setDepth(9000);
        this.tweens.add({ targets: bar, height: H, duration: 320, delay: 300 + ((i * 7) % cols) * 14 });
      }
      this.time.delayedCall(950, () => this.scene.start("Menu"));
    };
    // Attract mode (spec §10.3): nobody pressed Start for 20 seconds, so play the demo quest.
    this.time.delayedCall(20000, () => {
      if (!pressed && !calm) this.scene.start("Office", { mode: "attract", events: attract as VisualEvent[] });
    });
    this.input.on("pointerdown", press);
    this.input.keyboard?.on("keydown-ENTER", press);
    this.input.keyboard?.on("keydown-SPACE", press);
  }
}

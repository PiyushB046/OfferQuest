import Phaser from "phaser";
import { AGENTS, H, PAL, TIPS, W } from "../config";
import { SPOTS, unreachable } from "../map";
import { makeTextures } from "../art";
import { PIXEL_FONT, TEXT_FONT } from "../office";
import { api } from "../../net/api";
import { connect } from "../../net/socket";
import { store } from "../../state/store";

/**
 * Loading screen: a chai glass fills while fonts load, the art is drawn and the backend wakes up
 * (free hosting sleeps when idle, so the /health ping doubles as a wake-up call).
 */
export class BootScene extends Phaser.Scene {
  private level = 0;
  private target = 0.1;
  private chai!: Phaser.GameObjects.Graphics;

  constructor() {
    super("Boot");
  }

  create() {
    store.setState({ scene: "boot" });
    this.cameras.main.setBackgroundColor(PAL.ink);
    this.chai = this.add.graphics();
    const label = this.add.text(W / 2, H / 2 + 110, "Brewing…", { fontFamily: "monospace", fontSize: "22px", color: PAL.cream }).setOrigin(0.5);
    const tip = this.add.text(W / 2, H / 2 + 160, TIPS[0], { fontFamily: "monospace", fontSize: "20px", color: PAL.yellow }).setOrigin(0.5);
    let n = 0;
    this.time.addEvent({ delay: 1800, loop: true, callback: () => tip.setText(TIPS[++n % TIPS.length]) });
    void this.load_(label, tip);
  }

  private async load_(label: Phaser.GameObjects.Text, tip: Phaser.GameObjects.Text) {
    await Promise.all([document.fonts.load('16px "Press Start 2P"'), document.fonts.load('16px "VT323"')]).catch(() => {});
    label.setFontFamily(PIXEL_FONT).setFontSize(14);
    tip.setFontFamily(TEXT_FONT).setFontSize(26);
    this.target = 0.35;

    label.setText("Drawing the office…");
    await new Promise((r) => this.time.delayedCall(60, r));
    const avatar = store.getState().avatar;
    if (avatar) AGENTS.student.look = avatar; // the student's own character, chosen in the intro
    makeTextures(this);
    if (import.meta.env.DEV) {
      const lost = unreachable(AGENTS.counselor.home, [...Object.values(AGENTS).map((a) => a.home), ...Object.values(SPOTS).flat()]);
      if (lost.length) console.error("Office map: unreachable tiles", lost);
    }
    this.target = 0.7;

    label.setText("Waking up the crew…");
    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        const h = await api.health();
        store.setState({ backendUp: true, brain: h.brain });
        connect();
        break;
      } catch {
        await new Promise((r) => this.time.delayedCall(1500, r));
      }
    }
    if (!store.getState().backendUp) label.setText("Crew is offline. You can still look around.");
    this.target = 1;
    await new Promise((r) => this.time.delayedCall(700, r));
    this.splash();
  }

  /** Team logo, about a second, skippable. */
  private splash() {
    this.children.removeAll();
    this.add.text(W / 2, H / 2 - 10, "a two-person crew presents", { fontFamily: TEXT_FONT, fontSize: "30px", color: PAL.cream }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 + 34, "🏆", { fontSize: "40px" }).setOrigin(0.5);
    const go = () => this.scene.start("Title");
    const timer = this.time.delayedCall(1300, go);
    const skip = () => {
      timer.remove();
      go();
    };
    this.input.once("pointerdown", skip);
    this.input.keyboard?.once("keydown", skip);
  }

  update(_t: number, dt: number) {
    if (!this.chai.active) return;
    this.level += (this.target - this.level) * Math.min(1, dt / 220);
    const g = this.chai;
    const x = W / 2 - 40;
    const y = H / 2 - 70;
    g.clear();
    g.fillStyle(0xfbf7ef, 0.18).fillRect(x, y, 80, 130);                       // the glass
    const fill = Math.round((126 * this.level) / 6) * 6;                       // rises in pixel steps
    g.fillStyle(0xa87a4f).fillRect(x + 6, y + 126 - fill, 68, fill);
    g.fillStyle(0xc99a6b).fillRect(x + 6, y + 126 - fill, 68, Math.min(6, fill));
    g.lineStyle(6, 0xf3e7d0).strokeRect(x, y, 80, 130);
    g.fillStyle(0xf3e7d0).fillRect(x + 80, y + 30, 22, 6).fillRect(x + 96, y + 30, 6, 50).fillRect(x + 80, y + 74, 22, 6);
  }
}

import Phaser from "phaser";
import { PAL, W } from "../config";
import { PIXEL_FONT, TEXT_FONT } from "../office";
import { sfx } from "../audio";
import { backdrop } from "./TitleScene";
import { api } from "../../net/api";
import { store } from "../../state/store";

interface Option { label: string; hint: string; enabled: () => boolean; run: () => void }

export class MenuScene extends Phaser.Scene {
  private index = 0;
  private rows: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private options: Option[] = [];
  private slots = 1;

  constructor() {
    super("Menu");
  }

  create() {
    store.setState({ scene: "menu" });
    api.students().then((list) => (this.slots = list.length)).catch(() => {});
    backdrop(this);
    const hasSave = () => Boolean(store.getState().studentId);
    this.options = [
      { label: "New Quest", hint: "Start a quest for a new company. Maya will take your details.", enabled: () => true,
        run: () => (store.getState().seenIntro ? this.scene.start("Office", { open: "intake" }) : this.scene.start("Intro")) },
      { label: "Continue", hint: hasSave() ? "Back to your office and your quests." : "No save yet. Start a New Quest first.",
        enabled: hasSave, run: () => this.scene.start("Office", { open: this.slots > 1 ? "slots" : "board" }) },
      { label: "How to Play", hint: "A one-minute guide.", enabled: () => true, run: () => store.setState({ modal: "howto" }) },
      { label: "Settings", hint: "Sound, speed, motion and text size.", enabled: () => true, run: () => store.setState({ modal: "settings" }) },
      { label: "Credits", hint: "Team, tools and licenses.", enabled: () => true, run: () => store.setState({ modal: "credits" }) },
    ];

    this.add.text(W / 2, 120, "OFFERQUEST", {
      fontFamily: PIXEL_FONT, fontSize: "48px", color: PAL.gold, stroke: PAL.ink, strokeThickness: 10,
    }).setOrigin(0.5).setDepth(6000);

    this.rows = this.options.map((o, i) => {
      const t = this.add.text(W / 2 - 150, 250 + i * 64, o.label, { fontFamily: PIXEL_FONT, fontSize: "26px", color: PAL.cream })
        .setDepth(6000).setInteractive({ useHandCursor: true });
      t.on("pointerover", () => this.select(i));
      t.on("pointerdown", () => {
        this.select(i);
        this.choose();
      });
      return t;
    });
    this.cursor = this.add.text(0, 0, "▶", { fontFamily: PIXEL_FONT, fontSize: "26px", color: PAL.gold }).setDepth(6000);
    this.hint = this.add.text(W / 2, 610, "", { fontFamily: TEXT_FONT, fontSize: "28px", color: PAL.yellow }).setOrigin(0.5).setDepth(6000);
    this.add.text(W / 2, 660, "↑ ↓ to move  ·  Enter to choose", { fontFamily: TEXT_FONT, fontSize: "22px", color: PAL.grey })
      .setOrigin(0.5).setDepth(6000);

    const key = (name: string, fn: () => void) =>
      this.input.keyboard?.on(`keydown-${name}`, () => {
        if (!store.getState().modal) fn(); // a dialog on top owns the keyboard
      });
    key("UP", () => this.select(this.index - 1));
    key("DOWN", () => this.select(this.index + 1));
    key("ENTER", () => this.choose());
    key("SPACE", () => this.choose());
    this.select(0, true);
  }

  private select(i: number, silent = false) {
    const n = this.options.length;
    const next = ((i % n) + n) % n;
    if (next !== this.index && !silent) sfx("move");
    this.index = next;
    this.rows.forEach((row, j) => {
      const on = this.options[j].enabled();
      row.setColor(!on ? PAL.greyDark : j === next ? PAL.white : PAL.cream);
    });
    this.cursor.setPosition(W / 2 - 200, 250 + next * 64);
    this.hint.setText(this.options[next].hint);
  }

  private choose() {
    const o = this.options[this.index];
    if (!o.enabled()) {
      sfx("error");
      return;
    }
    sfx("select");
    o.run();
  }
}

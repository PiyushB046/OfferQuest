import Phaser from "phaser";
import { AGENTS, CREW, H, PAL, TILE, W } from "../config";
import { Agent, tileCentre } from "../characters/Agent";
import { BubbleLayer } from "../bubbles/BubbleLayer";
import { PIXEL_FONT, buildOffice } from "../office";
import { sfx } from "../audio";
import { store } from "../../state/store";

const SKIPPED = Symbol("skipped");
const DOOR = { x: 19, y: 22 }; // the tile just inside the front doors
const readTime = (text: string) => Math.max(1700, Math.min(4400, 1000 + text.length * 40));

/**
 * First-time intro (spec §10.5): the doors open, the student walks in, Maya welcomes them, they
 * create their avatar, the camera tours the rooms as each agent introduces themselves, a one-step
 * tutorial, and Maya hands over the first Quest File. Skippable at any moment (Esc or the Skip
 * button) and replayable from How to Play.
 */
export class IntroScene extends Phaser.Scene {
  private agents: Record<string, Agent> = {};
  private bubbles!: BubbleLayer;
  private waiters: { left: number; resolve: () => void; reject: (e: unknown) => void }[] = [];
  private over = false;

  constructor() {
    super("Intro");
  }

  create() {
    store.setState({ scene: "intro", modal: null, inspected: null });
    this.agents = {};
    this.waiters = [];
    this.over = false;
    buildOffice(this);
    this.bubbles = new BubbleLayer(this);
    for (const meta of Object.values(AGENTS)) {
      this.agents[meta.id] = new Agent(this, meta);
      this.bubbles.add(meta.id, meta.name, meta.id === "counselor" ? () => this.events.emit("maya-clicked") : undefined);
    }
    this.agents.counselor.sprite.on("pointerdown", () => this.events.emit("maya-clicked"));
    this.cameras.main.setBounds(0, 0, W, H).setBackgroundColor(PAL.ink);

    const skip = () => this.finish();
    this.input.keyboard?.on("keydown-ESC", () => {
      if (!store.getState().modal) skip(); // Esc inside the avatar dialog only closes the dialog
    });
    this.game.events.on("skip-intro", skip);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off("skip-intro", skip));

    this.script().catch((e) => {
      if (e !== SKIPPED) console.error("intro failed", e);
      this.finish();
    });
  }

  private finish() {
    if (this.over) return;
    this.over = true;
    this.waiters.splice(0).forEach((w) => w.reject(SKIPPED));
    store.getState().set({ seenIntro: true });
    if (store.getState().modal === "avatar") store.setState({ modal: null });
    this.scene.start("Office", { open: "intake" });
  }

  private wait(ms: number) {
    if (this.over) return Promise.reject(SKIPPED);
    return new Promise<void>((resolve, reject) => this.waiters.push({ left: ms, resolve, reject }));
  }

  private async say(id: string, text: string, pose = "talk") {
    const a = this.agents[id];
    a.setPose(pose);
    this.bubbles.show(id, "speech", text);
    sfx("pop");
    await this.wait(readTime(text));
    this.bubbles.hide(id);
    a.setPose(null);
  }

  private async panTo(x: number, y: number, ms = 900) {
    if (store.getState().settings.reduceMotion) this.cameras.main.centerOn(x, y);
    else {
      this.cameras.main.pan(x, y, ms, "Sine.easeInOut");
      await this.wait(ms);
    }
  }

  private async script() {
    const cam = this.cameras.main;
    const { counselor: maya, student } = this.agents;
    const calm = store.getState().settings.reduceMotion;
    const door = tileCentre(DOOR);

    // 1. The front doors slide open and the student walks in.
    cam.setZoom(2.2).centerOn(door.x + TILE / 2, door.y);
    student.placeAt(DOOR);
    student.sprite.setY(door.y + 46).setAlpha(0);
    student.face("up");
    const leaves = [0, 1].map((i) =>
      this.add.rectangle(19 * TILE + i * TILE, 23 * TILE, TILE, TILE, 0x7a5637).setOrigin(0).setDepth(5).setStrokeStyle(2, 0x2b2233));
    await this.wait(700);
    sfx("paper");
    this.tweens.add({ targets: leaves[0], x: 18 * TILE, duration: calm ? 1 : 700 });
    this.tweens.add({ targets: leaves[1], x: 21 * TILE, duration: calm ? 1 : 700 });
    await this.wait(800);
    this.tweens.add({ targets: student.sprite, y: door.y, alpha: 1, duration: 900 });
    student.setPose(null);
    await this.wait(1000);
    await Promise.all([student.walkTo(AGENTS.student.home), this.panTo(17 * TILE, 21 * TILE, 1200)]);
    student.face("up");

    // 2. Maya waves.
    await this.say("counselor", "Welcome to OfferQuest! I'm Maya, your Career Counselor. 👋", "wave");

    // 3. Quick avatar creation.
    await this.say("counselor", "First things first. What do you look like?");
    store.setState({ modal: "avatar" });
    await new Promise<void>((resolve, reject) => {
      const stop = store.subscribe((s) => {
        if (s.modal === "avatar" && !this.over) return;
        stop();
        if (this.over) reject(SKIPPED);
        else resolve();
      });
    });
    student.setPose("cheer");
    await this.say("counselor", "Looking sharp! Now, meet the crew.");
    student.setPose(null);

    // 4. The camera pans across the rooms; each agent waves and introduces their role in one line.
    for (const id of CREW.filter((c) => c !== "counselor")) {
      const a = this.agents[id];
      await this.panTo(a.sprite.x, a.sprite.y - 20);
      await this.say(id, `${a.meta.emoji} ${a.meta.name}, ${a.meta.title}. ${a.meta.intro}`, "wave");
    }

    // 5. Mini tutorial: click Maya.
    await this.panTo(17 * TILE, 21 * TILE, 1300);
    const arrow = this.add.text(maya.sprite.x, maya.sprite.y - 96, "▼", { fontFamily: PIXEL_FONT, fontSize: "22px", color: PAL.gold, stroke: PAL.ink, strokeThickness: 6 })
      .setOrigin(0.5).setDepth(9000);
    this.tweens.add({ targets: arrow, y: arrow.y + 10, duration: 420, yoyo: true, repeat: -1 });
    maya.setPose("wave");
    this.bubbles.show("counselor", "ask", "Click on me to give me a task!");
    await new Promise<void>((resolve, reject) => {
      this.events.once("maya-clicked", resolve);
      this.input.keyboard?.once("keydown-ENTER", resolve);
      this.waiters.push({ left: Infinity, resolve, reject }); // so Skip also ends this wait
    });
    sfx("select");
    arrow.destroy();
    this.bubbles.hide("counselor");

    // 6. Maya hands over the first Quest File, and the intake begins.
    maya.setPose(null);
    maya.carrying = true;
    await maya.walkTo({ x: 18, y: 22 });
    maya.carrying = false;
    maya.faceTowards(student.tile);
    student.faceTowards(maya.tile);
    await this.say("counselor", "Here is your first 📁 Quest File. Every company is a new quest. Let's fill it in!", "read");
    this.bubbles.carry("student", "📁");
    student.setPose("cheer");
    sfx("chime");
    await this.wait(1400);
    this.finish();
  }

  update(_t: number, delta: number) {
    if (this.over) return;
    const dt = delta * Math.max(1, store.getState().settings.speed);
    for (const w of [...this.waiters]) {
      w.left -= dt;
      if (w.left <= 0) {
        this.waiters.splice(this.waiters.indexOf(w), 1);
        w.resolve();
      }
    }
    for (const a of Object.values(this.agents)) {
      a.update(dt);
      this.bubbles.place(a.meta.id, a.sprite.x, a.sprite.y);
    }
  }
}

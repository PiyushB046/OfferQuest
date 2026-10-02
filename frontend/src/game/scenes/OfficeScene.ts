import Phaser from "phaser";
import { AGENTS, COLS, CREW, H, PAL, type Pt, ROWS, TILE, W } from "../config";
import { Agent } from "../characters/Agent";
import { BubbleLayer } from "../bubbles/BubbleLayer";
import { EventPlayer, type Mode, type Stage } from "../eventPlayer";
import { PIXEL_FONT, buildOffice } from "../office";
import { walkable } from "../map";
import { chaiChat, soloBreak } from "../smallTalk";
import { sfx } from "../audio";
import { api } from "../../net/api";
import { onEvent } from "../../net/socket";
import { type Modal, type VisualEvent, store } from "../../state/store";

interface Waiter { left: number; resolve: () => void }
export interface OfficeData { open?: Modal; mode?: Mode; events?: VisualEvent[] }

/**
 * The real app. It shows what the backend decides and nothing else.
 * Modes: `live` (events from the WebSocket), `replay` (a finished quest's stored events) and
 * `attract` (the bundled demo recording behind the title screen).
 */
export class OfficeScene extends Phaser.Scene implements Stage {
  agents: Record<string, Agent> = {};
  bubbles!: BubbleLayer;
  private player!: EventPlayer;
  private waiters: Waiter[] = [];
  private emitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private line!: Phaser.GameObjects.Graphics;
  private linked: [Agent, Agent] | null = null;
  private idleClock = 0;
  private mode: Mode = "live";

  constructor() {
    super("Office");
  }

  create(data: OfficeData) {
    this.mode = data.mode ?? "live";
    store.setState({ scene: this.mode === "attract" ? "attract" : "office", replaying: this.mode === "replay", follow: null });
    this.agents = {};
    this.waiters = [];
    this.linked = null;
    const pieces = buildOffice(this);
    this.bubbles = new BubbleLayer(this);
    this.line = this.add.graphics().setDepth(7000);

    for (const meta of Object.values(AGENTS)) {
      const agent = new Agent(this, meta);
      this.agents[meta.id] = agent;
      const inspect = () => {
        if (meta.id === "student" || this.mode === "attract") return;
        sfx("select");
        store.setState({ inspected: meta.id });   // one click shows who they are and what they have for you
      };
      agent.sprite.on("pointerdown", inspect);
      this.bubbles.add(meta.id, meta.name, inspect);
    }

    this.emitter = this.add.particles(0, 0, "dot", {
      speed: { min: 160, max: 420 }, angle: { min: 200, max: 340 }, gravityY: 520, lifespan: 2400,
      scale: { start: 1.4, end: 0.6 }, rotate: { min: 0, max: 360 },
      tint: [0xf4cf5d, 0xd9534f, 0x4f7ec9, 0x4f9d5d, 0xe79aa8, 0xfbf7ef], emitting: false,
    }).setDepth(9000);

    if (this.mode === "attract") {
      this.startAttract(data.events ?? []);
      return;
    }

    // The Quest Board on the hall wall is clickable.
    pieces.questboard?.forEach((board) =>
      board.setInteractive({ useHandCursor: true }).on("pointerdown", () => store.setState({ modal: "board" })));
    this.setupCamera();
    this.showTrophies();

    if (this.mode === "replay") {
      store.getState().resetQuestView();
      this.player = new EventPlayer(this, "replay", () => store.setState({ replaying: false }));
      (data.events ?? []).forEach((ev) => this.player.enqueue(ev));
      return;
    }

    this.player = new EventPlayer(this, "live");
    onEvent((ev) => this.player.enqueue(ev));
    this.setupWalking();
    // The "!" over an agent follows the notices in the store.
    const showAlerts = () => CREW.forEach((id) => this.bubbles.alert(id, Boolean(store.getState().notices[id])));
    const stopAlerts = store.subscribe(showAlerts);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      onEvent(null);
      stopAlerts();
    });
    if (!store.getState().questId) {
      store.getState().setNotice("counselor", { text: "Welcome! Every company is a new quest. Shall we start yours?",
        label: "Start a Company Quest", action: "intake" });
    }
    showAlerts();
    if (data.open) store.setState({ modal: data.open });
  }

  /** Arcade-style demo behind the title: the recorded quest at double speed, until someone presses Start. */
  private startAttract(events: VisualEvent[]) {
    this.cameras.main.setBounds(0, 0, W, H).setBackgroundColor(PAL.ink);
    const banner = this.add.text(W / 2, H - 40, "DEMO  ·  PRESS START", {
      fontFamily: PIXEL_FONT, fontSize: "22px", color: PAL.white, stroke: PAL.ink, strokeThickness: 8,
    }).setOrigin(0.5).setDepth(9500);
    this.tweens.add({ targets: banner, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    const back = () => this.scene.start("Title");
    this.player = new EventPlayer(this, "attract", () => this.time.delayedCall(3000, back));
    events.forEach((ev) => this.player.enqueue(ev));
    this.input.once("pointerdown", back);
    this.input.keyboard?.once("keydown", back);
  }

  /** One trophy on the cabin shelf for every finished quest (spec §9.3). */
  private showTrophies() {
    const sid = store.getState().studentId;
    if (!sid) return;
    api.progress(sid).then((p) => {
      if (!p.finished || !this.scene.isActive()) return;
      this.add.text(37 * TILE, TILE - 6, `🏆×${p.finished}`, { fontSize: "14px", backgroundColor: PAL.ink, color: PAL.gold, padding: { x: 3, y: 1 } })
        .setOrigin(0.5, 1).setDepth(40);
    }).catch(() => {});
  }

  private setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H).setBackgroundColor(PAL.ink);
    this.input.on("wheel", (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      cam.setZoom(Phaser.Math.Clamp(cam.zoom - dy * 0.0015, 1, 2.5));
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!p.isDown || cam.zoom === 1) return;
      if (store.getState().follow) store.setState({ follow: null }); // dragging takes the camera back
      cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
      cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
    });
  }

  /**
   * Double-click the floor and the student walks there. A single click is left for looking at
   * agents, so opening someone's details never sends the student wandering.
   */
  private setupWalking() {
    const ring = this.add.image(0, 0, "ring").setDepth(6).setVisible(false);
    let last = { time: 0, x: 0, y: 0 };
    this.input.on("pointerup", (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length || p.getDistance() > 8 || store.getState().modal) return;   // a drag pans the camera
      const double = p.upTime - last.time < 400 && Math.hypot(p.x - last.x, p.y - last.y) < 14;
      last = { time: p.upTime, x: p.x, y: p.y };
      if (!double) return;
      last.time = 0;
      const target = this.nearestFloor({ x: Math.floor(p.worldX / TILE), y: Math.floor(p.worldY / TILE) });
      if (!target || !this.canStudentWalk()) return;
      ring.setPosition(target.x * TILE + TILE / 2, target.y * TILE + TILE - 6).setVisible(true).setAlpha(1).setScale(1);
      this.tweens.add({ targets: ring, alpha: 0, scale: 1.6, duration: 600 });
      void this.agents.student.walkTo(target);
    });
  }

  private canStudentWalk() {
    return this.mode === "live" && this.player.isFree("student") && !this.player.studentLocked;
  }

  /** The clicked tile, or the closest tile to it that can be stood on. */
  private nearestFloor(p: Pt): Pt | null {
    for (let radius = 0; radius <= 3; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const t = { x: p.x + dx, y: p.y + dy };
          if (Math.max(Math.abs(dx), Math.abs(dy)) === radius && t.x >= 0 && t.y >= 0 && t.x < COLS && t.y < ROWS && walkable(t.x, t.y)) return t;
        }
      }
    }
    return null;
  }

  wait = (ms: number) => new Promise<void>((resolve) => this.waiters.push({ left: ms, resolve }));

  confetti() {
    if (store.getState().settings.reduceMotion) return;
    this.emitter.explode(140, W / 2, H / 2 + 120);
  }

  link(a: Agent | null, b?: Agent) {
    this.linked = a && b ? [a, b] : null;
  }

  private drawLink() {
    this.line.clear();
    if (!this.linked || store.getState().settings.reduceMotion) return;
    const [a, b] = this.linked;
    const from = new Phaser.Math.Vector2(a.sprite.x, a.sprite.y - 30);
    const to = new Phaser.Math.Vector2(b.sprite.x, b.sprite.y - 30);
    const n = Math.max(2, Math.floor(from.distance(to) / 10));
    const shift = (this.time.now / 90) % 2;
    this.line.fillStyle(0xf4cf5d, 0.85);
    for (let i = Math.floor(shift); i < n; i += 2) {
      const p = from.clone().lerp(to, i / n);
      this.line.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
  }

  /** Between quests the crew gets chai, so the office never looks frozen. */
  private idleLife(dt: number) {
    const s = store.getState();
    if (this.mode !== "live" || s.live.length || s.modal === "intake") return;
    this.idleClock += dt;
    if (this.idleClock < 11000) return;
    this.idleClock = 0;
    // Only agents with nothing queued, and never the one the student is talking to.
    const free = CREW.filter((id) => this.player.isFree(id) && id !== s.inspected && !s.notices[id]);
    if (free.length < 2 || CREW.some((id) => !this.player.isFree(id))) return;   // one break at a time
    const shuffled = free.sort(() => Math.random() - 0.5);
    const company = s.questTitle.split(" at ")[1] ?? "";
    const events = Math.random() < 0.65 ? chaiChat(shuffled[0], shuffled[1], company) : soloBreak(shuffled[0]);
    events.forEach((ev) => this.player.enqueue(ev));
  }

  update(_t: number, delta: number) {
    const s = store.getState();
    const paused = s.paused && this.mode !== "attract";
    if (paused) this.anims.pauseAll();
    else this.anims.resumeAll();
    const dt = paused ? 0 : delta * (this.mode === "attract" ? 2 : s.settings.speed);

    if (dt > 0) {
      for (const w of [...this.waiters]) {
        w.left -= dt;
        if (w.left <= 0) {
          this.waiters.splice(this.waiters.indexOf(w), 1);
          w.resolve();
        }
      }
      this.idleLife(dt);
    }
    const cam = this.cameras.main;
    const followed = s.follow ? this.agents[s.follow] : null;
    if (followed) {
      if (cam.zoom < 1.6) cam.setZoom(2);
      cam.centerOn(followed.sprite.x, followed.sprite.y - 20);
    }
    for (const a of Object.values(this.agents)) {
      a.update(dt);
      this.bubbles.place(a.meta.id, a.sprite.x, a.sprite.y);
    }
    this.drawLink();
  }
}

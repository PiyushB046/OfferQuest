/**
 * Thought, speech and result bubbles, name tags and carried-item icons.
 * They are DOM elements laid over the canvas so text stays crisp at any zoom; the office scene
 * repositions them every frame.
 */
import Phaser from "phaser";

export type BubbleKind = "thought" | "speech" | "result" | "error" | "ask" | "activity";

interface Tag { root: HTMLDivElement; bubble: HTMLDivElement; icon: HTMLDivElement; alert: HTMLDivElement; name: HTMLDivElement; shownAt: number }

export class BubbleLayer {
  private layer: HTMLDivElement;
  private tags = new Map<string, Tag>();
  private clock = 0;

  constructor(private scene: Phaser.Scene) {
    document.getElementById("bubble-layer")?.remove();
    this.layer = document.createElement("div");
    this.layer.id = "bubble-layer";
    scene.game.canvas.parentElement!.appendChild(this.layer);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.layer.remove());
  }

  add(id: string, name: string, onClick?: () => void) {
    const root = document.createElement("div");
    root.className = "tag";
    const bubble = document.createElement("div");
    bubble.className = "bubble hidden";
    const icon = document.createElement("div");
    icon.className = "carry hidden";
    const label = document.createElement("div");
    label.className = "nameplate";
    label.textContent = name;
    if (onClick) {
      label.classList.add("clickable");
      label.onclick = onClick;
    }
    // "!": this agent has something for the student. Clicking it is the same as clicking the agent.
    const alert = document.createElement("div");
    alert.className = "alert hidden";
    alert.textContent = "!";
    if (onClick) alert.onclick = onClick;
    root.append(bubble, icon, alert, label);
    this.layer.appendChild(root);
    this.tags.set(id, { root, bubble, icon, alert, name: label, shownAt: 0 });
  }

  show(id: string, kind: BubbleKind, text: string, progress?: number) {
    const tag = this.tags.get(id);
    if (!tag) return;
    tag.bubble.className = `bubble ${kind}`;
    tag.bubble.textContent = text;
    if (progress !== undefined) {
      const bar = document.createElement("div");
      bar.className = "progress";
      bar.innerHTML = `<i style="width:${Math.round(progress * 100)}%"></i>`;
      tag.bubble.appendChild(bar);
    }
    tag.shownAt = ++this.clock;
    tag.root.style.zIndex = String(1000 + this.clock);
    this.declutter();
  }

  hide(id: string) {
    this.tags.get(id)?.bubble.classList.add("hidden");
  }

  /** Too many bubbles at once is noise: only the newest few stay open (the log keeps the rest). */
  private declutter() {
    const open = [...this.tags.values()].filter((t) => !t.bubble.classList.contains("hidden"));
    open.sort((a, b) => b.shownAt - a.shownAt).slice(4).forEach((t) => t.bubble.classList.add("hidden"));
  }

  alert(id: string, on: boolean) {
    this.tags.get(id)?.alert.classList.toggle("hidden", !on);
  }

  carry(id: string, icon: string | null) {
    const tag = this.tags.get(id);
    if (!tag) return;
    tag.icon.textContent = icon ?? "";
    tag.icon.classList.toggle("hidden", !icon);
  }

  /** `x, y` is the character's feet in world coordinates. */
  place(id: string, x: number, y: number) {
    const tag = this.tags.get(id);
    if (!tag) return;
    const canvas = this.scene.game.canvas;
    const view = this.scene.cameras.main.worldView;
    const sx = canvas.offsetLeft + ((x - view.x) / view.width) * canvas.clientWidth;
    const sy = canvas.offsetTop + ((y - view.y) / view.height) * canvas.clientHeight;
    const scale = canvas.clientHeight / view.height;
    tag.root.style.transform = `translate(${sx}px, ${sy}px)`;
    tag.root.style.setProperty("--head", `${-50 * scale}px`);
    if (!tag.bubble.classList.contains("hidden")) {
      // Keep the bubble inside the office even when its speaker stands by a wall.
      const half = tag.bubble.offsetWidth / 2 + 6;
      const shift = Math.max(0, half - sx) - Math.max(0, sx + half - this.layer.clientWidth);
      tag.bubble.style.left = `${shift}px`;
    }
  }
}

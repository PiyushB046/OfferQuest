import Phaser from "phaser";
import { type AgentMeta, type Dir, type Pt, TILE } from "../config";
import { findPath } from "../pathfinding";

const SPEED = 120; // px per second at 1x

export const tileCentre = (p: Pt) => ({ x: p.x * TILE + TILE / 2, y: p.y * TILE + TILE - 4 });

/**
 * A character is always in exactly one state: walking, or standing in a pose (idle, type, read,
 * write, talk, cheer, confused, wave). The scene only moves it; it never decides anything.
 */
export class Agent {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  tile: Pt;
  dir: Dir;
  walking = false;
  /** Carrying a folder: walks with the carry animation. */
  carrying = false;
  private pose = "idle";
  private path: Pt[] = [];
  private arrived: (() => void) | null = null;

  constructor(scene: Phaser.Scene, public meta: AgentMeta) {
    this.tile = { ...meta.home };
    this.dir = meta.face;
    const { x, y } = tileCentre(this.tile);
    this.shadow = scene.add.image(x, y - 1, "shadow");
    this.sprite = scene.add.sprite(x, y, `char-${meta.id}`).setOrigin(0.5, 1);
    this.sprite.setInteractive({ useHandCursor: true });
    this.play();
  }

  private play() {
    const name = this.walking ? (this.carrying ? "carry" : "walk") : this.pose;
    const anim = `${this.meta.id}-${name}-${this.dir}`;
    if (this.sprite.anims.currentAnim?.key !== anim) this.sprite.play(anim);
  }

  face(dir: Dir) {
    this.dir = dir;
    this.play();
  }

  faceTowards(p: Pt) {
    const dx = p.x - this.tile.x;
    const dy = p.y - this.tile.y;
    if (dx === 0 && dy === 0) return;
    this.face(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  }

  /** `null` returns to idle. Ignored mid-walk: the pose applies once the agent stands still. */
  setPose(pose: string | null) {
    this.pose = pose ?? "idle";
    this.play();
  }

  /** Puts the agent on a tile at once (cutscenes). */
  placeAt(p: Pt) {
    this.tile = { ...p };
    const { x, y } = tileCentre(p);
    this.sprite.setPosition(x, y);
  }

  /** Walks to `to`. Resolves on arrival, or at once if there is no route. */
  walkTo(to: Pt): Promise<void> {
    // Already walking (the player clicked somewhere new): finish the current step, then head for the new target.
    const from = this.walking && this.path.length ? this.path[0] : this.tile;
    const path = findPath(from, to);
    if (!path || (path.length === 0 && !this.walking)) return Promise.resolve();
    this.arrived?.();
    this.path = this.walking ? [from, ...path] : path;
    this.walking = true;
    return new Promise((resolve) => (this.arrived = resolve));
  }

  update(dt: number) {
    if (this.walking) {
      let budget = (SPEED * (this.meta.gait?.speed ?? 1) * dt) / 1000;
      while (budget > 0 && this.path.length) {
        const target = tileCentre(this.path[0]);
        const dx = target.x - this.sprite.x;
        const dy = target.y - this.sprite.y;
        const dist = Math.hypot(dx, dy);
        if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? "right" : "left";
        else if (dy !== 0) this.dir = dy > 0 ? "down" : "up";
        if (dist <= budget) {
          this.sprite.setPosition(target.x, target.y);
          this.tile = this.path.shift()!;
          budget -= dist;
        } else {
          this.sprite.x += (dx / dist) * budget;
          this.sprite.y += (dy / dist) * budget;
          budget = 0;
        }
      }
      if (!this.path.length) {
        this.walking = false;
        const done = this.arrived;
        this.arrived = null;
        done?.();
      }
      this.play();
    }
    this.shadow.setPosition(this.sprite.x, this.sprite.y - 1);
    this.sprite.setDepth(this.sprite.y);
    this.shadow.setDepth(this.sprite.y - 0.5);
  }
}

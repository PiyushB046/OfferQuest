import { useEffect, useRef, useState } from "react";
import { CHAR_H, CHAR_W, drawCharacterSheet } from "../game/art";
import { AGENTS, type Look, PAL } from "../game/config";
import { applyAvatar } from "../game/game";
import { sfx } from "../game/audio";
import { api } from "../net/api";
import { useStore } from "../state/store";
import { Modal } from "./Modal";

const SKIN = ["#f1c9a5", "#d9a273", "#b97a56", "#8d5a3b"];
const HAIR = ["#2a2030", "#5a3520", "#8a5a2b", "#b9b3bd", "#d9534f", "#4f7ec9"];
const TOPS = [PAL.yellow, PAL.red, PAL.blue, PAL.leaf, PAL.purple, PAL.teal, PAL.white, PAL.ink];
const BOTTOMS = [PAL.blue, PAL.plum, PAL.woodDeep, PAL.greyDark, PAL.ink];
const STYLES: Look["hairStyle"][] = ["short", "long", "bun", "cap"];
/** Accessories. Some are unlocked by finishing quests (the number is how many). */
const EXTRAS: [Look["extra"] | undefined, string, number][] = [
  [undefined, "None", 0], ["glasses", "Glasses", 0], ["backpack", "Backpack", 0], ["headphones", "Headphones", 1],
  ["blazer", "Blazer", 2], ["tie", "Tie", 3],
];

/** Quick avatar creation (spec §10.5): the student's own character in the office. */
export function AvatarCreator() {
  const { studentId, set } = useStore();
  const [look, setLook] = useState<Look>(useStore.getState().avatar ?? AGENTS.student.look);
  const [finished, setFinished] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (studentId) api.progress(studentId).then((p) => setFinished(p.finished)).catch(() => {});
  }, [studentId]);

  useEffect(() => {
    const c = canvas.current?.getContext("2d");
    if (!c) return;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, 192, 144);
    const sheet = drawCharacterSheet(look, AGENTS.student.gait);
    // front, side and back views
    [0, 3, 1].forEach((row, i) => c.drawImage(sheet, 0, row * CHAR_H, CHAR_W, CHAR_H, i * 64, 24, CHAR_W * 2, CHAR_H * 2));
  }, [look]);

  const pick = (p: Partial<Look>) => {
    sfx("move");
    setLook({ ...look, ...p });
  };
  const swatches = (key: "skin" | "hair" | "top" | "bottom", colours: string[]) => (
    <div className="swatches">
      {colours.map((col) => (
        <button key={col} aria-label={`${key} ${col}`} className={look[key] === col ? "on" : ""} style={{ background: col }}
          onClick={() => pick({ [key]: col })} />
      ))}
    </div>
  );
  const done = () => {
    set({ avatar: look, modal: null });
    applyAvatar(look);
    sfx("select");
  };

  return (
    <Modal title="🎨 Your character" onClose={done}>
      <div className="avatar-maker">
        <canvas ref={canvas} width={192} height={144} aria-label="Preview of your character" />
        <div className="grid one">
          <label>Skin tone{swatches("skin", SKIN)}</label>
          <label>Hair colour{swatches("hair", HAIR)}</label>
          <label>Hair style
            <div className="row">{STYLES.map((s) => (
              <button key={s} className={`btn small ${look.hairStyle === s ? "primary" : ""}`} onClick={() => pick({ hairStyle: s })}>{s}</button>
            ))}</div></label>
          <label>Top{swatches("top", TOPS)}</label>
          <label>Trousers{swatches("bottom", BOTTOMS)}</label>
          <label>Accessory
            <div className="row">{EXTRAS.map(([extra, name, need]) => (
              <button key={name} disabled={finished < need} className={`btn small ${look.extra === extra ? "primary" : ""}`}
                title={finished < need ? `Finish ${need} quest${need > 1 ? "s" : ""} to unlock` : name}
                onClick={() => pick({ extra })}>{finished < need ? `🔒 ${name}` : name}</button>
            ))}</div></label>
        </div>
      </div>
      <div className="row between">
        <span className="muted">Locked items open up as you finish quests.</span>
        <button className="btn primary" onClick={done}>That's me!</button>
      </div>
    </Modal>
  );
}

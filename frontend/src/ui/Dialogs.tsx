import { CREW, AGENTS } from "../game/config";
import { sfx } from "../game/audio";
import { goToIntro } from "../game/game";
import { canListen, canSpeak } from "../game/voice";
import { useStore } from "../state/store";
import { Modal } from "./Modal";

export function Settings() {
  const { settings, setSettings, set } = useStore();
  const slider = (key: "music" | "sfx", label: string) => (
    <label>{label}: {Math.round(settings[key] * 100)}%
      <input type="range" min={0} max={1} step={0.05} value={settings[key]}
        onChange={(e) => { setSettings({ [key]: Number(e.target.value) }); if (key === "sfx") sfx("pop"); }} /></label>
  );
  return (
    <Modal title="⚙️ Settings">
      <div className="grid one">
        {slider("music", "Music volume")}
        {slider("sfx", "Sound effects volume")}
        <label>Animation speed
          <div className="row">{[0.5, 1, 2].map((v) => (
            <button key={v} className={`btn ${settings.speed === v ? "primary" : ""}`} onClick={() => setSettings({ speed: v })}>{v}×</button>
          ))}</div></label>
        <label>Text size
          <div className="row">{[[0.9, "Small"], [1, "Normal"], [1.2, "Large"]].map(([v, name]) => (
            <button key={name} className={`btn ${settings.textSize === v ? "primary" : ""}`} onClick={() => setSettings({ textSize: v as number })}>{name}</button>
          ))}</div></label>
        <label className="check"><input type="checkbox" checked={settings.reduceMotion}
          onChange={(e) => setSettings({ reduceMotion: e.target.checked })} /> Reduce motion (no flashing, wipes or confetti)</label>
        <label>Time and weather in the office
          <div className="row">{(["auto", "day", "evening", "night", "rain"] as const).map((v) => (
            <button key={v} className={`btn ${settings.ambience === v ? "primary" : ""}`} onClick={() => setSettings({ ambience: v })}>
              {v === "auto" ? "Real clock" : v[0].toUpperCase() + v.slice(1)}</button>
          ))}</div>
          <small>"Real clock" follows your local time, with rain in the monsoon months (June to September).</small></label>
        <label className="check"><input type="checkbox" checked={settings.voice} disabled={!canSpeak}
          onChange={(e) => setSettings({ voice: e.target.checked })} /> Voice mock interview: read Ms. Iyer's questions aloud</label>
        <small>{canSpeak ? "" : "This browser has no text-to-speech. "}{canListen
          ? "Speaking your answers (the 🎤 button) uses your browser's speech recognition and needs microphone permission."
          : "This browser has no speech recognition, so answers are typed."}</small>
        <button className="btn" onClick={() => set({ modal: "avatar" })}>🎨 Change my character</button>
        <p className="muted">Language: English. Hindi and Marathi are planned.</p>
      </div>
    </Modal>
  );
}

export function HowToPlay() {
  return (
    <Modal title="❓ How to Play">
      <ol className="howto">
        <li><b>Start a Company Quest.</b> Talk to Maya at reception and give her your details, the company, the role and the job description.</li>
        <li><b>Watch the crew work.</b> 💭 thought bubbles show what an agent is about to do. Speech bubbles and 📁 folders show them talking and handing work over.</li>
        <li><b>Answer when asked.</b> A ❓ means an agent needs something from you. The quest waits. They never guess.</li>
        <li><b>Click any agent</b> to see what they're doing and to give them a task of their own. A bouncing "!" means they have something for you.</li>
        <li><b>Double-click the floor</b> to walk your character there.</li>
        <li><b>Follow along.</b> The top bar shows the quest stage, the right panel logs every step, and you can slow down, speed up or pause.</li>
        <li><b>Collect your Prep Kit:</b> tailored resume, change log, practice plan, mock interview report and Readiness Score.</li>
      </ol>
      <h3>Meet the crew</h3>
      <ul className="crew">{CREW.map((id) => <li key={id}>{AGENTS[id].emoji} <b>{AGENTS[id].name}</b>, {AGENTS[id].title}. {AGENTS[id].intro}</li>)}</ul>
      <p className="muted">Scroll to zoom the office; drag to pan when zoomed in. Use Replay on the Quest Board to watch a finished quest again.</p>
      <button className="btn primary" onClick={() => { useStore.setState({ modal: null }); goToIntro(); }}>▶ Watch the intro again</button>
    </Modal>
  );
}

export function Credits() {
  return (
    <Modal title="📜 Credits">
      <p><b>OfferQuest</b>: because every student deserves a crew in their corner.</p>
      <h3>Art, sound and music</h3>
      <p>All tiles, furniture, characters, sound effects and music are original: generated in code by this project. No third-party art or audio is used.</p>
      <h3>Fonts</h3>
      <ul>
        <li>Press Start 2P by CodeMan38 · SIL Open Font License 1.1</li>
        <li>VT323 by Peter Hull · SIL Open Font License 1.1</li>
      </ul>
      <h3>Built with</h3>
      <p>Phaser 3 (MIT) · React (MIT) · Zustand (MIT) · Vite (MIT) · FastAPI (MIT) · LangGraph (MIT) · PyMuPDF (AGPL-3.0) · python-docx (MIT) · Google Gemini API</p>
      <p className="muted">Full list with links in CREDITS.md.</p>
    </Modal>
  );
}

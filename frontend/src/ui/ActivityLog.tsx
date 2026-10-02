import { useEffect, useRef } from "react";
import { AGENTS } from "../game/config";
import { useStore } from "../state/store";
import { PromptBox } from "./PromptBox";

const ICON: Record<string, string> = {
  intent: "💭", speak: "💬", activity: "⚙️", result: "✅", handoff: "📁", sendback: "🔁", ask: "❓",
  error: "⚠️", stage: "📋",
};

/** Timestamped list of every intent, action, message and result (spec §7.3). */
export function ActivityLog() {
  const log = useStore((s) => s.log);
  const brain = useStore((s) => s.brain);
  const names = useStore((s) => s.questNames);
  const several = new Set(log.map((e) => e.quest).filter(Boolean)).size > 1;
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [log.length]);

  return (
    <aside className="log panel">
      <header>
        <h2>Activity Log</h2>
        <span className="chip" title={brain === "gemini" ? "Agents are thinking with Gemini" : "No Gemini key set: agents use their built-in offline brain"}>
          {brain === "gemini" ? "✨ Gemini" : "🧠 Offline brain"}
        </span>
      </header>
      <div className="log-list">
        {log.length === 0 && <p className="muted">Nothing yet. Start a quest and every step the crew takes will appear here.</p>}
        {log.map((e) => (
          <div key={e.id} className={`log-row ${e.kind}`}>
            <span className="time">{e.time}</span>
            {several && e.quest && <span className="chip quest-tag">{names[e.quest] ?? e.quest}</span>}
            <span className="who">
              {ICON[e.kind]} {AGENTS[e.agent]?.name ?? e.agent}
              {e.to && AGENTS[e.to] ? ` → ${AGENTS[e.to].name}` : ""}
            </span>
            <span className="what">{e.text}</span>
          </div>
        ))}
        <div ref={end} />
      </div>
      <PromptBox />
    </aside>
  );
}

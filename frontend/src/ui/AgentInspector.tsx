import { useState } from "react";
import { AGENTS } from "../game/config";
import { sfx } from "../game/audio";
import { api } from "../net/api";
import { useStore } from "../state/store";

const TASKS: Record<string, string> = {
  counselor: "Where does my quest stand?",
  company_analyst: "Re-study the job description",
  resume_doctor: "Tailor my resume again",
  project_advisor: "Review my projects for this role",
  dsa_coach: "Rebuild my practice plan",
  interview_coach: "Run a mock interview",
  opportunity_scout: "Scout openings for me",
  progress_manager: "Recompute my Readiness Score",
};

/** Click any agent: current intent, current activity, recent messages, and a box to give it a task. */
export function AgentInspector() {
  const id = useStore((s) => s.inspected);
  const status = useStore((s) => (id ? s.agents[id] : undefined));
  const questId = useStore((s) => s.questId);
  const busy = useStore((s) => Boolean(s.questId && s.live.includes(s.questId)) || s.replaying);
  const follow = useStore((s) => s.follow);
  const notice = useStore((s) => (id ? s.notices[id] : undefined));
  const [note, setNote] = useState("");
  const [ask, setAsk] = useState("");
  if (!id) return null;
  const a = AGENTS[id];

  // An empty text means "do your own job"; typed text is routed to whoever on the crew owns it.
  const give = async (text: string) => {
    setNote("");
    if (!questId) {
      useStore.setState({ modal: "intake", inspected: null });
      return;
    }
    try {
      await api.task(questId, id, text);
      sfx("select");
      setAsk("");
      setNote(text ? `${a.name} heard you. If it's someone else's area, watch them hand it over.` : `${a.name} is on it. Watch the office.`);
    } catch (e) {
      setNote((e as Error).message);
    }
  };

  // The "!" the agent was showing: what they have for the student, and one button to act on it.
  const act = () => {
    if (!notice) return;
    const { setNotice, set } = useStore.getState();
    if (notice.action !== "prompt") setNotice(id, null);
    if (notice.action === "intake") set({ modal: "intake", inspected: null });
    else if (notice.action.startsWith("kit:")) useStore.setState({ modal: "kit", kitTab: notice.action.slice(4) });
    else if (notice.action.startsWith("task:")) void give("");
  };

  return (
    <div className="inspector panel">
      <header>
        <h2>{a.emoji} {a.name}</h2>
        <button className="btn ghost" aria-label="Close" onClick={() => useStore.setState({ inspected: null, follow: null })}>✕</button>
      </header>
      <p className="muted">{a.title} · {a.intro}</p>
      {notice && (
        <div className="notice">
          <strong>{a.name}:</strong> "{notice.text}"
          <button className="btn primary" onClick={act} disabled={notice.action === "prompt"}>{notice.label}</button>
        </div>
      )}
      <dl>
        <dt>About to</dt>
        <dd>{status?.intent || "Nothing planned"}</dd>
        <dt>Doing now</dt>
        <dd>{status?.activity || "Idle at the desk"}</dd>
      </dl>
      <h3>Recent</h3>
      <ul className="recent">
        {(status?.recent ?? []).slice().reverse().map((r, i) => <li key={i}>{r}</li>)}
        {!status?.recent?.length && <li className="muted">No messages yet.</li>}
      </ul>
      <button className="btn primary" disabled={busy} onClick={() => give("")}>
        {!questId ? "Start a Company Quest" : TASKS[id]}
      </button>
      {questId && (
        <form className="row tight" onSubmit={(e) => { e.preventDefault(); if (ask.trim()) void give(ask); }}>
          <input value={ask} disabled={busy} placeholder={`Ask ${a.name} for something…`} aria-label={`Task for ${a.name}`}
            onChange={(e) => setAsk(e.target.value)} />
          <button className="btn" disabled={busy || !ask.trim()}>Go</button>
        </form>
      )}
      <button className="btn" onClick={() => useStore.setState({ follow: follow === id ? null : id })}>
        {follow === id ? "Stop following" : "🎥 Follow with camera"}
      </button>
      {busy && <p className="muted">The crew is busy with this quest. Tasks open up when they finish.</p>}
      {note && <p className="note">{note}</p>}
    </div>
  );
}

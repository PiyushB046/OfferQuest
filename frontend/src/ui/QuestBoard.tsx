import { useEffect, useState } from "react";
import { STAGES, STAGE_LABEL } from "../game/config";
import { goToMenu, goToOffice } from "../game/game";
import { sfx } from "../game/audio";
import { api, type QuestSummary } from "../net/api";
import { useStore } from "../state/store";
import { Modal } from "./Modal";

/** Top bar: the current quest's stages, plus pacing controls (speed and pause, spec §7.5). */
export function QuestBoardStrip() {
  const { questId, questTitle, kitReady, paused, saved, settings, replaying, set, setSettings } = useStore();
  const stage = useStore((s) => (s.questId ? s.stages[s.questId] : undefined));
  const liveCount = useStore((s) => s.live.length);
  const daysLeft = useStore((s) => s.daysLeft);
  const at = stage ? STAGES.indexOf(stage as (typeof STAGES)[number]) : -1;

  // Returning to the office: pick the quest back up from the server.
  useEffect(() => {
    if (!questId) return;
    api.quest(questId)
      .then(({ file, live, waiting }) => {
        const s = useStore.getState();
        s.setLive(questId, live);
        useStore.setState({
          questTitle: `${file.quest.role} at ${file.quest.company}`, kitReady: file.status === "done",
          stages: { ...s.stages, [questId]: s.stages[questId] ?? file.quest.stage },
          questNames: { ...s.questNames, [questId]: file.quest.company },
        });
        // Days left until the interview, and who has something waiting for the student today.
        const f = file;
        const since = f.quest.created ? Math.floor((Date.now() - new Date(f.quest.created + "T00:00:00").getTime()) / 86400000) : 0;
        useStore.setState({ daysLeft: f.quest.days_available != null ? Math.max(0, f.quest.days_available - since) : null });
        if (f.status === "done" && !live) {
          const today = new Date().toLocaleDateString("en-CA");
          const day = (f.dsa?.plan ?? []).find((d: any) => d.date === today && !(f.dsa.done ?? {})[d.day])
            ?? (f.dsa?.plan ?? []).find((d: any) => d.date < today && !(f.dsa.done ?? {})[d.day]);
          if (day) s.setNotice("dsa_coach", { text: `Day ${day.day} is waiting: ${day.dsa_problems[0]}. Tick it off when you're done!`,
            label: "Open today's practice", action: "kit:Plan" });
          if (f.mock?.skipped) s.setNotice("interview_coach", { text: "You haven't taken the mock interview yet. It counts for 20% of your readiness.",
            label: "Take the mock interview", action: "task:" });
          else if (f.mock?.overall != null && f.mock.overall < 6) s.setNotice("interview_coach", {
            text: `Your last mock was ${f.mock.overall}/10. A retake after some practice will lift it.`, label: "Retake the mock interview", action: "task:" });
        }
        // The page was reloaded while an agent was waiting on the student: ask again.
        const open = useStore.getState().prompts;
        const missed = waiting.filter((w: any) => !open.some((p) => p.id === w.id));
        if (missed.length) useStore.setState({ prompts: [...open, ...missed.map((w: any) => ({ ...w, resolve: () => {} }))] });
      })
      .catch(() => set({ questId: null }));
  }, [questId, set]);

  return (
    <div className="topbar panel">
      <button className="btn ghost logo" onClick={() => { sfx("move"); goToMenu(); }} title="Back to the main menu">🏆 OFFERQUEST</button>
      <div className="board">
        <div className="quest-title">
          {replaying && <span className="chip replay">⏪ REPLAY</span>} {questTitle || "No quest yet. Talk to Maya at reception."}
          {liveCount > 1 && <span className="chip">{liveCount} quests running</span>}
        </div>
        <ol className="stages">
          {STAGES.map((s, i) => (
            <li key={s} className={i < at || stage === "done" ? "done" : i === at ? "now" : ""}>{STAGE_LABEL[s]}</li>
          ))}
        </ol>
      </div>
      {daysLeft != null && questId && <span className="countdown" title="Days until the interview">⏳ {daysLeft} day{daysLeft === 1 ? "" : "s"} left</span>}
      <span className={`save ${saved ? "on" : ""}`} title="Progress is saved after every step">💾</span>
      <div className="row tight">
        {[0.5, 1, 2].map((v) => (
          <button key={v} className={`btn small ${settings.speed === v ? "primary" : ""}`} onClick={() => setSettings({ speed: v })}>{v}×</button>
        ))}
        <button className="btn small" onClick={() => set({ paused: !paused })} title="Pause the office">{paused ? "▶" : "⏸"}</button>
      </div>
      <div className="row tight">
        {replaying
          ? <button className="btn primary" onClick={() => goToOffice()}>Exit replay</button>
          : kitReady && <button className="btn primary" onClick={() => set({ modal: "kit" })}>Prep Kit</button>}
        <button className="btn" onClick={() => set({ modal: "board" })}>Quests</button>
        <button className="btn" onClick={() => set({ modal: "intake" })}>New Quest</button>
        <button className="btn small" aria-label="Settings" title="Settings" onClick={() => set({ modal: "settings" })}>⚙️</button>
      </div>
    </div>
  );
}

/** The Quest Board on the hall wall: every quest this student has, each for one company. */
export function QuestBoard() {
  const { studentId, questId, set, resetQuestView } = useStore();
  const [quests, setQuests] = useState<QuestSummary[] | null>(null);
  const [overlaps, setOverlaps] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.quests(studentId).then(setQuests).catch((e) => setError(e.message));
    if (studentId) api.progress(studentId).then((p) => setOverlaps(p.overlaps)).catch(() => {});
  }, [studentId]);

  const open = (q: QuestSummary) => {
    if (q.id !== questId) resetQuestView();
    set({ questId: q.id, modal: q.status === "done" ? "kit" : null });
  };

  const replay = async (q: QuestSummary) => {
    try {
      const all = await api.events(q.id);
      // The quest itself: tasks given afterwards are not part of the story being replayed.
      const end = all.findIndex((e) => e.event === "QUEST_DONE");
      const events = end >= 0 ? all.slice(0, end + 1) : all;
      set({ questId: q.id, modal: null });
      goToOffice({ mode: "replay", events });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const forget = async () => {
    if (!studentId || !confirm("Delete your profile, resumes and all quests? This cannot be undone.")) return;
    await api.deleteStudent(studentId).catch(() => {});
    resetQuestView();
    set({ studentId: null, questId: null, questTitle: "", modal: null });
  };

  return (
    <Modal title="📋 Quest Board">
      {error && <p className="error">{error}</p>}
      {quests && quests.length === 0 && <p className="muted">No quests yet. Every company is a separate quest. Start your first one with Maya.</p>}
      <ul className="quest-list">
        {quests?.map((q) => (
          <li key={q.id} className="row tight">
            <button className="quest-card" onClick={() => open(q)}>
              <strong>{q.company}</strong>
              <span>{q.role}</span>
              <span className="chip">{q.live ? "In progress" : q.status === "failed" ? "Stopped" : STAGE_LABEL[q.stage]}</span>
              {q.readiness != null && <span className="score">{q.readiness}/100</span>}
            </button>
            {!q.live && <button className="btn" title="Watch the crew do this quest again" onClick={() => replay(q)}>⏪ Replay</button>}
          </li>
        ))}
      </ul>
      {overlaps.length > 0 && (
        <div className="note">
          <strong>📊 Mr. Desai: prep that counts twice</strong>
          <ul>{overlaps.map((o) => <li key={o}>{o}</li>)}</ul>
        </div>
      )}
      <div className="row">
        <button className="btn primary" onClick={() => set({ modal: "intake" })}>New Quest</button>
        {studentId && <button className="btn" onClick={() => set({ modal: "progress" })}>📈 Progress</button>}
        <button className="btn" onClick={() => set({ modal: "slots" })}>Switch player</button>
        {studentId && <button className="btn danger" onClick={forget}>Delete my data</button>}
      </div>
    </Modal>
  );
}

/** Save slots (spec §10.6): each student profile is one slot. */
export function SaveSlots() {
  const { studentId, set, resetQuestView } = useStore();
  const [slots, setSlots] = useState<any[] | null>(null);

  useEffect(() => {
    api.students().then(setSlots).catch(() => setSlots([]));
  }, []);

  const pick = (id: string | null) => {
    resetQuestView();
    useStore.setState({ questTitle: "", stages: {}, prompts: [] });
    set({ studentId: id, questId: null, modal: id ? "board" : "intake" });
  };

  return (
    <Modal title="💾 Choose a save slot">
      <ul className="quest-list">
        {slots?.map((s) => (
          <li key={s.id}>
            <button className="quest-card" onClick={() => pick(s.id)}>
              <span className="avatar-chip">🎓</span>
              <strong>{s.name}</strong>
              <span>{s.quests} quest{s.quests === 1 ? "" : "s"}</span>
              <span className="muted">last played {new Date(s.last_played).toLocaleDateString()}</span>
              {s.id === studentId && <span className="chip">current</span>}
            </button>
          </li>
        ))}
        {slots?.length === 0 && <p className="muted">No saves yet.</p>}
      </ul>
      <button className="btn primary" onClick={() => pick(null)}>+ New player</button>
    </Modal>
  );
}

/** Progress over time: scores per quest and the practice streak. */
export function Progress() {
  const studentId = useStore((s) => s.studentId);
  const [p, setP] = useState<Awaited<ReturnType<typeof api.progress>> | null>(null);

  useEffect(() => {
    if (studentId) api.progress(studentId).then(setP).catch(() => {});
  }, [studentId]);

  if (!p) return <Modal title="📈 Progress"><p className="muted">Adding it up…</p></Modal>;
  return (
    <Modal title="📈 Progress" wide>
      <div className="hero">
        <div className="big">🔥 {p.streak}<small> day streak</small></div>
        <div>
          <p>{p.practice_days} practice day{p.practice_days === 1 ? "" : "s"} ticked off · {"🏆".repeat(Math.min(p.finished, 12)) || "No trophies yet"} {p.finished} quest{p.finished === 1 ? "" : "s"} finished</p>
          <p className="muted">Tick days off in a quest's Plan tab to build the streak.</p>
        </div>
      </div>
      <table>
        <thead><tr><th>Quest</th><th>Resume match</th><th>Mock</th><th>Plan</th><th>Readiness</th></tr></thead>
        <tbody>{p.quests.map((q) => (
          <tr key={q.id}>
            <td><b>{q.company}</b><br /><small>{q.role}</small></td>
            <td>{q.match_after != null ? `${q.match_before} → ${q.match_after}` : "—"}</td>
            <td>{q.mock != null ? `${q.mock}/10` : "—"}</td>
            <td>{q.plan_days ? `${q.days_done}/${q.plan_days} days` : "—"}</td>
            <td>{q.readiness != null ? <div className="meter slim"><div className="bar"><i style={{ width: `${q.readiness}%` }} /></div><b>{q.readiness}</b></div> : "—"}</td>
          </tr>
        ))}</tbody>
      </table>
      {p.overlaps.length > 0 && <><h3>Prep that counts twice</h3><ul>{p.overlaps.map((o) => <li key={o}>{o}</li>)}</ul></>}
    </Modal>
  );
}

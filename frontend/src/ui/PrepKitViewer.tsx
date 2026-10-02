import { useEffect, useState } from "react";
import { api } from "../net/api";
import { useStore } from "../state/store";
import { Modal } from "./Modal";

const SOURCE: Record<string, [string, string]> = {
  jd: ["🟢", "From the JD"], student: ["🟢", "You told us"], role_common: ["🟡", "Common for this role"],
  guess: ["🔴", "A guess. Verify it"],
};
const PART: Record<string, string> = {
  resume_match: "Resume match", skill_coverage: "Skill coverage", dsa: "DSA", mock_interview: "Mock interview",
  projects: "Projects",
};
const TABS = ["Overview", "Resume", "Company", "Plan", "Mock interview", "Opportunities", "Team chat"] as const;

/** The Company Prep Kit (spec §5.3), plus the full agent-to-agent conversation for the quest. */
export function PrepKitViewer() {
  const questId = useStore((s) => s.questId);
  const [data, setData] = useState<{ file: any; messages: any[] } | null>(null);
  const [error, setError] = useState("");
  const wanted = useStore.getState().kitTab as (typeof TABS)[number] | null;
  const [tab, setTab] = useState<(typeof TABS)[number]>(wanted && TABS.includes(wanted) ? wanted : "Overview");
  const [theoryDone, setTheoryDone] = useState<string[]>([]);
  const [doneDays, setDoneDays] = useState<Record<string, string>>({});
  const [planError, setPlanError] = useState("");

  useEffect(() => {
    useStore.setState({ kitTab: null });
    if (questId) api.quest(questId).then((d) => { setData(d); setDoneDays(d.file.dsa?.done ?? {}); setTheoryDone(d.file.dsa?.theory_done ?? []); }).catch((e) => setError(e.message));
  }, [questId]);

  if (!questId) return <Modal title="Prep Kit"><p className="muted">No quest selected.</p></Modal>;
  if (error) return <Modal title="Prep Kit"><p className="error">{error}</p></Modal>;
  if (!data) return <Modal title="Prep Kit"><p className="muted">Opening the kit…</p></Modal>;

  const q = data.file;
  const cp = q.company_profile;
  const res = q.resume ?? {};
  const rd = q.readiness ?? {};
  const mock = q.mock ?? {};
  const today = new Date().toLocaleDateString("en-CA");   // YYYY-MM-DD in local time
  const src = (k: string) => {
    const [dot, label] = SOURCE[cp?.sources?.[k]] ?? SOURCE.guess;
    return <span className="src" title={label}>{dot} {label}</span>;
  };
  const chips = (items: string[] = []) => <div className="chips">{items.map((i) => <span key={i} className="chip">{i}</span>)}</div>;

  return (
    <Modal title={`🎒 Prep Kit · ${q.quest.role} at ${q.quest.company}`} wide>
      <nav className="tabs">
        {TABS.map((t) => <button key={t} className={t === tab ? "on" : ""} onClick={() => setTab(t)}>{t}</button>)}
      </nav>

      {tab === "Overview" && (
        <section>
          {rd.score == null ? <p className="muted">This quest hasn't finished yet. What's ready so far is in the other tabs.</p> : (
            <>
              <div className="hero">
                <div className="big">{rd.score}<small>/100</small></div>
                <div><h3>Readiness Score</h3><p className="muted">Guidance to focus your prep. Not a promise of selection.</p></div>
              </div>
              {Object.entries(rd.breakdown as Record<string, number>).map(([k, v]) => (
                <div className="meter" key={k}>
                  <span>{PART[k] ?? k} <small>({rd.weights[k]}%)</small></span>
                  <div className="bar"><i style={{ width: `${v}%` }} /></div><b>{v}</b>
                </div>
              ))}
              <ul>{rd.notes.map((n: string) => <li key={n}>{n}</li>)}</ul>
              {rd.overlaps?.length > 0 && <div className="note"><strong>Prep that counts twice</strong>
                <ul>{rd.overlaps.map((o: string) => <li key={o}>{o}</li>)}</ul></div>}
            </>
          )}
          {q.project_advice?.advice?.length > 0 && <><h3>🛠️ Project advice</h3>
            <ul>{[...q.project_advice.advice, ...(q.project_advice.build_next ?? [])].map((a: string) => <li key={a}>{a}</li>)}</ul></>}
        </section>
      )}

      {tab === "Resume" && (res.tailored ? (
        <section>
          <div className="hero">
            <div className="big">{res.score_before} → {res.score_after}</div>
            <div><h3>JD match score</h3>
              <div className="row">
                <a className="btn primary" href={api.resumeUrl(questId, "pdf")}>Download PDF</a>
                <a className="btn" href={api.resumeUrl(questId, "docx")}>Download DOCX</a>
              </div></div>
          </div>
          <p className="note">Every line comes from what you told us. Faithfulness check: {res.faithfulness_flags?.length ? res.faithfulness_flags.join(" ") : "nothing invented ✅"}</p>
          <div className="resume">
            <h3>{res.tailored.name}</h3>
            <p>{res.tailored.summary}</p>
            <p><b>Skills:</b> {res.tailored.skills.join(", ")}</p>
            {res.tailored.projects.map((p: any) => (
              <div key={p.name}><b>{p.name}</b> <small>{p.tech_stack.join(", ")}</small>
                <ul>{p.bullets.map((b: any) => <li key={b.text}>{b.text}</li>)}</ul></div>
            ))}
          </div>
          <h3>📝 Change log: what changed and why</h3>
          <ol>{res.changes.map((c: string) => <li key={c}>{c}</li>)}</ol>
          {res.after?.missing_must_have?.length > 0 && <p className="muted">Still missing vs. the JD: {res.after.missing_must_have.join(", ")}. We did not add them because they aren't on your profile.</p>}
        </section>
      ) : <p className="muted">Dr. Rhea hasn't tailored the resume yet.</p>)}

      {tab === "Company" && (cp ? (
        <section className="profile">
          <p className="muted">Every insight is labelled with where it came from. The JD you pasted is the source of truth.</p>
          <h3>Must-have skills {src("must_have_skills")}</h3>{chips(cp.must_have_skills)}
          <h3>Nice to have {src("nice_to_have_skills")}</h3>{chips(cp.nice_to_have_skills)}
          <h3>Top JD keywords {src("jd_keywords")}</h3>{chips(cp.jd_keywords)}
          <h3>Likely interview rounds {src("interview_rounds")}</h3><p>{cp.interview_rounds.join(" → ")}</p>
          <h3>DSA focus {src("dsa_focus")}</h3>{chips(cp.dsa_focus)}
          <h3>Theory focus {src("theory_focus")}</h3>{chips(cp.theory_focus)}
          <h3>What they value {src("values")}</h3>{chips(cp.values)}
          <h3>Red flags to avoid {src("red_flags")}</h3><ul>{cp.red_flags.map((r: string) => <li key={r}>{r}</li>)}</ul>
        </section>
      ) : <p className="muted">Kabir hasn't built the company profile yet.</p>)}

      {tab === "Plan" && (q.dsa?.plan ? (
        <section>
          <p>{q.dsa.plan.length} days · {q.dsa.total_problems} problems · focus: {q.dsa.focus.join(", ")} · {Object.keys(doneDays).length} done.
            Tick a day when you finish it to build your streak.</p>
          {planError && <p className="error">{planError}</p>}
          <table>
            <thead><tr><th>Done</th><th>Day</th><th>DSA</th><th>Theory</th><th>Also</th></tr></thead>
            <tbody>{q.dsa.plan.map((d: any) => (
              <tr key={d.day} className={`${doneDays[d.day] ? "done-row" : ""} ${d.date === today ? "today-row" : ""}`}>
                <td><input type="checkbox" aria-label={`Day ${d.day} done`} checked={Boolean(doneDays[d.day])}
                  onChange={(e) => api.markDay(questId, d.day, e.target.checked).then((r) => { setDoneDays(r.done); setPlanError(""); }).catch((err) => setPlanError(err.message))} /></td>
                <td>{d.day}{d.date === today && <b> · today</b>}<br /><small>{d.date?.slice(5)}</small></td>
                <td>{d.dsa_problems.map((p: string, i: number) => <div key={i}>{p}</div>)}</td>
                <td>{d.theory_topics.join("; ")}</td><td>{d.other_tasks.join("; ")}</td></tr>
            ))}</tbody>
          </table>
          <h3>📚 Theory checklist</h3>
          <p className="muted">{theoryDone.length} of {q.dsa.theory_checklist.length} revised.</p>
          <ul className="checklist">{q.dsa.theory_checklist.map((t: string) => (
            <li key={t}><label><input type="checkbox" checked={theoryDone.includes(t)}
              onChange={(e) => api.markTheory(questId, t, e.target.checked).then((r) => setTheoryDone(r.theory_done)).catch((err) => setPlanError(err.message))} /> {t}</label></li>
          ))}</ul>
        </section>
      ) : <p className="muted">Coach Vikram hasn't drawn the plan yet.</p>)}

      {tab === "Mock interview" && (mock.rounds ? (
        <section>
          <div className="hero"><div className="big">{mock.overall}<small>/10</small></div>
            <div><h3>Mock interview</h3><p className="muted">Strongest: {mock.strongest} · Weakest: {mock.weakest} · Scored by {mock.scored_by}</p>
              {mock.history?.length > 1 && <p>Attempts so far: {mock.history.map((h: any) => `${h.overall}/10`).join(" → ")}</p>}
              <p className="muted">Click Ms. Iyer in the office to retake it. The weakest question was added to your plan.</p></div></div>
          {mock.rounds.map((r: any, i: number) => (
            <div className="qa" key={i}>
              <b>Q{i + 1}. {r.question}</b> <span className="chip">{r.score}/10</span>
              <p><i>You:</i> {r.answer || "(no answer)"}</p>
              <p><i>Feedback:</i> {r.feedback}</p>
              <p className="muted"><i>A strong answer covers:</i> {r.model_answer}</p>
            </div>
          ))}
        </section>
      ) : <p className="muted">{mock.skipped ? "You skipped the mock interview. Click Ms. Iyer in the office to take it." : "Ms. Iyer hasn't run the mock interview yet."}</p>)}

      {tab === "Opportunities" && (q.opportunities?.leads ? (
        <section>
          <p className="note">{q.opportunities.note}</p>
          <ul>{q.opportunities.leads.map((l: any) => <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer">{l.label}</a> <span className="chip">{l.kind}</span></li>)}</ul>
          <h3>Similar places to target</h3>
          <ul>{q.opportunities.similar_targets.map((s: string) => <li key={s}>{s}</li>)}</ul>
        </section>
      ) : <p className="muted">Zoya hasn't scouted yet.</p>)}

      {tab === "Team chat" && (
        <section className="chat">
          {data.messages.map((m) => (
            <div key={m.id} className={`msg ${m.type}`}>
              <span className="chip">{m.type}</span> <b>{m.sender}</b> → <b>{m.receiver}</b>
              <p>{m.content}</p>
            </div>
          ))}
        </section>
      )}
    </Modal>
  );
}

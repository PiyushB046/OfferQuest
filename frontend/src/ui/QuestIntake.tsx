import { useEffect, useState } from "react";
import { sfx } from "../game/audio";
import { api } from "../net/api";
import { useStore } from "../state/store";
import { Modal } from "./Modal";

interface Project { name: string; description: string; tech_stack: string; link: string; metrics: string }
interface Form {
  name: string; college: string; degree: string; branch: string; year: number; graduation_date: string;
  cgpa: string; skills: string; github: string; leetcode: string; linkedin: string; location: string;
  achievements: string; projects: Project[]; experience: any[];
  company: string; role: string; job_description: string; deadline: string;
  days_available: string; hours_per_day: string;
  confidence: Record<string, number>;
}

const EMPTY: Form = {
  name: "", college: "", degree: "B.Tech", branch: "", year: 3, graduation_date: "", cgpa: "", skills: "",
  github: "", leetcode: "", linkedin: "", location: "", achievements: "", projects: [], experience: [],
  company: "", role: "", job_description: "", deadline: "", days_available: "14", hours_per_day: "2",
  confidence: { dsa: 3, fundamentals: 3, projects: 3, communication: 3 },
};
// The resume comes first: Maya reads it, and the rest of the form is mostly filled in already.
const STEPS = ["Resume", "You", "Projects", "Target company", "Prep time"];
const COMPANY_STEP = 3;
const list = (s: string) => s.split(/,|\n/).map((x) => x.trim()).filter(Boolean);

function fromProfile(p: any): Partial<Form> {
  return {
    name: p.name ?? "", college: p.college ?? "", degree: p.degree || "B.Tech", branch: p.branch ?? "",
    year: p.year ?? 3, graduation_date: p.graduation_date ?? "", cgpa: p.cgpa ? String(p.cgpa) : "",
    skills: (p.skills ?? []).join(", "), github: p.links?.github ?? "", leetcode: p.links?.leetcode ?? "",
    linkedin: p.links?.linkedin ?? "", location: p.preferences?.location ?? "",
    achievements: (p.achievements ?? []).join("\n"), experience: p.experience ?? [],
    projects: (p.projects ?? []).map((x: any) => ({
      name: x.name ?? "", description: x.description ?? "", tech_stack: (x.tech_stack ?? []).join(", "),
      link: x.link ?? "", metrics: (x.metrics ?? []).join("\n"),
    })),
  };
}

interface Readout { file: string; readBy: string; found: string[]; notes: string[] }

/** Maya's step-by-step intake (spec §5.1). Nothing starts until the required details are in. */
export function QuestIntake() {
  const { studentId, set, resetQuestView } = useStore();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(EMPTY);
  const [resumeText, setResumeText] = useState("");
  const [readout, setReadout] = useState<Readout | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const up = (p: Partial<Form>) => setF((cur) => ({ ...cur, ...p }));

  // A returning student doesn't retype their profile: only the company changes.
  useEffect(() => {
    if (!studentId) return;
    api.getStudent(studentId).then((p) => { up(fromProfile(p)); setStep(COMPANY_STEP); }).catch(() => set({ studentId: null }));
  }, [studentId, set]);

  const demo = async () => {
    try {
      const d = await api.demo();
      up({ ...fromProfile(d.student), company: d.company, role: d.role, job_description: d.job_description,
        days_available: String(d.days_available), hours_per_day: String(d.hours_per_day) });
      setNote("Filled with a fictional student and company. Edit anything.");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setReadout(null);
    setBusy(true);
    try {
      const { text, fields, notes, read_by } = await api.parseResume(file);
      setResumeText(text);
      const parsed = fromProfile(fields);
      // Keep what the student already typed; only fill the blanks.
      setF((cur) => {
        const next: any = { ...cur };
        for (const [k, v] of Object.entries(parsed)) {
          const empty = Array.isArray(next[k]) ? next[k].length === 0 : !next[k] || next[k] === EMPTY[k as keyof Form];
          if (empty && v && (!Array.isArray(v) || v.length)) next[k] = v;
        }
        return next;
      });
      const found = [
        fields.name && `Name: ${fields.name}`,
        fields.college && `College: ${fields.college}`,
        (fields.degree || fields.branch) && `Course: ${[fields.degree, fields.branch].filter(Boolean).join(", ")}${fields.graduation_date ? `, graduating ${fields.graduation_date}` : ""}`,
        fields.skills.length > 0 && `${fields.skills.length} skills: ${fields.skills.slice(0, 8).join(", ")}${fields.skills.length > 8 ? "…" : ""}`,
        fields.projects.length > 0 && `${fields.projects.length} project${fields.projects.length > 1 ? "s" : ""}: ${fields.projects.map((p: any) => p.name).join(", ")}`,
        fields.experience.length > 0 && `${fields.experience.length} internship or job: ${fields.experience.map((e: any) => e.organisation).join(", ")}`,
        fields.achievements.length > 0 && `${fields.achievements.length} achievements`,
      ].filter(Boolean) as string[];
      setReadout({ file: file.name, readBy: read_by, found, notes });
      sfx("chime");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const problems = (): string => {
    if (step === 1 && !f.name.trim()) return "Maya needs your name.";
    if (step === COMPANY_STEP && (!f.company.trim() || !f.role.trim())) return "Company and role are required: every quest is for one specific company.";
    return "";
  };

  const next = () => {
    const p = problems();
    setError(p);
    if (!p) { sfx("move"); setNote(""); setStep(step + 1); }
  };

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const student = await api.saveStudent({
        id: studentId ?? "", name: f.name.trim(), college: f.college, degree: f.degree, branch: f.branch,
        year: Number(f.year) || 3, graduation_date: f.graduation_date, cgpa: f.cgpa ? Number(f.cgpa) : null,
        skills: list(f.skills), achievements: list(f.achievements), experience: f.experience,
        projects: f.projects.filter((p) => p.name.trim()).map((p) => ({
          name: p.name.trim(), description: p.description, tech_stack: list(p.tech_stack),
          link: p.link.trim() || null, metrics: list(p.metrics),
        })),
        links: Object.fromEntries(Object.entries({ github: f.github, leetcode: f.leetcode, linkedin: f.linkedin }).filter(([, v]) => v.trim())),
        preferences: f.location ? { location: f.location } : {},
      });
      const { quest_id } = await api.startQuest({
        student_id: student.id, company: f.company.trim(), role: f.role.trim(), job_description: f.job_description,
        deadline: f.deadline || null, days_available: f.days_available ? Number(f.days_available) : null,
        hours_per_day: f.hours_per_day ? Number(f.hours_per_day) : null, resume_text: resumeText, confidence: f.confidence,
      });
      sfx("start");
      resetQuestView();
      const s = useStore.getState();
      s.setLive(quest_id, true);
      useStore.setState({ questTitle: `${f.role} at ${f.company}`, inspected: null, replaying: false,
        daysLeft: f.days_available ? Number(f.days_available) : null,
        stages: { ...s.stages, [quest_id]: "intake" }, questNames: { ...s.questNames, [quest_id]: f.company } });
      set({ studentId: student.id, questId: quest_id, modal: null });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const setProject = (i: number, p: Partial<Project>) => up({ projects: f.projects.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const text = (key: keyof Form, label: string, props: any = {}) => (
    <label>{label}<input value={f[key] as string} onChange={(e) => up({ [key]: e.target.value } as any)} {...props} /></label>
  );

  return (
    <Modal title="🙋 New Company Quest" wide>
      <ol className="steps">
        {STEPS.map((s, i) => <li key={s} className={i === step ? "now" : i < step ? "done" : ""}>{i + 1}. {s}</li>)}
      </ol>

      {step === 0 && (
        <div className="grid one">
          <p className="maya">"Do you have a resume? Give it to me and I'll read it, so you don't have to type everything. I'll show you what I found before we go on."</p>
          <label className={`dropzone ${over ? "over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); void upload(e.dataTransfer.files?.[0]); }}>
            <strong>{busy ? "Maya is reading your resume…" : "📄 Drop your resume here, or click to choose"}</strong>
            PDF, DOCX or TXT, up to 5 MB. It stays on this server and you can delete it any time.
            <input type="file" accept=".pdf,.docx,.txt" hidden disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          {readout && (
            <div className="readout">
              <strong>✅ Maya read {readout.file}</strong> <span className="chip">{readout.readBy === "gemini" ? "read with Gemini, checked against your text" : "read with built-in rules"}</span>
              <ul>{readout.found.map((x) => <li key={x}>{x}</li>)}</ul>
              {readout.found.length === 0 && <p>I could read the file but couldn't pick out the details. Please fill the next steps by hand.</p>}
              {readout.notes.map((n) => <p key={n} className="muted">⚠ {n}</p>)}
              <p className="muted">Check the next two steps: reading a resume is never perfect, and you can fix anything.</p>
            </div>
          )}
          <button type="button" className="btn" disabled={busy} onClick={async () => {
            const blob = await (await fetch("/sample_resume.pdf")).blob();
            void upload(new File([blob], "sample_resume.pdf", { type: "application/pdf" }));
          }}>Try it with a sample resume (fictional student)</button>
          <p className="muted">No resume yet? That's fine. Press Next and tell me about yourself; the crew will build one with you.</p>
        </div>
      )}

      {step === 1 && (
        <div className="grid">
          <p className="maya span">{readout ? '"Here is what I read. Fix anything I got wrong."' : '"Tell me about yourself. Only your name is required, but the more you tell me, the better the crew can help."'}</p>
          {text("name", "Name *", { autoFocus: true })}
          {text("college", "College")}
          {text("degree", "Degree")}
          {text("branch", "Branch", { placeholder: "Computer Science" })}
          <label>Year<select value={f.year} onChange={(e) => up({ year: Number(e.target.value) })}>
            {[1, 2, 3, 4].map((y) => <option key={y} value={y}>{y}</option>)}</select></label>
          {text("graduation_date", "Graduating in", { placeholder: "2028" })}
          {text("cgpa", "CGPA (optional)", { type: "number", step: "0.1", min: 0, max: 10 })}
          {text("location", "Preferred location (optional)")}
          <label className="span">Skills (comma separated)<input value={f.skills} placeholder="Python, SQL, React" onChange={(e) => up({ skills: e.target.value })} /></label>
          {text("github", "GitHub link")}
          {text("leetcode", "LeetCode / Codeforces link")}
        </div>
      )}

      {step === 2 && (
        <div className="grid">
          <p className="maya span">"Your projects matter most. For each one, say what you did, what you used, and any real result. I'll never add anything you didn't tell me."</p>
          {f.projects.map((p, i) => (
            <fieldset key={i} className="span project">
              <legend>Project {i + 1} <button type="button" className="btn ghost small" onClick={() => up({ projects: f.projects.filter((_, j) => j !== i) })}>remove</button></legend>
              <label>Name<input value={p.name} onChange={(e) => setProject(i, { name: e.target.value })} /></label>
              <label>Tech used<input value={p.tech_stack} placeholder="Python, FastAPI" onChange={(e) => setProject(i, { tech_stack: e.target.value })} /></label>
              <label className="span">What you did<textarea rows={2} value={p.description} onChange={(e) => setProject(i, { description: e.target.value })} /></label>
              <label>Link<input value={p.link} placeholder="github.com/you/project" onChange={(e) => setProject(i, { link: e.target.value })} /></label>
              <label>Real results, if any<input value={p.metrics} placeholder="120 users, 85% accuracy" onChange={(e) => setProject(i, { metrics: e.target.value })} /></label>
            </fieldset>
          ))}
          {f.projects.length === 0 && <p className="muted span">No projects yet. Add at least one if you can: it gives Dr. Rhea and Arjun something to work with.</p>}
          <button type="button" className="btn span" onClick={() => up({ projects: [...f.projects, { name: "", description: "", tech_stack: "", link: "", metrics: "" }] })}>+ Add a project</button>
          {f.experience.length > 0 && <p className="note span">Internships read from your resume: {f.experience.map((e: any) => `${e.role || "Role"} at ${e.organisation}`).join("; ")}.</p>}
          <label className="span">Achievements (one per line)<textarea rows={2} value={f.achievements} onChange={(e) => up({ achievements: e.target.value })} /></label>
        </div>
      )}

      {step === 3 && (
        <div className="grid">
          <p className="maya span">"Which company is this quest for? The job description is the most important thing you can give us."</p>
          {text("company", "Company *", { autoFocus: true })}
          {text("role", "Role *", { placeholder: "SDE Intern" })}
          <label className="span">Job description (paste it)
            <textarea rows={9} value={f.job_description} placeholder="Paste the full job description here…" onChange={(e) => up({ job_description: e.target.value })} /></label>
          {text("deadline", "Interview / deadline date (optional)", { type: "date" })}
        </div>
      )}

      {step === 4 && (
        <div className="grid">
          <p className="maya span">"Last one. How much time do we have, and how do you feel today? Be honest. It shapes your plan."</p>
          {text("days_available", "Days until the interview", { type: "number", min: 1, max: 120 })}
          {text("hours_per_day", "Hours you can give per day", { type: "number", min: 0.5, max: 12, step: 0.5 })}
          {Object.keys(f.confidence).map((k) => (
            <label key={k}>{k === "dsa" ? "DSA" : k[0].toUpperCase() + k.slice(1)} confidence: {f.confidence[k]}/5
              <input type="range" min={1} max={5} value={f.confidence[k]} onChange={(e) => up({ confidence: { ...f.confidence, [k]: Number(e.target.value) } })} /></label>
          ))}
        </div>
      )}

      {note && <p className="note">{note}</p>}
      {error && <p className="error">{error}</p>}
      <div className="row between">
        <button type="button" className="btn ghost" onClick={demo}>Fill with demo data</button>
        <div className="row">
          {step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>Back</button>}
          {step < 4 && <button className="btn primary" disabled={busy} onClick={next}>{step === 0 && !readout ? "Next (no resume)" : "Next"}</button>}
          {step === 4 && <button className="btn primary" disabled={busy} onClick={start}>{busy ? "Starting…" : "Start the quest"}</button>}
        </div>
      </div>
    </Modal>
  );
}

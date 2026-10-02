const BASE = import.meta.env.VITE_API_BASE ?? "";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* not JSON */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

const json = (body: unknown): RequestInit => ({
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

export interface QuestSummary {
  id: string; student_id: string; company: string; role: string; stage: string; status: string;
  readiness: number | null; updated: string; live: boolean;
}

export const api = {
  base: BASE,
  health: () => req<{ ok: boolean; brain: string; model: string | null }>("/health"),
  demo: () => req<any>("/api/demo"),
  students: () => req<any[]>("/api/students"),
  saveStudent: (s: unknown) => req<any>("/api/students", json(s)),
  getStudent: (id: string) => req<any>(`/api/students/${id}`),
  deleteStudent: (id: string) => req<any>(`/api/students/${id}`, { method: "DELETE" }),
  parseResume: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return req<{ text: string; fields: any; notes: string[]; read_by: string }>("/api/resume/parse", { method: "POST", body: form });
  },
  quests: (studentId?: string | null) =>
    req<QuestSummary[]>("/api/quests" + (studentId ? `?student_id=${encodeURIComponent(studentId)}` : "")),
  startQuest: (q: unknown) => req<{ quest_id: string }>("/api/quests", json(q)),
  quest: (id: string) => req<{ file: any; messages: any[]; live: boolean; waiting: any[] }>(`/api/quests/${id}`),
  answer: (prompt_id: string, answer: string) => req<any>("/api/answer", json({ prompt_id, answer })),
  task: (quest_id: string, agent: string, text: string) => req<any>("/api/tasks", json({ quest_id, agent, text })),
  events: (id: string) => req<any[]>(`/api/quests/${id}/events`),
  progress: (studentId: string) => req<{ quests: any[]; overlaps: string[]; streak: number; practice_days: number; finished: number }>(`/api/students/${studentId}/progress`),
  markDay: (id: string, day: number, done: boolean) => req<{ done: Record<string, string> }>(`/api/quests/${id}/plan/${day}`, json({ done })),
  markTheory: (id: string, item: string, done: boolean) => req<{ theory_done: string[] }>(`/api/quests/${id}/theory`, json({ item, done })),
  resumeUrl: (id: string, ext: "pdf" | "docx") => `${BASE}/api/quests/${id}/resume.${ext}`,
};

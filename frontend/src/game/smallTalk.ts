/**
 * What the crew say to each other over chai, between quests. Each agent opens and replies in
 * their own voice, so any two of them make a believable exchange.
 */
import type { VisualEvent } from "../state/store";

const OPEN: Record<string, string[]> = {
  counselor: ["Chai? You've been at that desk all morning.", "I love a new quest. Every student walks in a little nervous."],
  company_analyst: ["Read a JD today that asked for 5 years of experience. For an internship.", "The clue is always in the job description. Nobody reads it twice."],
  resume_doctor: ["If I see 'responsible for' one more time, I'm retiring my red pen.", "A bullet without a number is just an opinion."],
  project_advisor: ["Someone showed me a to-do app today. With a README! I nearly cried.", "Ship it, measure it, then put it on the resume."],
  dsa_coach: ["Two pointers before chai, sliding window after. That's balance!", "Nobody skips arrays day. NOBODY."],
  interview_coach: ["'Tell me about yourself' is not a trick question. And yet.", "Silence in an interview is fine. Panic is optional."],
  opportunity_scout: ["Found three new careers pages this morning. The hunt never ends.", "Deadlines sneak up. I check twice a day."],
  progress_manager: ["Readiness is earned one ticked-off day at a time.", "I sent a resume back today. Twice. It is better now."],
};
const REPLY: Record<string, string[]> = {
  counselor: ["That's why we're here. One student at a time.", "Ha! Be kind, they're trying."],
  company_analyst: ["Interesting. I'd want to see the evidence.", "Noted. Pinning that to the board."],
  resume_doctor: ["Show me the numbers and I'll believe it.", "Precisely. Action verb first."],
  project_advisor: ["Fair. But did it ship?", "I'd build a small demo of that."],
  dsa_coach: ["That's the spirit! Ten more problems!", "Good. Now do it under time pressure."],
  interview_coach: ["Well put. Structure, then substance.", "I'd give that answer an eight."],
  opportunity_scout: ["I know a careers page for that.", "Adventure! I mean... agreed."],
  progress_manager: ["Hmm. Approved.", "Strict, but fair. Carry on."],
};
const CLOSE = ["Back to work.", "Good chai today.", "Right. Desk time.", "Same time tomorrow?", "The student is counting on us."];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/** Two agents walk to the chai counter, talk, and go back to their desks. */
export function chaiChat(a: string, b: string, company: string): VisualEvent[] {
  const quest = company && Math.random() < 0.5
    ? [`How is the ${company} quest looking from your side?`, `${company}'s JD is clear about what they want. That helps.`]
    : [pick(OPEN[a]), pick(REPLY[b])];
  const local = true;
  return [
    { event: "MOVE", agent: a, to: "room:chai", local },
    { event: "MOVE", agent: b, to: "room:chai", local },
    { event: "ACTIVITY", agent: a, anim: "chai", text: "Pouring chai", local },
    { event: "SPEAK", agent: a, to: b, text: quest[0], local },
    { event: "SPEAK", agent: b, to: a, text: quest[1], local },
    { event: "ACTIVITY", agent: b, anim: "chai", text: "Sipping", local },
    { event: "SPEAK", agent: a, to: b, text: pick(OPEN[a].concat(REPLY[a])), local },
    { event: "SPEAK", agent: b, to: a, text: pick(CLOSE), local },
    { event: "IDLE", agent: a, local },
    { event: "IDLE", agent: b, local },
  ];
}

/** One agent does something small on their own. */
export function soloBreak(a: string): VisualEvent[] {
  const local = true;
  const options: VisualEvent[][] = [
    [{ event: "MOVE", agent: a, to: "room:chai", local }, { event: "ACTIVITY", agent: a, anim: "chai", text: "Chai break", local }],
    [{ event: "MOVE", agent: a, to: "room:hall", local }, { event: "ACTIVITY", agent: a, anim: "read", text: "Checking the Quest Board", local }],
    [{ event: "ACTIVITY", agent: a, anim: "type", text: "Catching up on notes", local }],
  ];
  return [...pick(options), { event: "IDLE", agent: a, local }];
}

/**
 * Voice mock interviews with the browser's own speech engines: text-to-speech reads Ms. Iyer's
 * questions aloud, speech-to-text lets the student answer by talking. Nothing leaves the browser
 * except through the browser vendor's speech service, and both are off until enabled in Settings.
 */
import { store } from "../state/store";

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: (() => void) | null;
  start(): void; stop(): void;
};

const Rec: (new () => Recognition) | undefined =
  typeof window !== "undefined" ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) : undefined;

export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
export const canListen = Boolean(Rec);

export function speak(text: string) {
  if (!canSpeak || !store.getState().settings.voice) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/^Q\d+\/\d+:\s*/, ""));
    u.lang = "en-IN";
    u.rate = 0.98;
    window.speechSynthesis.speak(u);
  } catch {
    /* no voices installed: the question is still on screen */
  }
}

export function hush() {
  if (canSpeak) window.speechSynthesis.cancel();
}

/** Starts dictation. `onText` gets everything heard so far; returns a function that stops listening. */
export function listen(onText: (text: string) => void, onEnd: (failed: boolean) => void): () => void {
  if (!Rec) {
    onEnd(true);
    return () => {};
  }
  const rec = new Rec();
  rec.lang = "en-IN";
  rec.continuous = true;
  rec.interimResults = true;
  let failed = false;
  rec.onresult = (e) => onText(Array.from(e.results as ArrayLike<any>).map((r: any) => r[0].transcript).join(" "));
  rec.onerror = () => (failed = true);
  rec.onend = () => onEnd(failed);
  try {
    rec.start();
  } catch {
    onEnd(true);
  }
  return () => rec.stop();
}

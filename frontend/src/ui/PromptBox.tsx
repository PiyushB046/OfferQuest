import { useEffect, useRef, useState } from "react";
import { AGENTS } from "../game/config";
import { sfx } from "../game/audio";
import { canListen, hush, listen, speak } from "../game/voice";
import { api } from "../net/api";
import { useStore } from "../state/store";

/** An agent paused and asked the student something (ASK_HUMAN). The quest waits for the answer. */
export function PromptBox() {
  const prompt = useStore((s) => s.prompts[0]);
  const waiting = useStore((s) => s.prompts.length);
  const voice = useStore((s) => s.settings.voice);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [hearing, setHearing] = useState(false);
  const stop = useRef<() => void>(() => {});

  useEffect(() => {
    setText("");
    setError("");
    if (prompt?.agent === "interview_coach") speak(prompt.question); // voice mock interview: the question is read aloud
    return () => {
      stop.current();
      hush();
    };
  }, [prompt?.id]);

  if (!prompt) return null;
  const agent = AGENTS[prompt.agent];

  const send = async (answer: string) => {
    if (!prompt.optional && !answer.trim()) {
      setError("I can't continue without this one.");
      return;
    }
    stop.current();
    try {
      await api.answer(prompt.id, answer);
    } catch {
      /* the question was already closed (e.g. the server restarted): just move on */
    }
    sfx("select");
    useStore.setState({ prompts: useStore.getState().prompts.filter((p) => p.id !== prompt.id) });
    prompt.resolve();
  };

  const dictate = () => {
    if (hearing) {
      stop.current();
      return;
    }
    const before = text ? text.trim() + " " : "";
    setHearing(true);
    setError("");
    stop.current = listen(
      (heard) => setText(before + heard),
      (failed) => {
        setHearing(false);
        if (failed) setError("Couldn't use the microphone. Check the browser's permission, or type your answer.");
      },
    );
  };

  const long = prompt.kind === "longtext";
  return (
    <div className="prompt panel">
      <div className="prompt-head">
        <span className="avatar">{agent?.emoji}</span>
        <div>
          <strong>{agent?.name} asks{waiting > 1 ? ` (1 of ${waiting} waiting)` : ""}</strong>
          <p>{prompt.question}</p>
        </div>
      </div>
      {prompt.kind === "choice" ? (
        <div className="row">
          {prompt.options.map((o, i) => (
            <button key={o} className={`btn ${i === 0 ? "primary" : ""}`} onClick={() => send(o)}>{o}</button>
          ))}
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void send(text); }}>
          {long ? (
            <textarea autoFocus rows={4} value={text} placeholder={hearing ? "Listening… speak your answer" : "Type your answer…"}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send(text); }} />
          ) : (
            <input autoFocus type={prompt.kind === "number" ? "number" : "text"} value={text} placeholder="Type your answer…"
              onChange={(e) => setText(e.target.value)} />
          )}
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="btn primary" type="submit">Answer{long ? " (⌘/Ctrl + Enter)" : ""}</button>
            {long && canListen && (
              <button className={`btn ${hearing ? "danger" : ""}`} type="button" onClick={dictate}
                title="Answer by speaking">{hearing ? "■ Stop" : "🎤 Speak"}</button>
            )}
            {prompt.optional && <button className="btn" type="button" onClick={() => send("")}>Skip</button>}
          </div>
          {long && !voice && <p className="muted small">Tip: turn on Voice in Settings to hear the questions read aloud.</p>}
        </form>
      )}
    </div>
  );
}

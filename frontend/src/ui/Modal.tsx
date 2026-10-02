import { type ReactNode, useEffect } from "react";
import { sfx } from "../game/audio";
import { useStore } from "../state/store";

export function Modal({ title, children, wide, onClose }: { title: string; children: ReactNode; wide?: boolean; onClose?: () => void }) {
  const set = useStore((s) => s.set);
  const close = onClose ?? (() => set({ modal: null }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className={`panel modal ${wide ? "wide" : ""}`} role="dialog" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button className="btn ghost" aria-label="Close" onClick={() => { sfx("move"); close(); }}>✕</button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

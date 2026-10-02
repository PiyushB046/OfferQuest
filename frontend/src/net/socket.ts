import type { VisualEvent } from "../state/store";

type Handler = (ev: VisualEvent) => void;

let handler: Handler | null = null;
let socket: WebSocket | null = null;
const backlog: VisualEvent[] = [];

/** Events that arrive before the office scene is ready are kept and delivered in order. */
export function onEvent(h: Handler | null) {
  handler = h;
  if (h) backlog.splice(0).forEach(h);
}

export function connect() {
  if (socket && socket.readyState <= WebSocket.OPEN) return;
  const base = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/^http/, "ws");
  const url = base ? `${base}/ws` : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
  socket = new WebSocket(url);
  socket.onmessage = (m) => {
    const ev = JSON.parse(m.data) as VisualEvent;
    if (handler) handler(ev);
    else backlog.push(ev);
  };
  socket.onclose = () => setTimeout(connect, 1500);
}

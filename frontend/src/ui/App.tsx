import { useEffect, useRef } from "react";
import { skipIntro, startGame } from "../game/game";
import { useStore } from "../state/store";
import { ActivityLog } from "./ActivityLog";
import { AgentInspector } from "./AgentInspector";
import { Credits, HowToPlay, Settings } from "./Dialogs";
import { PrepKitViewer } from "./PrepKitViewer";
import { AvatarCreator } from "./AvatarCreator";
import { Progress, QuestBoard, QuestBoardStrip, SaveSlots } from "./QuestBoard";
import { QuestIntake } from "./QuestIntake";

export function App() {
  const ref = useRef<HTMLDivElement>(null);
  const scene = useStore((s) => s.scene);
  const modal = useStore((s) => s.modal);
  const textSize = useStore((s) => s.settings.textSize);
  const inOffice = scene === "office";

  useEffect(() => {
    if (ref.current) startGame(ref.current);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--ts", String(textSize));
  }, [textSize]);

  return (
    <div className="app">
      <div className="stage">
        {inOffice && <QuestBoardStrip />}
        <div id="game" ref={ref} />
        {inOffice && <AgentInspector />}
        {scene === "intro" && <button className="btn skip" onClick={skipIntro}>Skip intro ⏭ (Esc)</button>}
      </div>
      {inOffice && <ActivityLog />}
      {modal === "intake" && <QuestIntake />}
      {modal === "kit" && <PrepKitViewer />}
      {modal === "board" && <QuestBoard />}
      {modal === "avatar" && <AvatarCreator />}
      {modal === "slots" && <SaveSlots />}
      {modal === "progress" && <Progress />}
      {modal === "settings" && <Settings />}
      {modal === "howto" && <HowToPlay />}
      {modal === "credits" && <Credits />}
    </div>
  );
}

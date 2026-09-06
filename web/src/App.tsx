import { useState } from "react";
import { StartScreen } from "./screens/StartScreen.js";
import { RulesScreen } from "./screens/RulesScreen.js";
import GameApp from "./GameApp.js";

type AppScreen = "start" | "rules" | "game";

export default function App() {
  const [appScreen, setAppScreen] = useState<AppScreen>("start");

  if (appScreen === "rules") {
    return <RulesScreen onBack={() => setAppScreen("start")} onPlay={() => setAppScreen("game")} />;
  }

  if (appScreen === "game") {
    return <GameApp onMainMenu={() => setAppScreen("start")} />;
  }

  return <StartScreen onPlay={() => setAppScreen("game")} onRules={() => setAppScreen("rules")} />;
}

import { useState } from "react";
import { StartScreen } from "./screens/StartScreen.js";
import { RulesScreen } from "./screens/RulesScreen.js";
import GameApp from "./GameApp.js";

type AppScreen = "start" | "game";

export default function App() {
  const [appScreen, setAppScreen] = useState<AppScreen>("start");
  const [rulesOpen, setRulesOpen] = useState(false);
  // Whether Rules was opened mid-game. From the start menu it offers
  // "Start Playing"; mid-game its Back button returns to the game underneath.
  const [rulesOpenedFromGame, setRulesOpenedFromGame] = useState(false);
  // Bumped whenever a game is abandoned (Quit Game / Main Menu) so the next
  // "Play" mounts a fresh GameApp/engine instead of resuming the old one.
  const [gameInstance, setGameInstance] = useState(0);

  const openRules = (fromGame: boolean) => {
    setRulesOpenedFromGame(fromGame);
    setRulesOpen(true);
  };

  const returnToMenu = () => {
    setAppScreen("start");
    setGameInstance((n) => n + 1);
  };

  return (
    <>
      {appScreen === "game" && (
        // Kept mounted (just visually hidden) while Rules is open, so the
        // in-progress game and its engine state survive a trip to the Rules
        // screen and back -- unmounting here would reset the whole game.
        <div style={{ display: rulesOpen ? "none" : undefined }}>
          <GameApp
            key={gameInstance}
            onMainMenu={returnToMenu}
            onOpenRules={() => openRules(true)}
            covered={rulesOpen}
          />
        </div>
      )}

      {appScreen === "start" && !rulesOpen && (
        <StartScreen onPlay={() => setAppScreen("game")} onRules={() => openRules(false)} />
      )}

      {rulesOpen && (
        <RulesScreen
          onBack={() => setRulesOpen(false)}
          onPlay={
            rulesOpenedFromGame
              ? undefined
              : () => {
                  setRulesOpen(false);
                  setAppScreen("game");
                }
          }
        />
      )}
    </>
  );
}

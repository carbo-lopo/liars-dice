import { useState } from "react";
import { StartScreen } from "./screens/StartScreen.js";
import { RulesScreen } from "./screens/RulesScreen.js";
import { OptionsScreen } from "./screens/OptionsScreen.js";
import GameApp from "./GameApp.js";

type AppScreen = "start" | "game";

/** A screen shown over the start screen or the game; `fromGame` records which is underneath. */
type Overlay = { screen: "rules" | "options"; fromGame: boolean } | null;

export default function App() {
  const [appScreen, setAppScreen] = useState<AppScreen>("start");
  const [overlay, setOverlay] = useState<Overlay>(null);
  // Bumped whenever a game is abandoned (Quit Game / Main Menu) so the next
  // "Play" mounts a fresh GameApp/engine instead of resuming the old one.
  const [gameInstance, setGameInstance] = useState(0);

  const closeOverlay = () => setOverlay(null);

  const returnToMenu = () => {
    setAppScreen("start");
    setGameInstance((n) => n + 1);
  };

  return (
    <>
      {appScreen === "game" && (
        // Kept mounted (just visually hidden) while an overlay is open, so the
        // in-progress game and its engine state survive the trip there and back;
        // unmounting here would reset the whole game.
        <div style={{ display: overlay ? "none" : undefined }}>
          <GameApp
            key={gameInstance}
            onMainMenu={returnToMenu}
            onOpenRules={() => setOverlay({ screen: "rules", fromGame: true })}
            onOpenOptions={() => setOverlay({ screen: "options", fromGame: true })}
            covered={overlay !== null}
          />
        </div>
      )}

      {appScreen === "start" && !overlay && (
        <StartScreen
          onPlay={() => setAppScreen("game")}
          onRules={() => setOverlay({ screen: "rules", fromGame: false })}
          onOptions={() => setOverlay({ screen: "options", fromGame: false })}
        />
      )}

      {overlay?.screen === "rules" && (
        <RulesScreen
          onBack={closeOverlay}
          // From the start menu, Rules also offers "Start Playing"; mid-game,
          // Back returns to the game underneath.
          onPlay={
            overlay.fromGame
              ? undefined
              : () => {
                  closeOverlay();
                  setAppScreen("game");
                }
          }
        />
      )}

      {overlay?.screen === "options" && <OptionsScreen onBack={closeOverlay} />}
    </>
  );
}

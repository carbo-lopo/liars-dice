import { useGame } from "./hooks/useGame.js";
import { MainScreen } from "./screens/MainScreen.js";
import { RevealScreen } from "./screens/RevealScreen.js";
import { GameOverScreen } from "./screens/GameOverScreen.js";

export interface GameAppProps {
  onMainMenu: () => void;
  onOpenRules: () => void;
}

export default function GameApp({ onMainMenu, onOpenRules }: GameAppProps) {
  const {
    view,
    screen,
    isYourTurn,
    awaitingContinue,
    resolution,
    error,
    placeBid,
    challenge,
    continueAfterBotAction,
    continueAfterReveal,
    playAgain,
  } = useGame();

  if (screen === "reveal" && resolution) {
    return (
      <RevealScreen
        resolution={resolution}
        view={view}
        onContinue={continueAfterReveal}
        onQuit={onMainMenu}
        onRules={onOpenRules}
      />
    );
  }

  if (screen === "gameover") {
    return <GameOverScreen view={view} onPlayAgain={playAgain} onMainMenu={onMainMenu} />;
  }

  return (
    <MainScreen
      view={view}
      isYourTurn={isYourTurn}
      awaitingContinue={awaitingContinue}
      error={error}
      onPlaceBid={placeBid}
      onChallenge={challenge}
      onContinueBotAction={continueAfterBotAction}
      onQuit={onMainMenu}
      onRules={onOpenRules}
    />
  );
}

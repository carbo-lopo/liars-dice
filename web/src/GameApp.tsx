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
    opponents,
    screen,
    isYourTurn,
    awaitingContinue,
    thinkingBot,
    typingBid,
    resolution,
    result,
    error,
    placeBid,
    call,
    continueAfterBotAction,
    finishTyping,
    continueAfterReveal,
    playAgain,
  } = useGame();

  if (screen === "reveal" && resolution) {
    return (
      <RevealScreen
        resolution={resolution}
        onContinue={continueAfterReveal}
        onQuit={onMainMenu}
        onRules={onOpenRules}
      />
    );
  }

  if (screen === "gameover" && result) {
    return <GameOverScreen result={result} onPlayAgain={playAgain} onMainMenu={onMainMenu} />;
  }

  return (
    <MainScreen
      view={view}
      opponents={opponents}
      isYourTurn={isYourTurn}
      awaitingContinue={awaitingContinue}
      thinkingBot={thinkingBot}
      typingBid={typingBid}
      error={error}
      onPlaceBid={placeBid}
      onCall={call}
      onContinueBotAction={continueAfterBotAction}
      onBidTyped={finishTyping}
      onQuit={onMainMenu}
      onRules={onOpenRules}
    />
  );
}

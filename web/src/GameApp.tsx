import { useGame } from "./hooks/useGame.js";
import { MainScreen } from "./screens/MainScreen.js";
import { RevealScreen } from "./screens/RevealScreen.js";
import { GameOverScreen } from "./screens/GameOverScreen.js";

export interface GameAppProps {
  onMainMenu: () => void;
  onOpenRules: () => void;
  /** Another screen (Rules, Options) is covering the game. */
  covered: boolean;
}

export default function GameApp({ onMainMenu, onOpenRules, covered }: GameAppProps) {
  const {
    view,
    opponents,
    screen,
    isYourTurn,
    awaitingContinue,
    thinkingBot,
    rolling,
    typingBid,
    resolution,
    result,
    error,
    placeBid,
    call,
    continueAfterBotAction,
    finishRolling,
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
      covered={covered}
      thinkingBot={thinkingBot}
      rolling={rolling}
      typingBid={typingBid}
      error={error}
      onPlaceBid={placeBid}
      onCall={call}
      onContinueBotAction={continueAfterBotAction}
      onBidTyped={finishTyping}
      onRolled={finishRolling}
      onQuit={onMainMenu}
      onRules={onOpenRules}
    />
  );
}

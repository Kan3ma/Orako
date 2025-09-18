import { useState } from 'react';
import { GameSetup } from '@/components/game/GameSetup';
import { GameBoard } from '@/components/game/GameBoard';

const Index = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [players, setPlayers] = useState<string[]>([]);

  const handleStartGame = (playerNames: string[]) => {
    setPlayers(playerNames);
    setGameStarted(true);
  };

  const handleGameEnd = (winner: string) => {
    // Game ended, could show victory screen or restart
    console.log('Game won by:', winner);
  };

  const resetGame = () => {
    setGameStarted(false);
    setPlayers([]);
  };

  if (!gameStarted) {
    return <GameSetup onStartGame={handleStartGame} />;
  }

  return <GameBoard players={players} onGameEnd={handleGameEnd} />;
};

export default Index;

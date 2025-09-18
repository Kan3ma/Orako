import { useState } from 'react';
import { GameModeSelection } from '@/components/game/GameModeSelection';
import { GameSetup } from '@/components/game/GameSetup';
import { GameBoard } from '@/components/game/GameBoard';

const Index = () => {
  const [gameMode, setGameMode] = useState<'selection' | 'setup' | 'game'>('selection');
  const [playMode, setPlayMode] = useState<'computer' | 'friends' | null>(null);
  const [players, setPlayers] = useState<string[]>([]);

  const handlePlayComputer = (aiPlayers: number) => {
    const playerNames = ['You', ...Array.from({ length: aiPlayers }, (_, i) => `AI Player ${i + 1}`)];
    setPlayers(playerNames);
    setPlayMode('computer');
    setGameMode('game');
  };

  const handlePlayFriends = (mode: 'host' | 'join', roomCode?: string) => {
    // For now, show message about Supabase integration needed
    alert('To play with friends, you need to connect to Supabase first. Click the green Supabase button in the top right!');
  };

  const handleStartGame = (playerNames: string[]) => {
    setPlayers(playerNames);
    setGameMode('game');
  };

  const handleGameEnd = (winner: string) => {
    console.log('Game won by:', winner);
    // Reset to mode selection after game ends
    setTimeout(() => {
      setGameMode('selection');
      setPlayMode(null);
      setPlayers([]);
    }, 3000);
  };

  const resetGame = () => {
    setGameMode('selection');
    setPlayMode(null);
    setPlayers([]);
  };

  if (gameMode === 'selection') {
    return <GameModeSelection onPlayComputer={handlePlayComputer} onPlayFriends={handlePlayFriends} />;
  }

  if (gameMode === 'setup') {
    return <GameSetup onStartGame={handleStartGame} />;
  }

  return <GameBoard players={players} onGameEnd={handleGameEnd} />;
};

export default Index;

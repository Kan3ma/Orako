import { useCallback, useState } from 'react';
import { GameModeSelection } from '@/components/game/GameModeSelection';
import { GameSetup } from '@/components/game/GameSetup';
import { GameBoard } from '@/components/game/GameBoard';
import { ComputerSetup } from '@/components/game/ComputerSetup';
import { MultiplayerLobby } from '@/components/game/MultiplayerLobby';
import { useMultiplayer } from '@/hooks/useMultiplayer';

const Index = () => {
  const [gameMode, setGameMode] = useState<'selection' | 'computer-setup' | 'setup' | 'game' | 'multiplayer-lobby' | 'multiplayer-game'>('selection');
  const [playMode, setPlayMode] = useState<'computer' | 'friends' | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  
  const { room, isHost, loading, createRoom, joinRoom, updateGameState, leaveRoom } = useMultiplayer();

  const handlePlayComputer = (aiPlayers: number) => {
    const playerNames = ['You', ...Array.from({ length: aiPlayers }, (_, i) => `AI Player ${i + 1}`)];
    setPlayers(playerNames);
    setPlayMode('computer');
    setGameMode('game');
  };

  const handlePlayFriends = () => {
    setPlayMode('friends');
    setGameMode('multiplayer-lobby');
  };

  const handleChangeOpponents = () => {
    setPlayers([]);
    setPlayMode(null);
    setGameMode('computer-setup');
  };

  const handleStartGame = (playerNames: string[]) => {
    setPlayers(playerNames);
    setGameMode('game');
  };

  const handleMultiplayerStart = useCallback(() => {
    if (room) {
      const playerNames = isHost 
        ? [room.host_name, room.guest_name || 'Waiting...']
        : [room.host_name, room.guest_name || 'You'];
      setPlayers(playerNames);
      setGameMode('multiplayer-game');
    }
  }, [room, isHost]);

  const handleGameEnd = (winner: string) => {
    console.log('Game won by:', winner);
    // No longer auto-navigate - game stays on screen
  };

  const handleRematch = () => {
    // Re-trigger game with same settings
    if (playMode === 'computer') {
      const aiCount = players.length - 1;
      handlePlayComputer(aiCount);
    } else if (playMode === 'friends') {
      handleMultiplayerStart();
    }
  };

  const handleChangeMode = () => {
    if (playMode === 'friends') {
      leaveRoom();
    }
    setGameMode('selection');
    setPlayMode(null);
    setPlayers([]);
  };

  const resetGame = () => {
    if (playMode === 'friends') {
      leaveRoom();
    }
    setGameMode('selection');
    setPlayMode(null);
    setPlayers([]);
  };

  if (gameMode === 'selection') {
    return <GameModeSelection onPlayComputer={handlePlayComputer} onPlayFriends={handlePlayFriends} />;
  }

  if (gameMode === 'multiplayer-lobby') {
    return (
      <MultiplayerLobby
        room={room}
        isHost={isHost}
        loading={loading}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onLeaveRoom={leaveRoom}
        onStartGame={handleMultiplayerStart}
        onBack={resetGame}
      />
    );
  }

  if (gameMode === 'computer-setup') {
    return (
      <ComputerSetup
        onStartGame={handlePlayComputer}
        onBack={() => setGameMode('selection')}
      />
    );
  }

  if (gameMode === 'setup') {
    return <GameSetup onStartGame={handleStartGame} />;
  }

  if (gameMode === 'multiplayer-game' && room) {
    return (
      <GameBoard 
        players={players} 
        onGameEnd={handleGameEnd}
        onRematch={handleRematch}
        onChangeMode={handleChangeMode}
        isMultiplayer={true}
        room={room}
        isHost={isHost}
        onUpdateGameState={updateGameState}
      />
    );
  }

  return (
    <GameBoard 
      players={players} 
      onGameEnd={handleGameEnd} 
      onRematch={handleRematch}
      onChangeMode={handleChangeMode}
      onChangeOpponents={handleChangeOpponents}
    />
  );
};

export default Index;

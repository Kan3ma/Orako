import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { GameModeSelection } from '@/components/game/GameModeSelection';
import { GameSetup } from '@/components/game/GameSetup';
import { GameBoard } from '@/components/game/GameBoard';
import { ComputerSetup } from '@/components/game/ComputerSetup';
import { MultiplayerLobby } from '@/components/game/MultiplayerLobby';
import { useMultiplayer } from '@/hooks/useMultiplayer';

const AI_NAMES = [
  'Amara', 'Bwalya', 'Chanda', 'Chipo', 'Daliso', 'Enala', 'Jelani', 'Kunda',
  'Leya', 'Lombe', 'Malaika', 'Mapalo', 'Misozi', 'Mwaka', 'Natasha', 'Nchimunya',
  'Sampa', 'Tapiwa', 'Tionenji', 'Thandiwe', 'Wezi', 'Wiza', 'Ziko', 'Zuberi',
  'Ndoki', 'Oracle', 'Sachi', 'Chilz', 'Sauce', 'Jere', 'Osama', 'Mwila',
  'Paul', 'Jack', 'Bin Bin', 'Gene', 'Senpai', 'Mulenga', 'Tshiamo', 'Mutende',
  'Pimpa', 'Snake', 'Cho', 'Blue', 'Luyando', 'Handsome', 'Whitetee', 'Amisi',
  'Banji', 'Dope', 'CJ', 'Mucho', 'Heatblast',
];

const Index = () => {
  const [gameMode, setGameMode] = useState<'selection' | 'computer-setup' | 'setup' | 'game' | 'multiplayer-lobby' | 'multiplayer-game'>('selection');
  const [playMode, setPlayMode] = useState<'computer' | 'friends' | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  
  const { room, isHost, localPlayerIndex, loading, createRoom, joinRoom, updateGameState, updateRoomSettings, leaveRoom } = useMultiplayer();

  useEffect(() => {
    if (gameMode !== 'multiplayer-game') return;

    if (!room) {
      toast.info('The host closed the room.');
      setPlayers([]);
      setPlayMode(null);
      setGameMode('selection');
      return;
    }

    if (room.player_names.length < 2) {
      toast.info('Your opponent left the match. Waiting for another player.');
      setPlayers([]);
      setGameMode('multiplayer-lobby');
    }
  }, [gameMode, room]);

  useEffect(() => {
    if (room?.player_names?.length) setPlayers(room.player_names);
  }, [room?.player_names]);

  const handlePlayComputer = (aiPlayers: number) => {
    const previousOpponents = new Set(players.slice(1));
    const availableNames = AI_NAMES.filter(name => !previousOpponents.has(name));
    const shuffledNames = [...availableNames].sort(() => Math.random() - 0.5);
    const playerNames = ['You', ...shuffledNames.slice(0, aiPlayers)];
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
      const roundPlayerCount = room.game_state?.players?.length ?? room.player_names.length;
      if (localPlayerIndex < 0 || localPlayerIndex >= roundPlayerCount) {
        setGameMode('multiplayer-lobby');
        return;
      }
      const playerNames = room.player_names;
      setPlayers(playerNames);
      setGameMode('multiplayer-game');
    }
  }, [room, localPlayerIndex]);

  const handleGameEnd = (winner: string) => {
    console.log('Game won by:', winner);
    // No longer auto-navigate - game stays on screen
  };

  const handleRematch = () => {
    // Re-trigger game with same settings
    if (playMode === 'computer') {
      setPlayers([...players]);
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
        onUpdateEndCondition={updateRoomSettings}
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
        localPlayerIndex={localPlayerIndex}
        onUpdateGameState={updateGameState}
        onUpdateEndCondition={updateRoomSettings}
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

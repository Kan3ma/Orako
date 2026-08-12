import { useState } from 'react';
import { ComputerSetup } from '@/components/game/ComputerSetup';
import { NjukaHome } from '@/components/game/NjukaHome';

interface GameModeSelectionProps {
  onPlayComputer: (aiPlayers: number) => void;
  onPlayFriends: () => void;
}

export const GameModeSelection = ({ onPlayComputer, onPlayFriends }: GameModeSelectionProps) => {
  const [screen, setScreen] = useState<'home' | 'computer'>('home');

  if (screen === 'computer') {
    return (
      <ComputerSetup
        onStartGame={onPlayComputer}
        onBack={() => setScreen('home')}
      />
    );
  }

  return (
    <NjukaHome
      onPlayComputer={() => setScreen('computer')}
      onPlayFriends={onPlayFriends}
    />
  );
};

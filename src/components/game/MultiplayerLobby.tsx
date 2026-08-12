import React, { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface MultiplayerLobbyProps {
  room: {
    room_code: string;
    host_name: string;
    guest_name: string | null;
    status: string;
  } | null;
  isHost: boolean;
  loading: boolean;
  onCreateRoom: (name: string) => Promise<string | null>;
  onJoinRoom: (code: string, name: string) => Promise<boolean>;
  onLeaveRoom: () => void;
  onStartGame: () => void;
  onBack: () => void;
}

interface LobbyPageProps {
  children: React.ReactNode;
  onBack: () => void;
  backLabel?: string;
}

const LobbyPage = ({ children, onBack, backLabel = 'Back' }: LobbyPageProps) => (
  <div className="relative min-h-screen bg-gradient-felt flex items-center justify-center p-4 pt-20 sm:pt-4">
    <Button
      type="button"
      variant="outline"
      onClick={onBack}
      className="absolute left-4 top-4 gap-2 border-gold/50 bg-secondary/90 text-gold hover:border-gold hover:bg-gold hover:text-background sm:left-6 sm:top-6"
    >
      <ArrowLeft className="h-4 w-4" />
      {backLabel}
    </Button>
    {children}
  </div>
);

const lobbyCardClass = 'w-full max-w-md bg-secondary/95 backdrop-blur border-border shadow-deep';
const primaryButtonClass = 'w-full bg-gradient-gold text-background hover:bg-gold-dim';
const outlineButtonClass = 'w-full border-gold/50 text-gold hover:bg-gold hover:text-background';
const inputClass = 'border-border bg-background/60 text-foreground placeholder:text-foreground/40 focus-visible:ring-gold';

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  room,
  isHost,
  loading,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onStartGame,
  onBack,
}) => {
  const [mode, setMode] = useState<'select' | 'host' | 'join'>('select');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  useEffect(() => {
    if (room?.guest_name) {
      onStartGame();
    }
  }, [room?.guest_name, onStartGame]);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    await onCreateRoom(playerName);
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!roomCode.trim() || roomCode.length !== 5) {
      toast.error('Please enter a valid 5-digit room code');
      return;
    }
    await onJoinRoom(roomCode, playerName);
  };

  const copyRoomCode = async () => {
    if (room?.room_code) {
      await navigator.clipboard.writeText(room.room_code);
      toast.success('Room code copied!');
    }
  };

  if (room && isHost && !room.guest_name) {
    return (
      <LobbyPage
        onBack={() => {
          onLeaveRoom();
          setMode('select');
        }}
      >
        <Card className={lobbyCardClass}>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl text-gold">
              <Users className="h-6 w-6" />
              Waiting for Player
            </CardTitle>
            <CardDescription className="text-foreground/70">
              Share the room code with your friend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center gap-2">
              <span className="rounded-lg border border-gold/30 bg-background/60 px-6 py-3 text-4xl font-bold tracking-widest text-gold">
                {room.room_code}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={copyRoomCode}
                aria-label="Copy room code"
                className="border-gold/50 text-gold hover:bg-gold hover:text-background"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2 text-foreground/70">
              <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
              Waiting for opponent to join...
            </div>
          </CardContent>
        </Card>
      </LobbyPage>
    );
  }

  if (room?.guest_name) return null;

  if (mode === 'select') {
    return (
      <LobbyPage onBack={onBack}>
        <Card className={lobbyCardClass}>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-gold">Multiplayer Mode</CardTitle>
            <CardDescription className="text-foreground/70">
              Create a private room or join a friend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => setMode('host')} className={`${primaryButtonClass} h-14 text-lg`}>
              Host a Game
            </Button>
            <Button
              onClick={() => setMode('join')}
              variant="outline"
              className={`${outlineButtonClass} h-14 text-lg`}
            >
              Join a Game
            </Button>
          </CardContent>
        </Card>
      </LobbyPage>
    );
  }

  if (mode === 'host') {
    return (
      <LobbyPage onBack={() => setMode('select')}>
        <Card className={lobbyCardClass}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-gold">Host a Game</CardTitle>
            <CardDescription className="text-foreground/70">
              Enter your name to create a private room.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground/80">Your Name</label>
              <Input
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="Enter your name"
                className={inputClass}
              />
            </div>
            <div className="pt-3">
              <Button onClick={handleCreateRoom} disabled={loading} className={primaryButtonClass}>
                {loading ? 'Creating...' : 'Create Room'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </LobbyPage>
    );
  }

  return (
    <LobbyPage onBack={() => setMode('select')}>
      <Card className={lobbyCardClass}>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-gold">Join a Game</CardTitle>
          <CardDescription className="text-foreground/70">
            Enter your name and your friend's room code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground/80">Your Name</label>
            <Input
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="Enter your name"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground/80">Room Code</label>
            <Input
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="Enter 5-digit code"
              className={`${inputClass} text-center text-2xl tracking-widest`}
              maxLength={5}
              inputMode="numeric"
            />
          </div>
          <div className="pt-3">
            <Button onClick={handleJoinRoom} disabled={loading} className={primaryButtonClass}>
              {loading ? 'Joining...' : 'Join Room'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </LobbyPage>
  );
};

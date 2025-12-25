import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Copy, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

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

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  room,
  isHost,
  loading,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onStartGame,
  onBack
}) => {
  const [mode, setMode] = useState<'select' | 'host' | 'join'>('select');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

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
    const success = await onJoinRoom(roomCode, playerName);
    if (success) {
      onStartGame();
    }
  };

  const copyRoomCode = () => {
    if (room?.room_code) {
      navigator.clipboard.writeText(room.room_code);
      toast.success('Room code copied!');
    }
  };

  // Waiting room (host created room, waiting for guest)
  if (room && isHost && !room.guest_name) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-emerald-800/90 border-amber-600/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-amber-400 flex items-center justify-center gap-2">
              <Users className="w-6 h-6" />
              Waiting for Player
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-emerald-200 mb-2">Share this code with your friend:</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-bold text-white tracking-widest bg-emerald-900/50 px-6 py-3 rounded-lg">
                  {room.room_code}
                </span>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={copyRoomCode}
                  className="border-amber-600/50 text-amber-400 hover:bg-amber-600/20"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-emerald-300">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span>Waiting for opponent to join...</span>
            </div>

            <Button 
              variant="outline" 
              onClick={() => { onLeaveRoom(); setMode('select'); }}
              className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guest joined, start game
  if (room && room.guest_name) {
    onStartGame();
    return null;
  }

  // Mode selection
  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-emerald-800/90 border-amber-600/50">
          <CardHeader className="text-center">
            <Button 
              variant="ghost" 
              onClick={onBack}
              className="absolute left-4 top-4 text-emerald-200 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <CardTitle className="text-2xl text-amber-400">
              Multiplayer Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setMode('host')}
              className="w-full h-16 text-lg bg-amber-600 hover:bg-amber-700 text-white"
            >
              Host a Game
            </Button>
            <Button 
              onClick={() => setMode('join')}
              variant="outline"
              className="w-full h-16 text-lg border-amber-600/50 text-amber-400 hover:bg-amber-600/20"
            >
              Join a Game
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Host form
  if (mode === 'host') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-emerald-800/90 border-amber-600/50">
          <CardHeader className="text-center">
            <Button 
              variant="ghost" 
              onClick={() => setMode('select')}
              className="absolute left-4 top-4 text-emerald-200 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <CardTitle className="text-2xl text-amber-400">
              Host a Game
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-emerald-200 text-sm mb-2 block">Your Name</label>
              <Input 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="bg-emerald-900/50 border-emerald-600 text-white placeholder:text-emerald-400"
              />
            </div>
            <Button 
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Join form
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-emerald-800/90 border-amber-600/50">
        <CardHeader className="text-center">
          <Button 
            variant="ghost" 
            onClick={() => setMode('select')}
            className="absolute left-4 top-4 text-emerald-200 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <CardTitle className="text-2xl text-amber-400">
            Join a Game
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-emerald-200 text-sm mb-2 block">Your Name</label>
            <Input 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="bg-emerald-900/50 border-emerald-600 text-white placeholder:text-emerald-400"
            />
          </div>
          <div>
            <label className="text-emerald-200 text-sm mb-2 block">Room Code</label>
            <Input 
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="Enter 5-digit code"
              className="bg-emerald-900/50 border-emerald-600 text-white placeholder:text-emerald-400 text-center text-2xl tracking-widest"
              maxLength={5}
            />
          </div>
          <Button 
            onClick={handleJoinRoom}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          >
            {loading ? 'Joining...' : 'Join Room'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

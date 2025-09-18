import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bot, Users, Crown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameModeSelectionProps {
  onPlayComputer: (aiPlayers: number) => void;
  onPlayFriends: (mode: 'host' | 'join', roomCode?: string) => void;
}

export const GameModeSelection = ({ onPlayComputer, onPlayFriends }: GameModeSelectionProps) => {
  const [selectedMode, setSelectedMode] = useState<'computer' | 'friends' | null>(null);
  const [aiPlayerCount, setAiPlayerCount] = useState(2);
  const [roomCode, setRoomCode] = useState('');

  const handleComputerPlay = () => {
    onPlayComputer(aiPlayerCount);
  };

  const handleHostGame = () => {
    onPlayFriends('host');
  };

  const handleJoinGame = () => {
    if (roomCode.trim()) {
      onPlayFriends('join', roomCode.trim());
    }
  };

  if (selectedMode === 'computer') {
    return (
      <div className="min-h-screen bg-gradient-felt flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-secondary/95 backdrop-blur border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gold flex items-center justify-center gap-2">
              <Bot className="w-6 h-6" />
              Play vs Computer
            </CardTitle>
            <CardDescription>Choose how many AI opponents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Number of AI Players</Label>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((count) => (
                  <Button
                    key={count}
                    variant={aiPlayerCount === count ? "default" : "outline"}
                    onClick={() => setAiPlayerCount(count)}
                    className={cn(
                      "h-12 text-lg",
                      aiPlayerCount === count && "bg-gradient-gold text-background"
                    )}
                  >
                    {count} AI
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedMode(null)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleComputerPlay}
                className={cn(
                  "flex-1 bg-gradient-gold hover:bg-gold-dim text-background",
                  "transition-smooth"
                )}
              >
                Start Game
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedMode === 'friends') {
    return (
      <div className="min-h-screen bg-gradient-felt flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-secondary/95 backdrop-blur border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gold flex items-center justify-center gap-2">
              <Users className="w-6 h-6" />
              Play with Friends
            </CardTitle>
            <CardDescription>Host a game or join an existing room</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Button
                onClick={handleHostGame}
                className={cn(
                  "w-full h-12 text-lg bg-gradient-gold hover:bg-gold-dim text-background",
                  "transition-smooth flex items-center justify-center gap-2"
                )}
              >
                <Crown className="w-5 h-5" />
                Host a Game
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-secondary px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="roomCode">Join with Room Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="roomCode"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="Enter room code"
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
                  />
                  <Button
                    onClick={handleJoinGame}
                    disabled={!roomCode.trim()}
                    variant="outline"
                    size="icon"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setSelectedMode(null)}
              className="w-full"
            >
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-felt flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-secondary/95 backdrop-blur border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold text-gold mb-2">NJUKA</CardTitle>
          <CardDescription className="text-lg text-foreground/80">
            Choose your game mode
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card 
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 bg-background/50 border-border"
              onClick={() => setSelectedMode('computer')}
            >
              <CardContent className="p-6 text-center space-y-4">
                <Bot className="w-16 h-16 mx-auto text-gold" />
                <h3 className="text-xl font-bold text-gold">Play vs Computer</h3>
                <p className="text-foreground/80">
                  Challenge AI opponents in single player mode
                </p>
                <div className="text-sm text-foreground/60">
                  • Up to 4 AI players
                  • Practice your skills
                  • Instant gameplay
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 bg-background/50 border-border"
              onClick={() => setSelectedMode('friends')}
            >
              <CardContent className="p-6 text-center space-y-4">
                <Users className="w-16 h-16 mx-auto text-gold" />
                <h3 className="text-xl font-bold text-gold">Play with Friends</h3>
                <p className="text-foreground/80">
                  Create or join multiplayer rooms
                </p>
                <div className="text-sm text-foreground/60">
                  • Up to 10 players
                  • Real-time multiplayer
                  • Host or join rooms
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game Rules */}
          <div className="bg-background/50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-gold mb-2">How to Play Njuka</h3>
            <ul className="text-sm text-foreground/80 space-y-1">
              <li>• Goal: Get a consecutive pair (like 3,4) AND a matching pair (like 7,7)</li>
              <li>• Each player starts with 3 cards</li>
              <li>• On your turn: draw a card, then discard one if you don't win</li>
              <li>• Special: Claim discarded cards to win before the next player draws!</li>
              <li>• Card order: A,2,3,4,5,6,7,8,9,10,J,Q,K (J,Q,K are interchangeable)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameSetupProps {
  onStartGame: (players: string[]) => void;
}

export const GameSetup = ({ onStartGame }: GameSetupProps) => {
  const [players, setPlayers] = useState<string[]>(['Player 1', 'Player 2']);
  const [newPlayerName, setNewPlayerName] = useState('');

  const addPlayer = () => {
    if (newPlayerName.trim() && players.length < 10) {
      setPlayers([...players, newPlayerName.trim()]);
      setNewPlayerName('');
    }
  };

  const removePlayer = (index: number) => {
    if (players.length > 2) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const updatePlayerName = (index: number, name: string) => {
    const updatedPlayers = [...players];
    updatedPlayers[index] = name;
    setPlayers(updatedPlayers);
  };

  const startGame = () => {
    const validPlayers = players.filter(name => name.trim() !== '');
    if (validPlayers.length >= 2) {
      onStartGame(validPlayers);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-felt flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-secondary/95 backdrop-blur border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold text-gold mb-2">NJUKA</CardTitle>
          <CardDescription className="text-lg text-foreground/80">
            The Ultimate Card Strategy Game
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Game Rules */}
          <div className="bg-background/50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-gold mb-2 flex items-center gap-2">
              <Users className="w-5 h-5" />
              How to Play Njuka
            </h3>
            <ul className="text-sm text-foreground/80 space-y-1">
              <li>• Goal: Get a consecutive pair (like 3,4) AND a matching pair (like 7,7)</li>
              <li>• Each player starts with 3 cards</li>
              <li>• On your turn: draw a card, then discard one if you don't win</li>
              <li>• Special: Claim discarded cards to win before the next player draws!</li>
              <li>• Card order: A,2,3,4,5,6,7,8,9,10,J,Q,K (J,Q,K are interchangeable)</li>
            </ul>
          </div>

          {/* Player Setup */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold text-foreground">
              Players ({players.length}/10)
            </Label>
            
            <div className="space-y-2">
              {players.map((player, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={player}
                    onChange={(e) => updatePlayerName(index, e.target.value)}
                    placeholder={`Player ${index + 1} name`}
                    className="flex-1"
                  />
                  {players.length > 2 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removePlayer(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Player */}
            {players.length < 10 && (
              <div className="flex gap-2">
                <Input
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Enter player name"
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
                />
                <Button
                  onClick={addPlayer}
                  disabled={!newPlayerName.trim()}
                  variant="outline"
                  size="icon"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Start Game */}
          <Button
            onClick={startGame}
            disabled={players.filter(name => name.trim() !== '').length < 2}
            className={cn(
              "w-full h-12 text-lg font-semibold",
              "bg-gradient-gold hover:bg-gold-dim text-background",
              "transition-smooth"
            )}
          >
            Start Game
          </Button>

          {players.filter(name => name.trim() !== '').length < 2 && (
            <p className="text-center text-destructive text-sm">
              At least 2 players are required to start the game
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
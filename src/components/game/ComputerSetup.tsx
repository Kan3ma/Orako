import { useState } from 'react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ComputerSetupProps {
  onStartGame: (aiPlayers: number) => void;
  onBack: () => void;
}

export const ComputerSetup = ({ onStartGame, onBack }: ComputerSetupProps) => {
  const [aiPlayerCount, setAiPlayerCount] = useState(2);

  return (
    <div className="relative min-h-screen bg-gradient-felt flex items-center justify-center p-4 pt-20 sm:pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        className="absolute left-4 top-4 border-gold/50 bg-secondary/90 text-gold hover:border-gold hover:bg-gold hover:text-background sm:left-6 sm:top-6"
      >
        Back
      </Button>
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
            <Label className="text-lg font-bold text-gold">Number of AI Players</Label>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((count) => (
                <Button
                  key={count}
                  variant={aiPlayerCount === count ? 'default' : 'outline'}
                  onClick={() => setAiPlayerCount(count)}
                  className={cn(
                    'h-12 text-lg font-bold tracking-wide text-foreground',
                    aiPlayerCount === count && 'bg-gradient-gold text-background'
                  )}
                >
                  {count} AI
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} className="flex-1 border-gold/60 text-gold hover:bg-gold hover:text-background">
              Back
            </Button>
            <Button
              onClick={() => onStartGame(aiPlayerCount)}
              className={cn(
                'flex-1 bg-gradient-gold hover:bg-gold-dim text-background',
                'transition-smooth'
              )}
            >
              Start Game
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

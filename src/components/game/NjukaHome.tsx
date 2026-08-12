import { Bot, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface NjukaHomeProps {
  onPlayComputer: () => void;
  onPlayFriends: () => void;
}

export const NjukaHome = ({ onPlayComputer, onPlayFriends }: NjukaHomeProps) => (
  <div className="relative min-h-screen bg-gradient-felt flex items-center justify-center p-4 pt-20">
    <Button
      asChild
      variant="outline"
      className="fixed left-4 top-4 z-50 border-gold/50 bg-secondary text-gold shadow-deep hover:border-gold hover:bg-gold hover:text-background sm:left-6 sm:top-6"
    >
      <Link to="/">Home</Link>
    </Button>
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
            onClick={onPlayComputer}
          >
            <CardContent className="p-6 text-center space-y-4">
              <Bot className="w-16 h-16 mx-auto text-gold" />
              <h3 className="text-xl font-bold text-gold">Play vs Computer</h3>
              <p className="text-foreground/80">
                Challenge AI opponents in single player mode
              </p>
              <div className="text-sm text-foreground/60">
                • Up to 4 AI players • Practice your skills • Instant gameplay
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 bg-background/50 border-border"
            onClick={onPlayFriends}
          >
            <CardContent className="p-6 text-center space-y-4">
              <Users className="w-16 h-16 mx-auto text-gold" />
              <h3 className="text-xl font-bold text-gold">Play with Friends</h3>
              <p className="text-foreground/80">
                Create or join multiplayer rooms
              </p>
              <div className="text-sm text-foreground/60">
                • Up to 10 players • Real-time multiplayer • Host or join rooms
              </div>
            </CardContent>
          </Card>
        </div>

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

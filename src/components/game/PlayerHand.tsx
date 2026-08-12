import { Player } from '@/types/game';
import { PlayingCard } from './PlayingCard';
import { checkWinCondition } from '@/utils/gameLogic';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PlayerHandProps {
  player: Player;
  isCurrentPlayer: boolean;
  isLocalPlayer?: boolean;
  hideCards?: boolean;
  onCardSelect?: (index: number) => void;
  selectedCardIndex?: number | null;
  onClaimCard?: () => void;
  canClaim?: boolean;
}

export const PlayerHand = ({ 
  player, 
  isCurrentPlayer, 
  isLocalPlayer = true,
  hideCards = false,
  onCardSelect, 
  selectedCardIndex,
  onClaimCard,
  canClaim = false
}: PlayerHandProps) => {
  const winCondition = checkWinCondition(player.hand);

  return (
    <div className={cn(
      "bg-secondary/20 backdrop-blur-sm border border-border rounded-xl p-6",
      "transition-smooth",
      isCurrentPlayer && "ring-2 ring-gold shadow-gold",
      player.isWinner && "ring-2 ring-green-500 bg-green-500/10"
    )}>
      {/* Player Info */}
      <div className="flex justify-between items-center mb-4">
        <h3 className={cn(
          "text-lg font-semibold",
          isCurrentPlayer ? "text-gold" : "text-foreground",
          player.isWinner && "text-green-400"
        )}>
          {player.name}
          {player.isWinner && " 🏆"}
          {isCurrentPlayer && !player.isWinner && (isLocalPlayer ? " (Your Turn)" : " (Their Turn)")}
        </h3>
        
        {canClaim && onClaimCard && (
          <Button 
            onClick={onClaimCard}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white animate-pulse"
          >
            Claim & Win!
          </Button>
        )}
      </div>

      {/* Hand */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {player.hand.map((card, index) => (
          <div 
            key={card.id}
            className="animate-card-deal"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <PlayingCard
              card={card}
              isFlipped={hideCards}
              onClick={() => onCardSelect?.(index)}
              canSelect={isCurrentPlayer && !!onCardSelect}
              isSelected={selectedCardIndex === index}
            />
          </div>
        ))}
      </div>

      {/* Win Condition Display */}
      {!hideCards && winCondition.isWinning && (
        <div className="bg-green-500/20 border border-green-500 rounded-lg p-3">
          <p className="text-green-400 font-semibold mb-2">🎉 Winning Hand!</p>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-green-300">Consecutive: </span>
              <span className="text-foreground">
                {winCondition.consecutivePair.map(c => c.rank).join(', ')}
              </span>
            </div>
            <div>
              <span className="text-green-300">Matching: </span>
              <span className="text-foreground">
                {winCondition.matchingPair.map(c => c.rank).join(', ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hand Info */}
      <div className="text-sm text-foreground/60">
        Cards: {player.hand.length} | 
        Need: {winCondition.isWinning ? "Nothing - You Win!" : "Consecutive pair + Matching pair"}
      </div>
    </div>
  );
};

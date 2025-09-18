import { Card } from '@/types/game';
import { getSuitSymbol, getSuitColor } from '@/utils/gameLogic';
import { cn } from '@/lib/utils';

interface PlayingCardProps {
  card?: Card;
  isFlipped?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  canSelect?: boolean;
  isSelected?: boolean;
}

export const PlayingCard = ({ 
  card, 
  isFlipped = false, 
  onClick, 
  className,
  size = 'md',
  canSelect = false,
  isSelected = false
}: PlayingCardProps) => {
  const sizeClasses = {
    sm: 'w-12 h-16 text-xs',
    md: 'w-16 h-24 text-sm',
    lg: 'w-20 h-32 text-base'
  };

  if (!card || isFlipped) {
    return (
      <div 
        className={cn(
          "bg-gradient-to-br from-blue-800 to-blue-900 border-2 border-blue-600 rounded-lg",
          "flex items-center justify-center cursor-pointer",
          "shadow-card transition-smooth hover:scale-105",
          "bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))]",
          sizeClasses[size],
          className
        )}
        onClick={onClick}
      >
        <div className="text-blue-300 font-bold text-2xl">N</div>
      </div>
    );
  }

  const suitColor = getSuitColor(card.suit);
  const suitSymbol = getSuitSymbol(card.suit);

  return (
    <div 
      className={cn(
        "bg-gradient-card border border-gray-300 rounded-lg",
        "flex flex-col justify-between p-2 cursor-pointer",
        "shadow-card transition-smooth hover:scale-105",
        "relative overflow-hidden",
        canSelect && "hover:shadow-gold",
        isSelected && "ring-2 ring-gold shadow-gold",
        sizeClasses[size],
        className
      )}
      onClick={onClick}
    >
      {/* Top left */}
      <div className={cn(
        "flex flex-col items-center leading-none",
        suitColor === 'red' ? 'text-red-600' : 'text-gray-800'
      )}>
        <span className="font-bold">{card.rank}</span>
        <span>{suitSymbol}</span>
      </div>

      {/* Center symbol */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center",
        "text-2xl font-bold opacity-20",
        suitColor === 'red' ? 'text-red-600' : 'text-gray-800'
      )}>
        {suitSymbol}
      </div>

      {/* Bottom right (rotated) */}
      <div className={cn(
        "flex flex-col items-center leading-none rotate-180 self-end",
        suitColor === 'red' ? 'text-red-600' : 'text-gray-800'
      )}>
        <span className="font-bold">{card.rank}</span>
        <span>{suitSymbol}</span>
      </div>
    </div>
  );
};
import { CSSProperties } from 'react';
import { Card, GameState } from '@/types/game';
import { Gauge } from 'lucide-react';
import { canUseCardToWin } from '@/utils/gameLogic';
import type { SpecialPairOption } from '@/utils/gameLogic';
import { GameSettingsDialog, NjukaSettings } from './GameSettingsDialog';
import { PlayingCard } from './PlayingCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ComputerTableProps {
  gameState: GameState;
  selectedCardIndex: number | null;
  onSelectCard: (index: number) => void;
  onDraw: () => void;
  onDiscard: (index: number) => void;
  onClaim: () => void;
  onRematch: () => void;
  onStart: () => void;
  cardMotion: { key: number; kind: 'draw' | 'discard' | 'deal' | 'shuffle'; card?: Card; playerIndex: number } | null;
  turnPaused: boolean;
  isDealing: boolean;
  settings: NjukaSettings;
  onSettingsChange: (settings: NjukaSettings) => void;
  specialPairs: SpecialPairOption[];
  onSpecialDiscard: (option: SpecialPairOption) => void;
  aiSpeed: 1 | 2 | 3;
  onCycleAiSpeed: () => void;
}

const seatLayouts: Record<number, Array<{ left: string; top: string }>> = {
  1: [{ left: '50%', top: '5%' }],
  2: [
    { left: '27%', top: '7%' },
    { left: '73%', top: '7%' },
  ],
  3: [
    { left: '9%', top: '36%' },
    { left: '50%', top: '5%' },
    { left: '91%', top: '36%' },
  ],
  4: [
    { left: '8%', top: '36%' },
    { left: '30%', top: '5%' },
    { left: '70%', top: '5%' },
    { left: '92%', top: '36%' },
  ],
};

export const ComputerTable = ({ gameState, selectedCardIndex, onSelectCard, onDraw, onDiscard, onClaim, onRematch, onStart, cardMotion, turnPaused, isDealing, settings, onSettingsChange, specialPairs, onSpecialDiscard, aiSpeed, onCycleAiSpeed }: ComputerTableProps) => {
  const human = gameState.players[0];
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const canDraw = !turnPaused && !gameState.gameEnded && gameState.currentPlayerIndex === 0 && human?.hand.length < 4;
  const canDiscard = !turnPaused && !gameState.gameEnded && gameState.currentPlayerIndex === 0 && human?.hand.length === 4;
  const canClaim = !gameState.gameEnded && gameState.canClaim && !!gameState.lastDiscardedCard &&
    canUseCardToWin(human?.hand ?? [], gameState.lastDiscardedCard, settings.tenJackConsecutive);
  const discarded = gameState.discardPile.slice(-4);
  const opponentCount = gameState.players.length - 1;
  const seatLayout = seatLayouts[opponentCount] ?? seatLayouts[4];
  const motionSeat = cardMotion?.playerIndex === 0 ? { x: '0px', y: '34vh' } : {
    x: `calc(${seatLayout[(cardMotion?.playerIndex ?? 1) - 1]?.left ?? '50%'} - 50%)`,
    y: `calc(${seatLayout[(cardMotion?.playerIndex ?? 1) - 1]?.top ?? '5%'} - 43%)`,
  };
  const motionStyle = { '--card-x': motionSeat.x, '--card-y': motionSeat.y, '--speed-factor': aiSpeed } as CSSProperties;

  return (
    <main className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1500px] items-center justify-center overflow-hidden px-2 pb-4 pt-20 sm:px-8 sm:pt-16">
      <div className="absolute right-4 top-4 z-[100] flex gap-2 sm:right-6 sm:top-6">
        <Button type="button" variant="outline" onClick={onCycleAiSpeed} className="border-gold/50 bg-secondary/90 text-gold hover:bg-gold hover:text-background" aria-label={`Computer thinking speed ${aiSpeed} times`}>
          <Gauge className="mr-2 h-4 w-4" />×{aiSpeed}
        </Button>
        <GameSettingsDialog settings={settings} onChange={onSettingsChange} changesApplyNextRound={gameState.gameStarted && !gameState.gameEnded} />
      </div>
      <div className="absolute left-1/2 top-5 z-30 -translate-x-1/2 text-center">
        <h1 className="text-2xl font-black tracking-[0.24em] text-gold sm:text-4xl">NJUKA</h1>
        <p className="mt-1 text-sm font-semibold text-foreground/80">
          {!gameState.gameStarted ? 'Ready to play?' : gameState.gameEnded ? `${gameState.winner?.name ?? 'You'} wins!` : turnPaused ? `${currentPlayer?.name ?? ''} is considering the discard…` : currentPlayer?.isWinner ? 'Finishing round…' : gameState.currentPlayerIndex === 0 ? 'Your turn' : `${currentPlayer?.name ?? ''}'s turn`}
        </p>
        {gameState.gameEnded && (
          <Button onClick={onRematch} className="mt-3 bg-gradient-gold text-background shadow-gold hover:bg-gold-dim">Rematch</Button>
        )}
      </div>

      <section className="njuka-table relative h-[68vh] min-h-[470px] w-full max-w-[1180px]">
        {cardMotion && (
          <div key={cardMotion.key} style={motionStyle} className={cn('pointer-events-none absolute left-1/2 top-[43%] z-50', cardMotion.kind === 'shuffle' ? 'njuka-card-shuffle' : cardMotion.kind === 'discard' ? 'njuka-card-from-seat' : 'njuka-card-to-seat')}>
            <PlayingCard card={cardMotion.card} isFlipped={cardMotion.kind !== 'discard'} size="lg" className="shadow-2xl" />
          </div>
        )}
        {gameState.players.slice(1).map((player, aiIndex) => {
          const reveal = player.isWinner || gameState.gameEnded;
          return (
            <div
              key={player.id}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center"
              style={seatLayout[aiIndex]}
            >
              <div className={cn('rounded-full border bg-background/90 px-4 py-2 shadow-xl backdrop-blur',
                player.isCurrentTurn ? 'border-gold shadow-gold' : 'border-white/20', player.isWinner && 'border-emerald-400')}>
                <p className={cn('whitespace-nowrap text-xs font-bold sm:text-sm', player.isWinner ? 'text-emerald-300' : 'text-foreground')}>
                  {player.name} {player.isWinner && '✓ Finished'}
                </p>
              </div>
              <div className={cn('mt-2 flex justify-center', reveal ? 'gap-1' : '-space-x-7')}>
                {player.hand.map((card, index) => (
                  <div key={card.id} style={{ transform: `rotate(${(index - 1.5) * 5}deg)` }}>
                    <PlayingCard card={card} isFlipped={!reveal} size="ai" className="pointer-events-none" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="absolute left-1/2 top-[43%] z-20 flex -translate-x-1/2 -translate-y-1/2 items-end gap-8 sm:gap-16">
          <div className="text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-foreground/75">Deck · {gameState.deck.length}</p>
            <button type="button" onClick={onDraw} disabled={!canDraw} className="relative block h-32 w-20 disabled:cursor-not-allowed disabled:opacity-60" aria-label="Draw a card">
              <span className="absolute left-2 top-2 h-32 w-20 rounded-lg border-2 border-blue-500/60 bg-blue-950" />
              <span className="absolute left-1 top-1 h-32 w-20 rounded-lg border-2 border-blue-500/70 bg-blue-900" />
              <PlayingCard isFlipped size="lg" className={cn('absolute inset-0', canDraw && 'animate-pulse hover:shadow-gold')} />
            </button>
            {canDraw && <p className="mt-2 text-xs font-semibold text-gold">Click to draw</p>}
          </div>

          <div className="text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-foreground/75">Discard · {gameState.discardPile.length}</p>
            <div className="relative h-32 w-24">
              {discarded.length === 0 && <div className="absolute inset-0 rounded-lg border-2 border-dashed border-white/20" />}
              {discarded.map((card, index) => (
                <div key={card.id} className="absolute left-0 top-0" style={{ transform: `translate(${index * 3}px, ${index % 2 ? -3 : 3}px) rotate(${[-9, 6, -3, 10][index]}deg)` }}>
                  <PlayingCard card={card} size="lg" className="pointer-events-none" />
                </div>
              ))}
            </div>
            {canClaim && <Button onClick={onClaim} size="sm" className="mt-2 bg-emerald-600 text-white hover:bg-emerald-500">Claim & win</Button>}
          </div>
        </div>

        <div className="absolute bottom-[-5%] left-1/2 z-30 w-full max-w-xl -translate-x-1/2 text-center">
          <div className={cn('mx-auto mb-3 inline-flex rounded-full border bg-background/90 px-5 py-2 font-bold shadow-xl',
            human?.isCurrentTurn ? 'border-gold text-gold shadow-gold' : 'border-white/20 text-foreground')}>
            You
          </div>
          <div className="flex min-h-32 justify-center -space-x-5 sm:-space-x-3">
            {human?.hand.map((card: Card, index: number) => (
              <div key={card.id} className="origin-bottom transition-transform duration-200" style={{ transform: `rotate(${(index - (human.hand.length - 1) / 2) * 4}deg) translateY(${selectedCardIndex === index ? -18 : 0}px)` }}>
                <PlayingCard card={card} size="lg" onClick={canDiscard ? () => onSelectCard(index) : undefined} canSelect={canDiscard} isSelected={selectedCardIndex === index} className="shadow-2xl" />
              </div>
            ))}
          </div>
          {canDiscard && (
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button onClick={() => selectedCardIndex !== null && onDiscard(selectedCardIndex)} disabled={selectedCardIndex === null} className="bg-gradient-gold text-background">Discard selected card</Button>
              {specialPairs.map(option => <Button key={`${option.type}-${option.indices.join('-')}`} variant="outline" onClick={() => onSpecialDiscard(option)} className="border-gold/60 text-gold hover:bg-gold hover:text-background">{option.type === 'less' ? 'Less' : 'Bunx'}: discard {option.cards[0].rank}, {option.cards[1].rank}</Button>)}
            </div>
          )}
        </div>
      </section>
      {!gameState.gameStarted && !isDealing && (
        <Button onClick={onStart} className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 bg-gradient-gold px-10 py-6 text-xl font-black text-background shadow-gold">Start</Button>
      )}
    </main>
  );
};

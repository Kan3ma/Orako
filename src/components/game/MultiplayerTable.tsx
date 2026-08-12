import { Card, GameState } from '@/types/game';
import { canUseCardToWin } from '@/utils/gameLogic';
import { PlayingCard } from './PlayingCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GameSettingsDialog, NjukaSettings } from './GameSettingsDialog';
import type { SpecialPairOption } from '@/utils/gameLogic';

interface MultiplayerTableProps {
  gameState: GameState;
  localPlayerIndex: number;
  selectedCardIndex: number | null;
  onSelectCard: (index: number) => void;
  onDraw: () => void;
  onDiscard: (index: number) => void;
  onClaim: () => void;
  onRematch: () => void;
  cardMotion: { key: number; kind: 'draw' | 'discard'; card?: Card; target: 'human' | 'ai' } | null;
  roomCode: string;
  isHost: boolean;
  endCondition: 'first_winner' | 'last_two';
  onUpdateEndCondition?: (condition: 'first_winner' | 'last_two') => void;
  settings: NjukaSettings;
  onSettingsChange?: (settings: NjukaSettings) => void;
  specialPairs: SpecialPairOption[];
  onSpecialDiscard: (option: SpecialPairOption) => void;
}

export const MultiplayerTable = ({
  gameState, localPlayerIndex, selectedCardIndex, onSelectCard, onDraw, onDiscard, onClaim, onRematch, cardMotion,
  roomCode, isHost, endCondition, onUpdateEndCondition,
  settings, onSettingsChange, specialPairs, onSpecialDiscard,
}: MultiplayerTableProps) => {
  const localPlayer = gameState.players[localPlayerIndex];
  const opponents = gameState.players.filter((_, index) => index !== localPlayerIndex);
  const opponentSeats = [
    { left: '8%', top: '38%' }, { left: '25%', top: '8%' }, { left: '50%', top: '4%' },
    { left: '75%', top: '8%' }, { left: '92%', top: '38%' },
  ];
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isLocalTurn = gameState.currentPlayerIndex === localPlayerIndex;
  const canDraw = !gameState.gameEnded && isLocalTurn && localPlayer?.hand.length < 4;
  const canDiscard = !gameState.gameEnded && isLocalTurn && localPlayer?.hand.length === 4;
  const canClaim = !gameState.gameEnded && gameState.canClaim && !!gameState.lastDiscardedCard &&
    canUseCardToWin(localPlayer?.hand ?? [], gameState.lastDiscardedCard, settings.tenJackConsecutive);
  const discarded = gameState.discardPile.slice(-4);

  return (
    <main className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1500px] items-center justify-center overflow-hidden px-2 pb-4 pt-20 sm:px-8 sm:pt-16">
      <div className="absolute left-1/2 top-5 z-30 -translate-x-1/2 text-center">
        <h1 className="text-2xl font-black tracking-[0.24em] text-gold sm:text-4xl">NJUKA</h1>
        <p className="mt-1 text-sm font-semibold text-foreground/80">
          {gameState.gameEnded ? `${gameState.winner?.name ?? 'Game'} wins!` : isLocalTurn ? 'Your turn' : `${currentPlayer?.name ?? 'Opponent'}'s turn`}
        </p>
        {gameState.gameEnded && <Button onClick={onRematch} className="mt-3 bg-gradient-gold text-background shadow-gold">Rematch</Button>}
      </div>
      <div className="absolute right-4 top-4 z-40 rounded-xl border border-gold/40 bg-background/90 px-4 py-2 text-right shadow-xl sm:right-6 sm:top-6">
        <p className="text-xs uppercase tracking-wider text-foreground/60">Room code</p>
        <p className="text-xl font-black tracking-widest text-gold">{roomCode}</p>
        <div className="mt-2"><GameSettingsDialog settings={settings} onChange={onSettingsChange} showPonch isHost={isHost} endCondition={endCondition} onEndConditionChange={onUpdateEndCondition} changesApplyNextRound={!gameState.gameEnded} /></div>
      </div>

      <section className="njuka-table relative h-[68vh] min-h-[470px] w-full max-w-[1180px]">
        {cardMotion && (
          <div key={cardMotion.key} className={cn('pointer-events-none absolute left-1/2 top-[43%] z-50', cardMotion.kind === 'draw' ? 'njuka-card-draw' : 'njuka-card-discard')}>
            <PlayingCard card={cardMotion.card} isFlipped={cardMotion.kind === 'draw'} size="lg" className="shadow-2xl" />
          </div>
        )}

        {opponents.map((opponent, index) => (
          <div key={opponent.id} className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center" style={opponentSeats[index]}>
            <div className={cn('rounded-full border bg-background/90 px-4 py-2 text-sm font-bold shadow-xl', opponent.isCurrentTurn ? 'border-gold text-gold' : 'border-white/20', opponent.isWinner && 'border-emerald-400 text-emerald-300')}>
              {opponent.name} {opponent.isWinner && '✓'}
            </div>
            <div className={cn('mt-2 flex justify-center', opponent.isWinner || gameState.gameEnded ? 'gap-1' : '-space-x-8')}>
              {opponent.hand.map(card => <PlayingCard key={card.id} card={card} isFlipped={!opponent.isWinner && !gameState.gameEnded} size="ai" className="pointer-events-none" />)}
            </div>
          </div>
        ))}

        <div className="absolute left-1/2 top-[43%] z-20 flex -translate-x-1/2 -translate-y-1/2 items-end gap-8 sm:gap-16">
          <div className="text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-foreground/75">Deck · {gameState.deck.length}</p>
            <button type="button" onClick={onDraw} disabled={!canDraw} className="relative block h-32 w-20 disabled:cursor-not-allowed disabled:opacity-60">
              <span className="absolute left-2 top-2 h-32 w-20 rounded-lg border-2 border-blue-500/60 bg-blue-950" />
              <span className="absolute left-1 top-1 h-32 w-20 rounded-lg border-2 border-blue-500/70 bg-blue-900" />
              <PlayingCard isFlipped size="lg" className={cn('absolute inset-0', canDraw && 'animate-pulse hover:shadow-gold')} />
            </button>
            {canDraw && <p className="mt-2 text-xs font-semibold text-gold">Click to draw</p>}
          </div>
          <div className="text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-foreground/75">Discard · {gameState.discardPile.length}</p>
            <div className="relative h-32 w-24">
              {!discarded.length && <div className="absolute inset-0 rounded-lg border-2 border-dashed border-white/20" />}
              {discarded.map((card, index) => (
                <div key={card.id} className="absolute left-0 top-0" style={{ transform: `translate(${index * 3}px, ${index % 2 ? -3 : 3}px) rotate(${[-9, 6, -3, 10][index]}deg)` }}>
                  <PlayingCard card={card} size="lg" className="pointer-events-none" />
                </div>
              ))}
            </div>
            {canClaim && <Button onClick={onClaim} size="sm" className="mt-2 bg-emerald-600 text-white">Claim & win</Button>}
          </div>
        </div>

        <div className="absolute bottom-[-5%] left-1/2 z-30 w-full max-w-xl -translate-x-1/2 text-center">
          <div className={cn('mx-auto mb-3 inline-flex rounded-full border bg-background/90 px-5 py-2 font-bold shadow-xl', isLocalTurn ? 'border-gold text-gold' : 'border-white/20')}>
            {localPlayer?.name ?? 'You'} {isLocalTurn && !gameState.gameEnded ? '· Your turn' : ''}
          </div>
          <div className="flex min-h-32 justify-center -space-x-3">
            {localPlayer?.hand.map((card: Card, index: number) => (
              <div key={card.id} className="origin-bottom transition-transform duration-200" style={{ transform: `rotate(${(index - (localPlayer.hand.length - 1) / 2) * 4}deg) translateY(${selectedCardIndex === index ? -18 : 0}px)` }}>
                <PlayingCard card={card} size="lg" onClick={canDiscard ? () => onSelectCard(index) : undefined} canSelect={canDiscard} isSelected={selectedCardIndex === index} className="shadow-2xl" />
              </div>
            ))}
          </div>
          {canDiscard && <div className="mt-2 flex flex-wrap justify-center gap-2"><Button onClick={() => selectedCardIndex !== null && onDiscard(selectedCardIndex)} disabled={selectedCardIndex === null} className="bg-gradient-gold text-background">Discard selected card</Button>{specialPairs.map(option => <Button key={`${option.type}-${option.indices.join('-')}`} variant="outline" onClick={() => onSpecialDiscard(option)} className="border-gold/60 text-gold">{option.type === 'less' ? 'Less' : 'Bunx'}: {option.cards[0].rank}, {option.cards[1].rank}</Button>)}</div>}
        </div>
      </section>
    </main>
  );
};

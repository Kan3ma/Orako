import { Card, Player } from '@/types/game';
import { canUseCardToWin, checkWinCondition, getRankValue } from './gameLogic';

export interface AIDecision {
  action: 'draw' | 'discard' | 'claim';
  cardIndex?: number;
}

export const makeAIDecision = (
  player: Player,
  deckSize: number,
  lastDiscardedCard: Card | null,
  canClaim: boolean
): AIDecision => {
  // First priority: Check if we can claim the last discarded card to win
  if (canClaim && lastDiscardedCard && canUseCardToWin(player.hand, lastDiscardedCard)) {
    return { action: 'claim' };
  }

  // If we have more than 3 cards, we need to discard
  if (player.hand.length > 3) {
    const cardToDiscard = findBestCardToDiscard(player.hand);
    return { action: 'discard', cardIndex: cardToDiscard };
  }

  // Otherwise, draw a card
  return { action: 'draw' };
};

const findBestCardToDiscard = (hand: Card[]): number => {
  const handCopy = [...hand];
  
  // Calculate usefulness score for each card
  const cardScores = handCopy.map((card, index) => ({
    index,
    score: calculateCardUsefulness(card, handCopy)
  }));

  // Sort by score (lowest score = least useful = best to discard)
  cardScores.sort((a, b) => a.score - b.score);
  
  return cardScores[0].index;
};

const calculateCardUsefulness = (card: Card, hand: Card[]): number => {
  let score = 0;
  const cardValue = getRankValue(card.rank);

  // Check how many matching rank cards we have
  const matchingRankCards = hand.filter(c => c.rank === card.rank);
  if (matchingRankCards.length >= 2) {
    score += 10; // Very useful if we already have a pair
  }

  // Check how many consecutive cards we can form
  const consecutiveCards = hand.filter(c => {
    const otherValue = getRankValue(c.rank);
    
    // Handle J, Q, K special case
    if ([11, 12, 13].includes(cardValue) && [11, 12, 13].includes(otherValue)) {
      return true;
    }
    
    return Math.abs(cardValue - otherValue) === 1;
  });

  if (consecutiveCards.length >= 2) {
    score += 10; // Very useful if we can form consecutive pairs
  }

  // Add base value based on how "central" the card is (middle values are more versatile)
  if (cardValue >= 4 && cardValue <= 10) {
    score += 2;
  }

  // J, Q, K are flexible
  if ([11, 12, 13].includes(cardValue)) {
    score += 3;
  }

  return score;
};

export const getAIPlayerDelay = (): number => {
  // Fixed delay of 5 seconds to simulate thinking
  return 5000;
};

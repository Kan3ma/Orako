import { Card, Player } from '@/types/game';
import { canUseCardToWin, getRankValue, isConsecutive } from './gameLogic';

export interface AIDecision {
  action: 'draw' | 'discard' | 'claim';
  cardIndex?: number;
}

export const makeAIDecision = (
  player: Player,
  deckSize: number,
  lastDiscardedCard: Card | null,
  canClaim: boolean,
  tenJackConsecutive = false
): AIDecision => {
  // First priority: Check if we can claim the last discarded card to win
  if (canClaim && lastDiscardedCard && canUseCardToWin(player.hand, lastDiscardedCard, tenJackConsecutive)) {
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

export const isAIDrawCloseToWinning = (threeCardHand: Card[], drawnCard: Card, tenJackConsecutive = false): boolean => {
  if (threeCardHand.length !== 3 || canUseCardToWin(threeCardHand, drawnCard, tenJackConsecutive)) return false;

  const drawnValue = getRankValue(drawnCard.rank);

  for (let first = 0; first < threeCardHand.length; first += 1) {
    for (let second = first + 1; second < threeCardHand.length; second += 1) {
      const pairIsMatching = threeCardHand[first].rank === threeCardHand[second].rank;
      const pairIsConsecutive = isConsecutive(threeCardHand[first].rank, threeCardHand[second].rank, tenJackConsecutive);
      if (!pairIsMatching && !pairIsConsecutive) continue;

      const remainingIndex = [0, 1, 2].find(index => index !== first && index !== second)!;
      const remainingValue = getRankValue(threeCardHand[remainingIndex].rank);

      // A matching pair needs a consecutive partner for the remaining card.
      // A near miss therefore lands on the same rank or two ranks away.
      if (pairIsMatching && (drawnValue === remainingValue || Math.abs(drawnValue - remainingValue) === 2)) {
        return true;
      }

      // A consecutive pair needs a match for the remaining card. One rank on
      // either side of that card is considered close.
      if (pairIsConsecutive && Math.abs(drawnValue - remainingValue) === 1) {
        return true;
      }
    }
  }

  return false;
};

export const getAIPlayerDelay = (
  player: Player,
  nextDeckCard?: Card,
  lastDiscardedCard?: Card | null,
  canClaim = false,
  tenJackConsecutive = false
): number => {
  const canWinNow =
    (canClaim && !!lastDiscardedCard && canUseCardToWin(player.hand, lastDiscardedCard, tenJackConsecutive)) ||
    (player.hand.length === 3 && !!nextDeckCard && canUseCardToWin(player.hand, nextDeckCard, tenJackConsecutive));
  const closeAfterDraw =
    (player.hand.length === 3 && !!nextDeckCard && isAIDrawCloseToWinning(player.hand, nextDeckCard, tenJackConsecutive)) ||
    (player.hand.length === 4 && isAIDrawCloseToWinning(player.hand.slice(0, 3), player.hand[3], tenJackConsecutive));

  return canWinNow || closeAfterDraw ? 5000 : 3000;
};

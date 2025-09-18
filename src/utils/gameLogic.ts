import { Card, Rank, Suit, WinCondition, Player } from '@/types/game';

export const createDeck = (): Card[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  const deck: Card[] = [];
  
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}`
      });
    });
  });
  
  return shuffleDeck(deck);
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const getRankValue = (rank: Rank): number => {
  const rankValues: Record<Rank, number> = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13
  };
  return rankValues[rank];
};

export const isConsecutive = (rank1: Rank, rank2: Rank): boolean => {
  const val1 = getRankValue(rank1);
  const val2 = getRankValue(rank2);
  
  // Handle J, Q, K special case - they can be in any order among themselves
  if ([11, 12, 13].includes(val1) && [11, 12, 13].includes(val2)) {
    return true;
  }
  
  return Math.abs(val1 - val2) === 1;
};

export const checkWinCondition = (hand: Card[]): WinCondition => {
  const result: WinCondition = {
    consecutivePair: [],
    matchingPair: [],
    isWinning: false
  };

  if (hand.length < 4) return result;

  // Find matching pairs (same rank)
  const rankGroups: Record<string, Card[]> = {};
  hand.forEach(card => {
    if (!rankGroups[card.rank]) {
      rankGroups[card.rank] = [];
    }
    rankGroups[card.rank].push(card);
  });

  const matchingPairs = Object.values(rankGroups).filter(group => group.length >= 2);
  
  // Find consecutive pairs
  const consecutivePairs: Card[][] = [];
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      if (isConsecutive(hand[i].rank, hand[j].rank)) {
        consecutivePairs.push([hand[i], hand[j]]);
      }
    }
  }

  // Check if we have both types of pairs
  if (matchingPairs.length > 0 && consecutivePairs.length > 0) {
    result.matchingPair = matchingPairs[0].slice(0, 2);
    result.consecutivePair = consecutivePairs[0];
    result.isWinning = true;
  }

  return result;
};

export const canUseCardToWin = (hand: Card[], newCard: Card): boolean => {
  const testHand = [...hand, newCard];
  return checkWinCondition(testHand).isWinning;
};

export const dealInitialCards = (deck: Card[], numPlayers: number): { playerHands: Card[][], remainingDeck: Card[] } => {
  const playerHands: Card[][] = Array(numPlayers).fill(null).map(() => []);
  const remainingDeck = [...deck];
  
  // Deal 3 cards to each player
  for (let round = 0; round < 3; round++) {
    for (let player = 0; player < numPlayers; player++) {
      if (remainingDeck.length > 0) {
        playerHands[player].push(remainingDeck.pop()!);
      }
    }
  }
  
  return { playerHands, remainingDeck };
};

export const getSuitSymbol = (suit: Suit): string => {
  const symbols: Record<Suit, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };
  return symbols[suit];
};

export const getSuitColor = (suit: Suit): 'red' | 'black' => {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
};
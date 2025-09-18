export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isCurrentTurn: boolean;
  isWinner: boolean;
}

export interface GameState {
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  gameStarted: boolean;
  gameEnded: boolean;
  winner: Player | null;
  lastDiscardedCard: Card | null;
  canClaim: boolean;
}

export interface WinCondition {
  consecutivePair: Card[];
  matchingPair: Card[];
  isWinning: boolean;
}
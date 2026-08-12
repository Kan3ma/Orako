import { useState, useEffect } from 'react';
import { Card, Player, GameState } from '@/types/game';
import { createDeck, dealInitialCards, checkWinCondition, canUseCardToWin, getRankValue } from '@/utils/gameLogic';
import { makeAIDecision, getAIPlayerDelay } from '@/utils/aiLogic';
import { PlayingCard } from './PlayingCard';
import { PlayerHand } from './PlayerHand';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface GameRoom {
  id: string;
  room_code: string;
  host_id?: string;
  guest_id?: string | null;
  host_name: string;
  guest_name: string | null;
  game_state: GameState | null;
  status: 'waiting' | 'playing' | 'finished';
  current_turn: 'host' | 'guest';
}

interface GameBoardProps {
  players: string[];
  onGameEnd?: (winner: string) => void;
  onRematch?: () => void;
  onChangeMode?: () => void;
  onChangeOpponents?: () => void;
  isMultiplayer?: boolean;
  room?: GameRoom | null;
  isHost?: boolean;
  onUpdateGameState?: (gameState: GameState, nextTurn: 'host' | 'guest') => void;
}

export const GameBoard = ({ players, onGameEnd, onRematch, onChangeMode, onChangeOpponents, isMultiplayer = false, room, isHost, onUpdateGameState }: GameBoardProps) => {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    deck: [],
    discardPile: [],
    currentPlayerIndex: 0,
    gameStarted: false,
    gameEnded: false,
    winner: null,
    lastDiscardedCard: null,
    canClaim: false
  });

  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const localPlayerIndex = isMultiplayer ? (isHost ? 0 : 1) : gameState.currentPlayerIndex;
  const isLocalTurn = !isMultiplayer || gameState.currentPlayerIndex === localPlayerIndex;

  useEffect(() => {
    if (isMultiplayer) {
      if (room?.game_state?.players?.length) {
        setGameState(room.game_state);
      } else if (isHost && players.length === 2) {
        initializeGame();
      }
      return;
    }
    initializeGame();
  }, [players, isMultiplayer, isHost, room?.id]);

  useEffect(() => {
    if (isMultiplayer && room?.game_state?.players?.length) {
      setGameState(room.game_state);
      setSelectedCardIndex(null);
    }
  }, [isMultiplayer, room?.game_state]);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  // Handle AI player turns
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameEnded || !currentPlayer) return;
    
    const isAIPlayer = currentPlayer.name.includes('AI Player');
    if (!isAIPlayer) return;

    const delay = getAIPlayerDelay();
    const timeoutId = setTimeout(() => {
      // Get fresh state values inside the timeout
      setGameState(prevState => {
        const aiPlayer = prevState.players[prevState.currentPlayerIndex];
        if (!aiPlayer || prevState.gameEnded || !aiPlayer.name.includes('AI Player')) {
          return prevState;
        }

        const decision = makeAIDecision(
          aiPlayer,
          prevState.deck.length,
          prevState.lastDiscardedCard,
          prevState.canClaim
        );

        // Handle AI decision with fresh state
        if (decision.action === 'claim' && prevState.canClaim && prevState.lastDiscardedCard) {
          if (canUseCardToWin(aiPlayer.hand, prevState.lastDiscardedCard)) {
            const updatedPlayers = [...prevState.players];
            updatedPlayers[prevState.currentPlayerIndex] = {
              ...aiPlayer,
              hand: [...aiPlayer.hand, prevState.lastDiscardedCard],
              isWinner: true
            };

            toast({
              title: "🎉 Claimed Victory!",
              description: `${aiPlayer.name} claims the card and wins!`,
            });

            onGameEnd?.(aiPlayer.name);

            return {
              ...prevState,
              players: updatedPlayers,
              gameEnded: true,
              winner: updatedPlayers[prevState.currentPlayerIndex],
              canClaim: false
            };
          }
        }

        if (decision.action === 'draw') {
          if (prevState.deck.length === 0) {
            // Reshuffle discard pile
            return {
              ...prevState,
              deck: [...prevState.discardPile],
              discardPile: []
            };
          }

          const drawnCard = prevState.deck[prevState.deck.length - 1];

          // Check if drawing this card wins the game
          if (canUseCardToWin(aiPlayer.hand, drawnCard)) {
            const updatedPlayers = [...prevState.players];
            updatedPlayers[prevState.currentPlayerIndex] = {
              ...aiPlayer,
              hand: [...aiPlayer.hand, drawnCard],
              isWinner: true
            };

            toast({
              title: "🎉 Game Won!",
              description: `${aiPlayer.name} wins with a perfect hand!`,
            });

            onGameEnd?.(aiPlayer.name);

            return {
              ...prevState,
              players: updatedPlayers,
              deck: prevState.deck.slice(0, -1),
              gameEnded: true,
              winner: updatedPlayers[prevState.currentPlayerIndex],
              canClaim: false
            };
          }

          // Add card to AI's hand, then immediately discard
          const newHand = [...aiPlayer.hand, drawnCard];
          const cardToDiscardIndex = findBestCardToDiscard(newHand);
          const discardedCard = newHand[cardToDiscardIndex];
          const finalHand = newHand.filter((_, idx) => idx !== cardToDiscardIndex);

          const updatedPlayers = [...prevState.players];
          updatedPlayers[prevState.currentPlayerIndex] = {
            ...aiPlayer,
            hand: finalHand,
            isCurrentTurn: false
          };

          const nextPlayerIndex = (prevState.currentPlayerIndex + 1) % prevState.players.length;
          updatedPlayers[nextPlayerIndex] = {
            ...updatedPlayers[nextPlayerIndex],
            isCurrentTurn: true
          };

          // Claim window closes when next player draws from deck, not by timeout

          return {
            ...prevState,
            players: updatedPlayers,
            deck: prevState.deck.slice(0, -1),
            discardPile: [...prevState.discardPile, discardedCard],
            currentPlayerIndex: nextPlayerIndex,
            lastDiscardedCard: discardedCard,
            canClaim: true
          };
        }

        if (decision.action === 'discard' && decision.cardIndex !== undefined) {
          const discardedCard = aiPlayer.hand[decision.cardIndex];
          const newHand = aiPlayer.hand.filter((_, index) => index !== decision.cardIndex);

          const updatedPlayers = [...prevState.players];
          updatedPlayers[prevState.currentPlayerIndex] = {
            ...aiPlayer,
            hand: newHand,
            isCurrentTurn: false
          };

          const nextPlayerIndex = (prevState.currentPlayerIndex + 1) % prevState.players.length;
          updatedPlayers[nextPlayerIndex] = {
            ...updatedPlayers[nextPlayerIndex],
            isCurrentTurn: true
          };

          // Claim window closes when next player draws from deck, not by timeout

          return {
            ...prevState,
            players: updatedPlayers,
            discardPile: [...prevState.discardPile, discardedCard],
            currentPlayerIndex: nextPlayerIndex,
            lastDiscardedCard: discardedCard,
            canClaim: true
          };
        }

        return prevState;
      });
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [gameState.currentPlayerIndex, gameState.gameStarted, gameState.gameEnded, onGameEnd]);

  // Helper function for AI to find best card to discard
  const findBestCardToDiscard = (hand: Card[]): number => {
    const cardScores = hand.map((card, index) => {
      let score = 0;
      const cardValue = getRankValue(card.rank);

      // Check for matching rank cards
      const matchingRankCards = hand.filter(c => c.rank === card.rank);
      if (matchingRankCards.length >= 2) score += 10;

      // Check for consecutive cards
      const consecutiveCards = hand.filter(c => {
        const otherValue = getRankValue(c.rank);
        if ([11, 12, 13].includes(cardValue) && [11, 12, 13].includes(otherValue)) return true;
        return Math.abs(cardValue - otherValue) === 1;
      });
      if (consecutiveCards.length >= 2) score += 10;

      // Middle values are more versatile
      if (cardValue >= 4 && cardValue <= 10) score += 2;
      if ([11, 12, 13].includes(cardValue)) score += 3;

      return { index, score };
    });

    cardScores.sort((a, b) => a.score - b.score);
    return cardScores[0].index;
  };

  const initializeGame = () => {
    const deck = createDeck();
    const { playerHands, remainingDeck } = dealInitialCards(deck, players.length);
    
    const gamePlayers: Player[] = players.map((name, index) => ({
      id: `player-${index}`,
      name,
      hand: playerHands[index],
      isCurrentTurn: index === 0,
      isWinner: false
    }));

    const initialState: GameState = {
      players: gamePlayers,
      deck: remainingDeck,
      discardPile: [],
      currentPlayerIndex: 0,
      gameStarted: true,
      gameEnded: false,
      winner: null,
      lastDiscardedCard: null,
      canClaim: false
    };
    setGameState(initialState);
    if (isMultiplayer) void onUpdateGameState?.(initialState, 'host');
  };

  const saveState = (nextState: GameState, nextTurn?: 'host' | 'guest') => {
    setGameState(nextState);
    if (isMultiplayer) {
      const turn = nextTurn ?? (nextState.currentPlayerIndex === 0 ? 'host' : 'guest');
      void onUpdateGameState?.(nextState, turn);
    }
  };

  const drawCard = () => {
    if (!isLocalTurn || gameState.gameEnded) return;
    // Don't allow drawing if player already has 4 cards
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.hand.length >= 4) {
      toast({
        title: "Cannot Draw",
        description: "You must discard a card first. Maximum 4 cards allowed.",
        variant: "destructive"
      });
      return;
    }

    if (gameState.deck.length === 0) {
      // Reshuffle discard pile back into deck
      const newDeck = [...gameState.discardPile];
      const nextState = {
        ...gameState,
        deck: newDeck,
        discardPile: []
      };
      saveState(nextState);
      return;
    }

    const drawnCard = gameState.deck[gameState.deck.length - 1];
    
    // Check if drawing this card wins the game
    if (canUseCardToWin(currentPlayer.hand, drawnCard)) {
      // Player wins!
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex] = {
        ...currentPlayer,
        hand: [...currentPlayer.hand, drawnCard],
        isWinner: true
      };

      const nextState: GameState = {
        ...gameState,
        players: updatedPlayers,
        deck: gameState.deck.slice(0, -1),
        gameEnded: true,
        winner: updatedPlayers[gameState.currentPlayerIndex],
        canClaim: false
      };
      saveState(nextState);

      toast({
        title: "🎉 Game Won!",
        description: `${currentPlayer.name} wins with a perfect hand!`,
      });

      onGameEnd?.(currentPlayer.name);
      return;
    }

    // Add card to player's hand - this closes the claim window
    const updatedPlayers = [...gameState.players];
    updatedPlayers[gameState.currentPlayerIndex] = {
      ...currentPlayer,
      hand: [...currentPlayer.hand, drawnCard]
    };

    const nextState: GameState = {
      ...gameState,
      players: updatedPlayers,
      deck: gameState.deck.slice(0, -1),
      canClaim: false
    };
    saveState(nextState);
  };

  const discardCard = (cardIndex: number) => {
    if (selectedCardIndex === null || !isLocalTurn || gameState.gameEnded) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const discardedCard = currentPlayer.hand[cardIndex];
    
    // Remove card from player's hand
    const newHand = currentPlayer.hand.filter((_, index) => index !== cardIndex);
    
    const updatedPlayers = [...gameState.players];
    updatedPlayers[gameState.currentPlayerIndex] = {
      ...currentPlayer,
      hand: newHand,
      isCurrentTurn: false
    };

    // Move to next player
    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    updatedPlayers[nextPlayerIndex] = {
      ...updatedPlayers[nextPlayerIndex],
      isCurrentTurn: true
    };

    const nextState: GameState = {
      ...gameState,
      players: updatedPlayers,
      discardPile: [...gameState.discardPile, discardedCard],
      currentPlayerIndex: nextPlayerIndex,
      lastDiscardedCard: discardedCard,
      canClaim: true
    };
    saveState(nextState, nextPlayerIndex === 0 ? 'host' : 'guest');

    setSelectedCardIndex(null);
    // Claim window closes when next player draws from deck, not by timeout
  };

  const claimCard = (playerIndex: number) => {
    if (!gameState.canClaim || !gameState.lastDiscardedCard || (isMultiplayer && playerIndex !== localPlayerIndex)) return;

    const player = gameState.players[playerIndex];
    if (canUseCardToWin(player.hand, gameState.lastDiscardedCard)) {
      const updatedPlayers = [...gameState.players];
      updatedPlayers[playerIndex] = {
        ...player,
        hand: [...player.hand, gameState.lastDiscardedCard],
        isWinner: true
      };

      const nextState: GameState = {
        ...gameState,
        players: updatedPlayers,
        gameEnded: true,
        winner: updatedPlayers[playerIndex],
        canClaim: false
      };
      saveState(nextState);

      toast({
        title: "🎉 Claimed Victory!",
        description: `${player.name} claims the card and wins!`,
      });

      onGameEnd?.(player.name);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-felt p-4 pt-20 sm:pt-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="absolute left-4 top-4 border-gold/50 bg-secondary/90 text-gold hover:border-gold hover:bg-gold hover:text-background sm:left-6 sm:top-6"
          >
            Leave
          </Button>
        </DialogTrigger>
        <DialogContent className="border-border bg-secondary text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-gold">Leave this match?</DialogTitle>
            <DialogDescription className="text-foreground/70">
              Choose where you would like to go next.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 pt-2">
            <DialogClose asChild>
              <Button onClick={onChangeMode} className="bg-gradient-gold text-background">
                Return to game mode selection
              </Button>
            </DialogClose>
            {!isMultiplayer && (
              <DialogClose asChild>
                <Button
                  variant="outline"
                  onClick={onChangeOpponents}
                  className="border-gold/50 text-gold hover:bg-gold hover:text-background"
                >
                  Change number of AI opponents
                </Button>
              </DialogClose>
            )}
            <DialogClose asChild>
              <Button
                variant="outline"
                onClick={isMultiplayer ? initializeGame : (onRematch ?? initializeGame)}
                className="border-gold/50 text-gold hover:bg-gold hover:text-background"
              >
                Restart game
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
      <div className="max-w-7xl mx-auto">
        {/* Game Over Options */}
        {gameState.gameEnded && (
          <div className="flex justify-center gap-4 mb-6">
            <Button 
              onClick={isMultiplayer ? initializeGame : onRematch}
              className="bg-gradient-gold hover:bg-gold-dim text-background"
            >
              Rematch
            </Button>
            <Button 
              onClick={onChangeMode}
              variant="outline"
              className="border-gold text-gold hover:bg-gold hover:text-background"
            >
              Change Game Mode
            </Button>
          </div>
        )}

        {/* Game Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gold mb-2">NJUKA</h1>
          <p className="text-white font-semibold">
            {gameState.gameEnded 
              ? `🎉 ${gameState.winner?.name} Wins!` 
              : `${currentPlayer?.name}'s Turn`
            }
          </p>
        </div>

        {/* Center Game Area */}
        <div className="flex justify-center items-center gap-8 mb-8">
          {/* Deck */}
          <div className="text-center">
            <p className="text-white/80 mb-2 font-medium">Deck ({gameState.deck.length})</p>
            <PlayingCard 
              isFlipped 
              onClick={currentPlayer?.isCurrentTurn && isLocalTurn && !currentPlayer.name.includes('AI Player') ? drawCard : undefined}
              className={currentPlayer?.isCurrentTurn && isLocalTurn && !currentPlayer.name.includes('AI Player') ? "hover:shadow-gold cursor-pointer" : "cursor-not-allowed opacity-50"}
              size="lg"
            />
          </div>

          {/* Discard Pile */}
          <div className="text-center">
            <p className="text-white/80 mb-2 font-medium">
              Discard Pile ({gameState.discardPile.length})
              {gameState.canClaim && " - Can Claim!"}
            </p>
            <PlayingCard 
              card={gameState.discardPile[gameState.discardPile.length - 1]}
              size="lg"
              className={gameState.canClaim ? "animate-glow" : ""}
            />
          </div>
        </div>

        {/* Current Player Actions */}
        {currentPlayer?.isCurrentTurn && isLocalTurn && currentPlayer.hand.length > 3 && !currentPlayer.name.includes('AI Player') && (
          <div className="text-center mb-6">
            <p className="text-white font-medium mb-4">Select a card to discard:</p>
            <Button 
              onClick={() => selectedCardIndex !== null && discardCard(selectedCardIndex)}
              disabled={selectedCardIndex === null}
              className="bg-gradient-gold hover:bg-gold-dim text-background"
            >
              Discard Selected Card
            </Button>
          </div>
        )}

        {/* AI Player Indicator */}
        {currentPlayer?.isCurrentTurn && currentPlayer.name.includes('AI Player') && (
          <div className="text-center mb-6">
            <p className="text-white font-medium mb-4">🤖 {currentPlayer.name} is thinking...</p>
          </div>
        )}

        {/* Players */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {gameState.players.map((player, index) => (
            <PlayerHand
              key={player.id}
              player={player}
              isCurrentPlayer={index === gameState.currentPlayerIndex}
              isLocalPlayer={!isMultiplayer || index === localPlayerIndex}
              hideCards={isMultiplayer && index !== localPlayerIndex}
              onCardSelect={index === gameState.currentPlayerIndex && (!isMultiplayer || index === localPlayerIndex) && !player.name.includes('AI Player') ? setSelectedCardIndex : undefined}
              selectedCardIndex={index === gameState.currentPlayerIndex && (!isMultiplayer || index === localPlayerIndex) && !player.name.includes('AI Player') ? selectedCardIndex : null}
              onClaimCard={gameState.canClaim && (!isMultiplayer || index === localPlayerIndex) && !player.name.includes('AI Player') ? () => claimCard(index) : undefined}
              canClaim={gameState.canClaim && (!isMultiplayer || index === localPlayerIndex) && canUseCardToWin(player.hand, gameState.lastDiscardedCard!) && !player.name.includes('AI Player')}
            />
          ))}
        </div>

      </div>
    </div>
  );
};

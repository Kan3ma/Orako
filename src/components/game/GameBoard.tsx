import { useState, useEffect, useCallback } from 'react';
import { Card, Player, GameState } from '@/types/game';
import { createDeck, dealInitialCards, checkWinCondition, canUseCardToWin } from '@/utils/gameLogic';
import { makeAIDecision, getAIPlayerDelay } from '@/utils/aiLogic';
import { PlayingCard } from './PlayingCard';
import { PlayerHand } from './PlayerHand';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface GameRoom {
  id: string;
  room_code: string;
  host_name: string;
  guest_name: string | null;
  game_state: GameState | null;
  status: 'waiting' | 'playing' | 'finished';
  current_turn: 'host' | 'guest';
}

interface GameBoardProps {
  players: string[];
  onGameEnd?: (winner: string) => void;
  isMultiplayer?: boolean;
  room?: GameRoom | null;
  isHost?: boolean;
  onUpdateGameState?: (gameState: GameState, nextTurn: 'host' | 'guest') => void;
}

export const GameBoard = ({ players, onGameEnd, isMultiplayer = false, room, isHost, onUpdateGameState }: GameBoardProps) => {
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

  useEffect(() => {
    initializeGame();
  }, [players]);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  // Handle AI player turns
  useEffect(() => {
    if (gameState.gameStarted && !gameState.gameEnded && currentPlayer) {
      const isAIPlayer = currentPlayer.name.includes('AI Player');
      
      if (isAIPlayer) {
        const delay = getAIPlayerDelay();
        const timeoutId = setTimeout(() => {
          handleAITurn();
        }, delay);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [gameState.currentPlayerIndex, gameState.gameStarted, gameState.gameEnded]);

  const handleAITurn = useCallback(() => {
    if (!currentPlayer || gameState.gameEnded) return;

    const decision = makeAIDecision(
      currentPlayer, 
      gameState.deck.length, 
      gameState.lastDiscardedCard, 
      gameState.canClaim
    );

    switch (decision.action) {
      case 'draw':
        drawCard();
        break;
      case 'discard':
        if (decision.cardIndex !== undefined) {
          aiDiscardCard(decision.cardIndex);
        }
        break;
      case 'claim':
        const playerIndex = gameState.players.findIndex(p => p.id === currentPlayer.id);
        claimCard(playerIndex);
        break;
    }
  }, [currentPlayer, gameState]);

  const aiDiscardCard = (cardIndex: number) => {
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

    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      discardPile: [...prev.discardPile, discardedCard],
      currentPlayerIndex: nextPlayerIndex,
      lastDiscardedCard: discardedCard,
      canClaim: true
    }));

    // Check if any other player can claim this card to win
    setTimeout(() => {
      setGameState(prev => ({ ...prev, canClaim: false }));
    }, 3000);
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

    setGameState({
      players: gamePlayers,
      deck: remainingDeck,
      discardPile: [],
      currentPlayerIndex: 0,
      gameStarted: true,
      gameEnded: false,
      winner: null,
      lastDiscardedCard: null,
      canClaim: false
    });
  };

  const drawCard = () => {
    if (gameState.deck.length === 0) {
      // Reshuffle discard pile back into deck
      const newDeck = [...gameState.discardPile];
      setGameState(prev => ({
        ...prev,
        deck: newDeck,
        discardPile: []
      }));
      return;
    }

    const drawnCard = gameState.deck[gameState.deck.length - 1];
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // Check if drawing this card wins the game
    if (canUseCardToWin(currentPlayer.hand, drawnCard)) {
      // Player wins!
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex] = {
        ...currentPlayer,
        hand: [...currentPlayer.hand, drawnCard],
        isWinner: true
      };

      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        deck: prev.deck.slice(0, -1),
        gameEnded: true,
        winner: updatedPlayers[gameState.currentPlayerIndex],
        canClaim: false
      }));

      toast({
        title: "🎉 Game Won!",
        description: `${currentPlayer.name} wins with a perfect hand!`,
      });

      onGameEnd?.(currentPlayer.name);
      return;
    }

    // Add card to player's hand
    const updatedPlayers = [...gameState.players];
    updatedPlayers[gameState.currentPlayerIndex] = {
      ...currentPlayer,
      hand: [...currentPlayer.hand, drawnCard]
    };

    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      deck: prev.deck.slice(0, -1),
      canClaim: false
    }));
  };

  const discardCard = (cardIndex: number) => {
    if (selectedCardIndex === null) return;

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

    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      discardPile: [...prev.discardPile, discardedCard],
      currentPlayerIndex: nextPlayerIndex,
      lastDiscardedCard: discardedCard,
      canClaim: true
    }));

    setSelectedCardIndex(null);

    // Check if any other player can claim this card to win
    setTimeout(() => {
      setGameState(prev => ({ ...prev, canClaim: false }));
    }, 3000);
  };

  const claimCard = (playerIndex: number) => {
    if (!gameState.canClaim || !gameState.lastDiscardedCard) return;

    const player = gameState.players[playerIndex];
    if (canUseCardToWin(player.hand, gameState.lastDiscardedCard)) {
      const updatedPlayers = [...gameState.players];
      updatedPlayers[playerIndex] = {
        ...player,
        hand: [...player.hand, gameState.lastDiscardedCard],
        isWinner: true
      };

      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        gameEnded: true,
        winner: updatedPlayers[playerIndex],
        canClaim: false
      }));

      toast({
        title: "🎉 Claimed Victory!",
        description: `${player.name} claims the card and wins!`,
      });

      onGameEnd?.(player.name);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-felt p-4">
      <div className="max-w-7xl mx-auto">
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
              onClick={currentPlayer?.isCurrentTurn && !currentPlayer.name.includes('AI Player') ? drawCard : undefined}
              className={currentPlayer?.isCurrentTurn && !currentPlayer.name.includes('AI Player') ? "hover:shadow-gold cursor-pointer" : "cursor-not-allowed opacity-50"}
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
        {currentPlayer?.isCurrentTurn && currentPlayer.hand.length > 3 && !currentPlayer.name.includes('AI Player') && (
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
              onCardSelect={index === gameState.currentPlayerIndex && !player.name.includes('AI Player') ? setSelectedCardIndex : undefined}
              selectedCardIndex={index === gameState.currentPlayerIndex && !player.name.includes('AI Player') ? selectedCardIndex : null}
              onClaimCard={gameState.canClaim && !player.name.includes('AI Player') ? () => claimCard(index) : undefined}
              canClaim={gameState.canClaim && canUseCardToWin(player.hand, gameState.lastDiscardedCard!) && !player.name.includes('AI Player')}
            />
          ))}
        </div>

        {/* Game Controls */}
        <div className="text-center mt-8">
          <Button 
            onClick={initializeGame}
            variant="outline"
            className="border-gold text-gold hover:bg-gold hover:text-background"
          >
            New Game
          </Button>
        </div>
      </div>
    </div>
  );
};
import { useState, useEffect } from 'react';
import { Card, Player, GameState } from '@/types/game';
import { createDeck, dealInitialCards, canUseCardToWin } from '@/utils/gameLogic';
import { makeAIDecision, getAIPlayerDelay } from '@/utils/aiLogic';
import { PlayingCard } from './PlayingCard';
import { PlayerHand } from './PlayerHand';
import { ComputerTable } from './ComputerTable';
import { MultiplayerTable } from './MultiplayerTable';
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
  current_turn: string;
  player_ids?: string[];
  player_names?: string[];
  end_condition?: 'first_winner' | 'last_two';
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
  localPlayerIndex?: number;
  onUpdateGameState?: (gameState: GameState, nextTurn: number) => void;
  onUpdateEndCondition?: (condition: 'first_winner' | 'last_two') => void;
}

export const GameBoard = ({ players, onGameEnd, onRematch, onChangeMode, onChangeOpponents, isMultiplayer = false, room, isHost, localPlayerIndex: multiplayerPlayerIndex, onUpdateGameState, onUpdateEndCondition }: GameBoardProps) => {
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
  const [cardMotion, setCardMotion] = useState<{ key: number; kind: 'draw' | 'discard'; card?: Card; target: 'human' | 'ai' } | null>(null);
  const [turnPauseUntil, setTurnPauseUntil] = useState(0);
  const localPlayerIndex = isMultiplayer ? Math.max(0, multiplayerPlayerIndex ?? (isHost ? 0 : 1)) : 0;
  const isLocalTurn = !isMultiplayer || gameState.currentPlayerIndex === localPlayerIndex;

  useEffect(() => {
    if (isMultiplayer) {
      if (room?.game_state?.players?.length) {
        setGameState(room.game_state);
      } else if (isHost && players.length >= 2) {
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
  const isComputerPlayer = (player: Player | undefined) => !isMultiplayer && !!player && player.id !== 'player-0';
  const turnPaused = !isMultiplayer && Date.now() < turnPauseUntil;

  useEffect(() => {
    if (!turnPauseUntil) return;
    const remaining = turnPauseUntil - Date.now();
    if (remaining <= 0) {
      setTurnPauseUntil(0);
      return;
    }
    const timeoutId = window.setTimeout(() => setTurnPauseUntil(0), remaining);
    return () => window.clearTimeout(timeoutId);
  }, [turnPauseUntil]);

  const animateCard = (kind: 'draw' | 'discard', card?: Card, target: 'human' | 'ai' = 'human') => {
    setCardMotion({ key: Date.now(), kind, card, target });
    window.setTimeout(() => setCardMotion(null), 650);
  };

  const getNextActivePlayerIndex = (playersToCheck: Player[], fromIndex: number) => {
    for (let offset = 1; offset <= playersToCheck.length; offset += 1) {
      const candidate = (fromIndex + offset) % playersToCheck.length;
      if (!playersToCheck[candidate].isWinner) return candidate;
    }
    return 0;
  };

  const pauseBeforeNextTurn = (nextPlayerIndex: number, nextPlayers: Player[], discardedCard: Card) => {
    if (isMultiplayer) return;
    const humanCanClaim = nextPlayerIndex === 0 && canUseCardToWin(nextPlayers[0].hand, discardedCard);
    setTurnPauseUntil(Date.now() + (humanCanClaim ? 3000 : 2000));
  };

  const finishOrContinueMultiplayer = (state: GameState, winningPlayers: Player[], winnerIndex: number): GameState => {
    if (!isMultiplayer) return { ...state, players: winningPlayers, gameEnded: true, winner: winningPlayers[winnerIndex], canClaim: false };

    const activePlayers = winningPlayers.filter(player => !player.isWinner).length;
    const shouldEnd = room?.end_condition !== 'last_two' || activePlayers <= 2;
    if (shouldEnd) {
      return { ...state, players: winningPlayers, gameEnded: true, winner: winningPlayers[winnerIndex], canClaim: false };
    }

    const nextPlayerIndex = getNextActivePlayerIndex(winningPlayers, winnerIndex);
    const continuingPlayers = winningPlayers.map((player, index) => ({ ...player, isCurrentTurn: index === nextPlayerIndex }));
    return { ...state, players: continuingPlayers, currentPlayerIndex: nextPlayerIndex, gameEnded: false, winner: null, canClaim: false };
  };

  const continueAfterAIWin = (state: GameState, updatedPlayers: Player[], aiIndex: number, deck: Card[], canClaim = false): GameState => {
    const humanIsLast = updatedPlayers.slice(1).every(player => player.isWinner);
    if (humanIsLast) {
      const finalPlayers = updatedPlayers.map((player, index) => ({ ...player, isCurrentTurn: index === 0 }));
      onGameEnd?.(finalPlayers[0].name);
      return { ...state, players: finalPlayers, deck, gameEnded: true, winner: finalPlayers[0], canClaim: false };
    }

    const nextPlayerIndex = getNextActivePlayerIndex(updatedPlayers, aiIndex);
    const continuingPlayers = updatedPlayers.map((player, index) => ({ ...player, isCurrentTurn: index === nextPlayerIndex }));
    return { ...state, players: continuingPlayers, deck, currentPlayerIndex: nextPlayerIndex, gameEnded: false, winner: null, canClaim };
  };

  // Handle AI player turns
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameEnded || !currentPlayer || turnPaused) return;
    
    const isAIPlayer = isComputerPlayer(currentPlayer);
    if (!isAIPlayer) return;

    const delay = getAIPlayerDelay(
      currentPlayer,
      gameState.deck[gameState.deck.length - 1],
      gameState.lastDiscardedCard,
      gameState.canClaim
    );
    const timeoutId = setTimeout(() => {
      const previewDecision = makeAIDecision(currentPlayer, gameState.deck.length, gameState.lastDiscardedCard, gameState.canClaim);
      if (!isMultiplayer && previewDecision.action === 'draw') animateCard('draw', undefined, 'ai');
      if (!isMultiplayer && previewDecision.action === 'discard' && previewDecision.cardIndex !== undefined) {
        const previewDiscard = currentPlayer.hand[previewDecision.cardIndex];
        animateCard('discard', previewDiscard, 'ai');
        const previewNextIndex = getNextActivePlayerIndex(gameState.players, gameState.currentPlayerIndex);
        pauseBeforeNextTurn(previewNextIndex, gameState.players, previewDiscard);
      }
      // Get fresh state values inside the timeout
      setGameState(prevState => {
        const aiPlayer = prevState.players[prevState.currentPlayerIndex];
        if (!aiPlayer || prevState.gameEnded || !isComputerPlayer(aiPlayer)) {
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

            if (!isMultiplayer) {
              return continueAfterAIWin(prevState, updatedPlayers, prevState.currentPlayerIndex, prevState.deck, false);
            }
            onGameEnd?.(aiPlayer.name);
            return { ...prevState, players: updatedPlayers, gameEnded: true, winner: updatedPlayers[prevState.currentPlayerIndex], canClaim: false };
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

            const remainingDeck = prevState.deck.slice(0, -1);
            if (!isMultiplayer) {
              return continueAfterAIWin(prevState, updatedPlayers, prevState.currentPlayerIndex, remainingDeck, false);
            }
            onGameEnd?.(aiPlayer.name);
            return { ...prevState, players: updatedPlayers, deck: remainingDeck, gameEnded: true, winner: updatedPlayers[prevState.currentPlayerIndex], canClaim: false };
          }

          // Keep the fourth card visible while the AI considers its discard.
          const updatedPlayers = [...prevState.players];
          updatedPlayers[prevState.currentPlayerIndex] = {
            ...aiPlayer,
            hand: [...aiPlayer.hand, drawnCard]
          };
          return {
            ...prevState,
            players: updatedPlayers,
            deck: prevState.deck.slice(0, -1),
            canClaim: false
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

          const nextPlayerIndex = getNextActivePlayerIndex(updatedPlayers, prevState.currentPlayerIndex);
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
  }, [gameState.currentPlayerIndex, gameState.gameStarted, gameState.gameEnded, gameState.deck.length, currentPlayer?.hand.length, isMultiplayer, onGameEnd, turnPaused]);

  const initializeGame = () => {
    setTurnPauseUntil(0);
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
      const turn = nextTurn ?? nextState.currentPlayerIndex;
      void onUpdateGameState?.(nextState, turn);
    }
  };

  const drawCard = () => {
    if (!isLocalTurn || gameState.gameEnded || turnPaused) return;
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
    animateCard('draw');
    
    // Check if drawing this card wins the game
    if (canUseCardToWin(currentPlayer.hand, drawnCard)) {
      // Player wins!
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex] = {
        ...currentPlayer,
        hand: [...currentPlayer.hand, drawnCard],
        isWinner: true
      };

      const winningState: GameState = {
        ...gameState,
        players: updatedPlayers,
        deck: gameState.deck.slice(0, -1),
        canClaim: false
      };
      const nextState = finishOrContinueMultiplayer(winningState, updatedPlayers, gameState.currentPlayerIndex);
      saveState(nextState);

      toast({
        title: "🎉 Game Won!",
        description: `${currentPlayer.name} wins with a perfect hand!`,
      });

      if (!isMultiplayer || nextState.gameEnded) onGameEnd?.(currentPlayer.name);
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
    if (selectedCardIndex === null || !isLocalTurn || gameState.gameEnded || turnPaused) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const discardedCard = currentPlayer.hand[cardIndex];
    animateCard('discard', discardedCard);
    
    // Remove card from player's hand
    const newHand = currentPlayer.hand.filter((_, index) => index !== cardIndex);
    
    const updatedPlayers = [...gameState.players];
    updatedPlayers[gameState.currentPlayerIndex] = {
      ...currentPlayer,
      hand: newHand,
      isCurrentTurn: false
    };

    // Move to next player
    const nextPlayerIndex = getNextActivePlayerIndex(updatedPlayers, gameState.currentPlayerIndex);
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
    pauseBeforeNextTurn(nextPlayerIndex, updatedPlayers, discardedCard);
    saveState(nextState, nextPlayerIndex);

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

      const nextState = finishOrContinueMultiplayer(gameState, updatedPlayers, playerIndex);
      saveState(nextState);

      toast({
        title: "🎉 Claimed Victory!",
        description: `${player.name} claims the card and wins!`,
      });

      if (!isMultiplayer || nextState.gameEnded) onGameEnd?.(player.name);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-felt p-4 pt-20 sm:pt-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="absolute left-4 top-4 z-[100] border-gold/50 bg-secondary/90 text-gold hover:border-gold hover:bg-gold hover:text-background sm:left-6 sm:top-6"
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
      {!isMultiplayer ? (
        <ComputerTable
          gameState={gameState}
          selectedCardIndex={selectedCardIndex}
          onSelectCard={setSelectedCardIndex}
          onDraw={drawCard}
          onDiscard={discardCard}
          onClaim={() => claimCard(0)}
          onRematch={onRematch ?? initializeGame}
          cardMotion={cardMotion}
          turnPaused={turnPaused}
        />
      ) : (
      <>
        <MultiplayerTable
          gameState={gameState}
          localPlayerIndex={localPlayerIndex}
          selectedCardIndex={selectedCardIndex}
          onSelectCard={setSelectedCardIndex}
          onDraw={drawCard}
          onDiscard={discardCard}
          onClaim={() => claimCard(localPlayerIndex)}
          onRematch={initializeGame}
          cardMotion={cardMotion}
          roomCode={room?.room_code ?? ''}
          isHost={!!isHost}
          endCondition={room?.end_condition ?? 'first_winner'}
          onUpdateEndCondition={onUpdateEndCondition}
        />
      <div className="hidden">
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
              onClick={currentPlayer?.isCurrentTurn && isLocalTurn && !isComputerPlayer(currentPlayer) ? drawCard : undefined}
              className={currentPlayer?.isCurrentTurn && isLocalTurn && !isComputerPlayer(currentPlayer) ? "hover:shadow-gold cursor-pointer" : "cursor-not-allowed opacity-50"}
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
        {currentPlayer?.isCurrentTurn && isLocalTurn && currentPlayer.hand.length > 3 && !isComputerPlayer(currentPlayer) && (
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
        {currentPlayer?.isCurrentTurn && isComputerPlayer(currentPlayer) && (
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
              onCardSelect={index === gameState.currentPlayerIndex && (!isMultiplayer || index === localPlayerIndex) && !isComputerPlayer(player) ? setSelectedCardIndex : undefined}
              selectedCardIndex={index === gameState.currentPlayerIndex && (!isMultiplayer || index === localPlayerIndex) && !isComputerPlayer(player) ? selectedCardIndex : null}
              onClaimCard={gameState.canClaim && (!isMultiplayer || index === localPlayerIndex) && !isComputerPlayer(player) ? () => claimCard(index) : undefined}
              canClaim={gameState.canClaim && (!isMultiplayer || index === localPlayerIndex) && canUseCardToWin(player.hand, gameState.lastDiscardedCard!) && !isComputerPlayer(player)}
            />
          ))}
        </div>

      </div>
      </div>
      </>
      )}
    </div>
  );
};

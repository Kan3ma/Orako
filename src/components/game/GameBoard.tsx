import { useState, useEffect, useRef } from 'react';
import { Card, Player, GameState } from '@/types/game';
import { createDeck, dealInitialCards, canUseCardToWin, shuffleDeck, getSpecialPairOptions, SpecialPairOption } from '@/utils/gameLogic';
import { makeAIDecision, getAIPlayerDelay } from '@/utils/aiLogic';
import { PlayingCard } from './PlayingCard';
import { PlayerHand } from './PlayerHand';
import { ComputerTable } from './ComputerTable';
import { MultiplayerTable } from './MultiplayerTable';
import type { NjukaSettings } from './GameSettingsDialog';
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
  njuka_settings?: NjukaSettings;
  pending_njuka_settings?: NjukaSettings;
  pending_end_condition?: 'first_winner' | 'last_two';
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
  onUpdateNjukaSettings?: (settings: NjukaSettings) => void;
}

export const GameBoard = ({ players, onGameEnd, onRematch, onChangeMode, onChangeOpponents, isMultiplayer = false, room, isHost, localPlayerIndex: multiplayerPlayerIndex, onUpdateGameState, onUpdateEndCondition, onUpdateNjukaSettings }: GameBoardProps) => {
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
  const [cardMotion, setCardMotion] = useState<{ key: number; kind: 'draw' | 'discard' | 'deal' | 'shuffle'; card?: Card; playerIndex: number } | null>(null);
  const [turnPauseUntil, setTurnPauseUntil] = useState(0);
  const [isDealing, setIsDealing] = useState(false);
  const [computerSettings, setComputerSettings] = useState<NjukaSettings>({ less: false, bunx: false, ponch: false, tenJackConsecutive: false });
  const [nextComputerSettings, setNextComputerSettings] = useState<NjukaSettings>({ less: false, bunx: false, ponch: false, tenJackConsecutive: false });
  const [aiSpeed, setAiSpeed] = useState<1 | 2 | 3>(1);
  const motionTimerRef = useRef<number | null>(null);
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
  const activeTenJackRule = isMultiplayer ? !!room?.njuka_settings?.tenJackConsecutive : computerSettings.tenJackConsecutive;

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

  const animateCard = (kind: 'draw' | 'discard' | 'deal' | 'shuffle', card?: Card, playerIndex = gameState.currentPlayerIndex) => {
    setCardMotion({ key: Date.now(), kind, card, playerIndex });
    if (motionTimerRef.current) window.clearTimeout(motionTimerRef.current);
    const speed = isMultiplayer ? 1 : aiSpeed;
    motionTimerRef.current = window.setTimeout(() => setCardMotion(null), (kind === 'shuffle' ? 900 : 650) / speed);
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
    if (nextPlayerIndex === 0) {
      setTurnPauseUntil(0);
      return;
    }
    setTurnPauseUntil(Date.now() + 2000 / aiSpeed);
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
      gameState.canClaim,
      activeTenJackRule
    ) / aiSpeed;
    const timeoutId = setTimeout(() => {
      const previewDecision = makeAIDecision(currentPlayer, gameState.deck.length, gameState.lastDiscardedCard, gameState.canClaim, activeTenJackRule);
      if (!isMultiplayer && previewDecision.action === 'draw') animateCard('draw', undefined, gameState.currentPlayerIndex);
      if (!isMultiplayer && previewDecision.action === 'discard' && previewDecision.cardIndex !== undefined) {
        const previewDiscard = currentPlayer.hand[previewDecision.cardIndex];
        animateCard('discard', previewDiscard, gameState.currentPlayerIndex);
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
          prevState.canClaim,
          activeTenJackRule
        );

        // Handle AI decision with fresh state
        if (decision.action === 'claim' && prevState.canClaim && prevState.lastDiscardedCard) {
          if (canUseCardToWin(aiPlayer.hand, prevState.lastDiscardedCard, activeTenJackRule)) {
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
            if (!isMultiplayer) animateCard('shuffle', undefined, prevState.currentPlayerIndex);
            return {
              ...prevState,
              deck: shuffleDeck(prevState.discardPile),
              discardPile: []
            };
          }

          const drawnCard = prevState.deck[prevState.deck.length - 1];

          // Check if drawing this card wins the game
          if (canUseCardToWin(aiPlayer.hand, drawnCard, activeTenJackRule)) {
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
          const specialOptions = !isMultiplayer ? getSpecialPairOptions(aiPlayer.hand, computerSettings.less, computerSettings.bunx, activeTenJackRule) : [];
          if (specialOptions.length && prevState.deck.length) {
            const option = specialOptions[Math.floor(Math.random() * specialOptions.length)];
            const removedIds = new Set(option.cards.map(card => card.id));
            const replacement = prevState.deck[prevState.deck.length - 1];
            const nextPlayerIndex = getNextActivePlayerIndex(prevState.players, prevState.currentPlayerIndex);
            const updatedPlayers = prevState.players.map((player, index) => index === prevState.currentPlayerIndex
              ? { ...player, hand: [...player.hand.filter(card => !removedIds.has(card.id)), replacement], isCurrentTurn: false }
              : { ...player, isCurrentTurn: index === nextPlayerIndex });
            animateCard('discard', option.cards[0], prevState.currentPlayerIndex);
            window.setTimeout(() => animateCard('draw', undefined, prevState.currentPlayerIndex), 350 / aiSpeed);
            return { ...prevState, players: updatedPlayers, deck: prevState.deck.slice(0, -1), discardPile: [...prevState.discardPile, ...option.cards], currentPlayerIndex: nextPlayerIndex, lastDiscardedCard: null, canClaim: false };
          }
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
  }, [gameState.currentPlayerIndex, gameState.gameStarted, gameState.gameEnded, gameState.deck.length, currentPlayer?.hand.length, isMultiplayer, onGameEnd, turnPaused, computerSettings.less, computerSettings.bunx, aiSpeed]);

  const initializeGame = () => {
    setTurnPauseUntil(0);
    const deck = createDeck();
    const startingPlayerIndex = Math.floor(Math.random() * players.length);
    if (!isMultiplayer) {
      setGameState({
        players: players.map((name, index) => ({ id: `player-${index}`, name, hand: [], isCurrentTurn: index === startingPlayerIndex, isWinner: false })),
        deck, discardPile: [], currentPlayerIndex: startingPlayerIndex, gameStarted: false, gameEnded: false,
        winner: null, lastDiscardedCard: null, canClaim: false,
      });
      return;
    }
    const { playerHands, remainingDeck } = dealInitialCards(deck, players.length);
    const openingCard = remainingDeck[remainingDeck.length - 1];
    playerHands[startingPlayerIndex].push(openingCard);
    
    const gamePlayers: Player[] = players.map((name, index) => ({
      id: `player-${index}`,
      name,
      hand: playerHands[index],
      isCurrentTurn: index === startingPlayerIndex,
      isWinner: false
    }));

    const initialState: GameState = {
      players: gamePlayers,
      deck: remainingDeck.slice(0, -1),
      discardPile: [],
      currentPlayerIndex: startingPlayerIndex,
      gameStarted: true,
      gameEnded: false,
      winner: null,
      lastDiscardedCard: null,
      canClaim: false
    };
    setGameState(initialState);
    void onUpdateGameState?.(initialState, startingPlayerIndex);
  };

  const startComputerGame = async () => {
    if (isMultiplayer || gameState.gameStarted || !gameState.players.length) return;
    setIsDealing(true);
    setComputerSettings(nextComputerSettings);
    let dealingDeck = createDeck();
    const startingPlayerIndex = gameState.currentPlayerIndex;
    animateCard('shuffle', undefined, startingPlayerIndex);
    await new Promise(resolve => window.setTimeout(resolve, 900 / aiSpeed));
    const dealTo = async (playerIndex: number) => {
      const card = dealingDeck[dealingDeck.length - 1];
      dealingDeck = dealingDeck.slice(0, -1);
      animateCard('deal', undefined, playerIndex);
      await new Promise(resolve => window.setTimeout(resolve, 500 / aiSpeed));
      setGameState(previous => ({ ...previous, deck: dealingDeck, players: previous.players.map((player, index) => index === playerIndex ? { ...player, hand: [...player.hand, card] } : player) }));
      await new Promise(resolve => window.setTimeout(resolve, 120 / aiSpeed));
    };
    for (let round = 0; round < 3; round += 1) {
      for (let playerIndex = 0; playerIndex < gameState.players.length; playerIndex += 1) await dealTo(playerIndex);
    }
    await dealTo(startingPlayerIndex);
    setGameState(previous => ({ ...previous, deck: dealingDeck, gameStarted: true }));
    setIsDealing(false);
  };

  const saveState = (nextState: GameState, nextTurn?: number) => {
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
      if (!isMultiplayer) animateCard('shuffle', undefined, gameState.currentPlayerIndex);
      const newDeck = shuffleDeck(gameState.discardPile);
      const nextState = {
        ...gameState,
        deck: newDeck,
        discardPile: []
      };
      saveState(nextState);
      return;
    }

    const drawnCard = gameState.deck[gameState.deck.length - 1];
    animateCard('draw', undefined, gameState.currentPlayerIndex);
    
    // Check if drawing this card wins the game
    if (canUseCardToWin(currentPlayer.hand, drawnCard, activeTenJackRule)) {
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
    animateCard('discard', discardedCard, gameState.currentPlayerIndex);
    
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
    if (canUseCardToWin(player.hand, gameState.lastDiscardedCard, activeTenJackRule)) {
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

  const specialDiscard = (option: SpecialPairOption) => {
    const playerIndex = isMultiplayer ? localPlayerIndex : 0;
    if (gameState.gameEnded || gameState.currentPlayerIndex !== playerIndex || gameState.players[playerIndex].hand.length !== 4 || !gameState.deck.length) return;
    const removedIds = new Set(option.cards.map(card => card.id));
    const replacement = gameState.deck[gameState.deck.length - 1];
    option.cards.forEach(card => animateCard('discard', card, playerIndex));
    window.setTimeout(() => animateCard('draw', undefined, playerIndex), 350 / (isMultiplayer ? 1 : aiSpeed));
    const nextState: GameState = {
      ...gameState,
      players: gameState.players.map((player, index) => index === playerIndex
        ? { ...player, hand: [...player.hand.filter(card => !removedIds.has(card.id)), replacement], isCurrentTurn: false }
        : player),
      deck: gameState.deck.slice(0, -1),
      discardPile: [...gameState.discardPile, ...option.cards],
      lastDiscardedCard: null,
      canClaim: false,
    };
    const nextPlayerIndex = getNextActivePlayerIndex(nextState.players, playerIndex);
    nextState.currentPlayerIndex = nextPlayerIndex;
    nextState.players = nextState.players.map((player, index) => ({ ...player, isCurrentTurn: index === nextPlayerIndex }));
    if (!isMultiplayer && nextPlayerIndex !== 0) setTurnPauseUntil(Date.now() + 2000 / aiSpeed);
    saveState(nextState);
    setSelectedCardIndex(null);
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
          onStart={startComputerGame}
          cardMotion={cardMotion}
          turnPaused={turnPaused}
          isDealing={isDealing}
          settings={nextComputerSettings}
          onSettingsChange={settings => {
            setNextComputerSettings(settings);
            if (!gameState.gameStarted) setComputerSettings(settings);
          }}
          specialPairs={gameState.players[0] ? getSpecialPairOptions(gameState.players[0].hand, computerSettings.less, computerSettings.bunx, activeTenJackRule) : []}
          onSpecialDiscard={specialDiscard}
          aiSpeed={aiSpeed}
          onCycleAiSpeed={() => setAiSpeed(speed => speed === 3 ? 1 : (speed + 1) as 1 | 2 | 3)}
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
          endCondition={room?.pending_end_condition ?? room?.end_condition ?? 'first_winner'}
          onUpdateEndCondition={onUpdateEndCondition}
          settings={room?.pending_njuka_settings ?? room?.njuka_settings ?? { ponch: false, less: false, bunx: false, tenJackConsecutive: false }}
          onSettingsChange={onUpdateNjukaSettings}
          specialPairs={gameState.players[localPlayerIndex] ? getSpecialPairOptions(gameState.players[localPlayerIndex].hand, !!room?.njuka_settings?.less, !!room?.njuka_settings?.bunx, activeTenJackRule) : []}
          onSpecialDiscard={specialDiscard}
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
              canClaim={gameState.canClaim && (!isMultiplayer || index === localPlayerIndex) && canUseCardToWin(player.hand, gameState.lastDiscardedCard!, activeTenJackRule) && !isComputerPlayer(player)}
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

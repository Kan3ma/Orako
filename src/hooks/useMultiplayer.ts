import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameState } from '@/types/game';
import { toast } from 'sonner';

interface GameRoom {
  id: string;
  room_code: string;
  host_name: string;
  guest_name: string | null;
  game_state: GameState | null;
  status: 'waiting' | 'playing' | 'finished';
  current_turn: 'host' | 'guest';
}

const generateRoomCode = (): string => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

export const useMultiplayer = () => {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to room changes
  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${room.id}`
        },
        (payload) => {
          const newRoom = payload.new as any;
          setRoom({
            ...newRoom,
            game_state: newRoom.game_state as GameState | null
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  const createRoom = useCallback(async (hostName: string): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const roomCode = generateRoomCode();
      
      const { data, error: insertError } = await supabase
        .from('game_rooms')
        .insert({
          room_code: roomCode,
          host_name: hostName,
          status: 'waiting'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setRoom({
        ...data,
        game_state: data.game_state as unknown as GameState | null,
        status: data.status as 'waiting' | 'playing' | 'finished',
        current_turn: data.current_turn as 'host' | 'guest'
      });
      setIsHost(true);
      toast.success(`Room created! Code: ${roomCode}`);
      return roomCode;
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to create room');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const joinRoom = useCallback(async (roomCode: string, guestName: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Find the room
      const { data: existingRoom, error: findError } = await supabase
        .from('game_rooms')
        .select()
        .eq('room_code', roomCode)
        .single();

      if (findError || !existingRoom) {
        toast.error('Room not found');
        return false;
      }

      if (existingRoom.guest_name) {
        toast.error('Room is full');
        return false;
      }

      // Join the room
      const { data, error: updateError } = await supabase
        .from('game_rooms')
        .update({ 
          guest_name: guestName,
          status: 'playing'
        })
        .eq('id', existingRoom.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setRoom({
        ...data,
        game_state: data.game_state as unknown as GameState | null,
        status: data.status as 'waiting' | 'playing' | 'finished',
        current_turn: data.current_turn as 'host' | 'guest'
      });
      setIsHost(false);
      toast.success('Joined room!');
      return true;
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to join room');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateGameState = useCallback(async (gameState: GameState, nextTurn: 'host' | 'guest') => {
    if (!room?.id) return;

    try {
      await supabase
        .from('game_rooms')
        .update({ 
          game_state: gameState as any,
          current_turn: nextTurn
        })
        .eq('id', room.id);
    } catch (err: any) {
      console.error('Failed to sync game state:', err);
    }
  }, [room?.id]);

  const leaveRoom = useCallback(async () => {
    if (!room?.id) return;

    try {
      if (isHost) {
        await supabase
          .from('game_rooms')
          .delete()
          .eq('id', room.id);
      } else {
        await supabase
          .from('game_rooms')
          .update({ guest_name: null, status: 'waiting' })
          .eq('id', room.id);
      }
    } catch (err) {
      console.error('Failed to leave room:', err);
    } finally {
      setRoom(null);
      setIsHost(false);
    }
  }, [room?.id, isHost]);

  return {
    room,
    isHost,
    loading,
    error,
    createRoom,
    joinRoom,
    updateGameState,
    leaveRoom
  };
};

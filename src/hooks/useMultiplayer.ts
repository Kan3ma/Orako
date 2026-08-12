import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import type { GameState } from '@/types/game';

type RoomRow = Database['public']['Tables']['game_rooms']['Row'];

export interface GameRoom extends Omit<RoomRow, 'game_state' | 'status' | 'current_turn'> {
  game_state: GameState | null;
  status: 'waiting' | 'playing' | 'finished';
  current_turn: string;
  end_condition: 'first_winner' | 'last_two';
}

const asRoom = (row: RoomRow): GameRoom => ({
  ...row,
  game_state: row.game_state as unknown as GameState | null,
  status: row.status as GameRoom['status'],
  current_turn: row.current_turn ?? '0',
  end_condition: row.end_condition as GameRoom['end_condition'],
});

const getPlayerId = async (): Promise<string> => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user.id) return sessionData.session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) throw error ?? new Error('Could not create player identity');
  return data.user.id;
};

const generateRoomCode = () => Math.floor(10000 + Math.random() * 90000).toString();

export const useMultiplayer = () => {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!room?.id) return;

    const refreshRoom = async () => {
      const { data, error: refreshError } = await supabase
        .from('game_rooms')
        .select()
        .eq('id', room.id)
        .maybeSingle();
      if (data) {
        const refreshedRoom = asRoom(data);
        setRoom(refreshedRoom);
        if (playerId) setIsHost(refreshedRoom.host_id === playerId);
      } else if (!refreshError) {
        setRoom(null);
        setIsHost(false);
      }
    };

    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setRoom(null);
            setIsHost(false);
          } else {
            const updatedRoom = asRoom(payload.new as RoomRow);
            setRoom(updatedRoom);
            if (playerId) setIsHost(updatedRoom.host_id === playerId);
          }
        }
      )
      .subscribe();

    const refreshTimer = window.setInterval(() => { void refreshRoom(); }, 2000);

    return () => {
      window.clearInterval(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [room?.id, playerId]);

  const createRoom = useCallback(async (hostName: string): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const hostId = await getPlayerId();
      setPlayerId(hostId);
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const roomCode = generateRoomCode();
        const { data, error: insertError } = await supabase
          .from('game_rooms')
          .insert({ room_code: roomCode, host_id: hostId, host_name: hostName.trim(), player_ids: [hostId], player_names: [hostName.trim()], status: 'waiting', current_turn: '0' })
          .select()
          .single();

        if (!insertError && data) {
          setRoom(asRoom(data));
          setIsHost(true);
          toast.success(`Room created! Code: ${roomCode}`);
          return roomCode;
        }
        if (insertError?.code !== '23505') throw insertError;
      }
      throw new Error('Could not generate a unique room code');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unknown error';
      setError(message);
      toast.error(`Failed to create room: ${message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const joinRoom = useCallback(async (roomCode: string, guestName: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const joiningPlayerId = await getPlayerId();
      setPlayerId(joiningPlayerId);
      const { data, error: joinError } = await supabase.rpc('join_game_room', {
        join_code: roomCode,
        player_name: guestName.trim(),
      });
      if (joinError) throw joinError;
      if (!data?.length) {
        toast.error('Room not found, full, or no longer available');
        return false;
      }
      setRoom(asRoom(data[0]));
      setIsHost(false);
      toast.success('Joined room!');
      return true;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unknown error';
      setError(message);
      toast.error(`Failed to join room: ${message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateGameState = useCallback(async (gameState: GameState, nextTurn: number) => {
    if (!room?.id) return;
    const { error: updateError } = await supabase
      .from('game_rooms')
      .update({
        game_state: gameState as unknown as Json,
        current_turn: String(nextTurn),
        status: gameState.gameEnded ? 'finished' : 'playing',
      })
      .eq('id', room.id);
    if (updateError) toast.error('The match could not be synchronized');
  }, [room?.id]);

  const updateRoomSettings = useCallback(async (endCondition: 'first_winner' | 'last_two') => {
    if (!room?.id || !isHost) return;
    const { error: updateError } = await supabase.from('game_rooms').update({ end_condition: endCondition }).eq('id', room.id);
    if (updateError) toast.error('Room settings could not be updated');
  }, [room?.id, isHost]);

  const leaveRoom = useCallback(async () => {
    if (!room?.id) return;
    try {
      await supabase.rpc('leave_game_room', { target_room_id: room.id });
    } finally {
      setRoom(null);
      setIsHost(false);
    }
  }, [room?.id]);

  const localPlayerIndex = room && playerId ? room.player_ids.indexOf(playerId) : -1;
  return { room, isHost, localPlayerIndex, loading, error, createRoom, joinRoom, updateGameState, updateRoomSettings, leaveRoom };
};

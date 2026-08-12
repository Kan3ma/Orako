CREATE TABLE public.game_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE CHECK (room_code ~ '^[0-9]{5}$'),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  host_name TEXT NOT NULL CHECK (char_length(host_name) BETWEEN 1 AND 30),
  guest_name TEXT CHECK (guest_name IS NULL OR char_length(guest_name) BETWEEN 1 AND 30),
  game_state JSONB,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  current_turn TEXT NOT NULL DEFAULT 'host' CHECK (current_turn IN ('host', 'guest')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX game_rooms_host_id_idx ON public.game_rooms(host_id);
CREATE INDEX game_rooms_guest_id_idx ON public.game_rooms(guest_id);
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_rooms TO authenticated;

CREATE POLICY "Players can view their room" ON public.game_rooms
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = host_id OR (SELECT auth.uid()) = guest_id);

CREATE POLICY "Players can create their own room" ON public.game_rooms
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = host_id AND guest_id IS NULL AND status = 'waiting');

CREATE POLICY "Players can update their room" ON public.game_rooms
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = host_id OR (SELECT auth.uid()) = guest_id)
WITH CHECK ((SELECT auth.uid()) = host_id OR (SELECT auth.uid()) = guest_id);

CREATE POLICY "Hosts can delete their room" ON public.game_rooms
FOR DELETE TO authenticated USING ((SELECT auth.uid()) = host_id);

CREATE OR REPLACE FUNCTION public.join_game_room(join_code TEXT, player_name TEXT)
RETURNS SETOF public.game_rooms LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  RETURN QUERY UPDATE public.game_rooms
  SET guest_id = auth.uid(), guest_name = left(trim(player_name), 30), status = 'playing'
  WHERE room_code = join_code AND guest_id IS NULL AND host_id <> auth.uid() AND status = 'waiting'
  RETURNING *;
END;
$$;
REVOKE ALL ON FUNCTION public.join_game_room(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_game_room(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_game_room(target_room_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.game_rooms
  SET guest_id = NULL, guest_name = NULL, status = 'waiting', game_state = NULL, current_turn = 'host'
  WHERE id = target_room_id AND guest_id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.leave_game_room(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_game_room(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER update_game_rooms_updated_at BEFORE UPDATE ON public.game_rooms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.game_rooms REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;

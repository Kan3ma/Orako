ALTER TABLE public.game_rooms
  ADD COLUMN IF NOT EXISTS player_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS player_names TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS end_condition TEXT NOT NULL DEFAULT 'first_winner'
    CHECK (end_condition IN ('first_winner', 'last_two'));

UPDATE public.game_rooms
SET player_ids = ARRAY_REMOVE(ARRAY[host_id, guest_id], NULL),
    player_names = ARRAY_REMOVE(ARRAY[host_name, guest_name], NULL)
WHERE cardinality(player_ids) = 0;

DROP POLICY IF EXISTS "Players can view their room" ON public.game_rooms;
DROP POLICY IF EXISTS "Players can create their own room" ON public.game_rooms;
DROP POLICY IF EXISTS "Players can update their room" ON public.game_rooms;

CREATE POLICY "Players can view their room" ON public.game_rooms
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = ANY(player_ids));

CREATE POLICY "Players can create their own room" ON public.game_rooms
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = host_id
  AND player_ids = ARRAY[(SELECT auth.uid())]
  AND cardinality(player_names) = 1
  AND status = 'waiting'
);

CREATE POLICY "Players can update their room" ON public.game_rooms
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = ANY(player_ids))
WITH CHECK ((SELECT auth.uid()) = ANY(player_ids));

CREATE OR REPLACE FUNCTION public.join_game_room(join_code TEXT, player_name TEXT)
RETURNS SETOF public.game_rooms LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR char_length(trim(player_name)) NOT BETWEEN 1 AND 30 THEN
    RETURN;
  END IF;

  RETURN QUERY UPDATE public.game_rooms
  SET player_ids = array_append(player_ids, auth.uid()),
      player_names = array_append(player_names, left(trim(player_name), 30)),
      guest_id = COALESCE(guest_id, auth.uid()),
      guest_name = COALESCE(guest_name, left(trim(player_name), 30))
  WHERE room_code = join_code
    AND status IN ('waiting', 'playing')
    AND cardinality(player_ids) < 6
    AND NOT (auth.uid() = ANY(player_ids))
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_game_room(target_room_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  leaving_position INTEGER;
  leaving_is_host BOOLEAN;
  remaining_ids UUID[];
  remaining_names TEXT[];
BEGIN
  SELECT array_position(player_ids, auth.uid()), host_id = auth.uid()
  INTO leaving_position, leaving_is_host
  FROM public.game_rooms WHERE id = target_room_id;

  IF leaving_position IS NULL THEN RETURN; END IF;

  SELECT
    ARRAY(SELECT id FROM unnest(player_ids) WITH ORDINALITY AS entry(id, position) WHERE position <> leaving_position ORDER BY position),
    ARRAY(SELECT name FROM unnest(player_names) WITH ORDINALITY AS entry(name, position) WHERE position <> leaving_position ORDER BY position)
  INTO remaining_ids, remaining_names
  FROM public.game_rooms WHERE id = target_room_id;

  IF cardinality(remaining_ids) = 0 THEN
    DELETE FROM public.game_rooms WHERE id = target_room_id;
    RETURN;
  END IF;

  UPDATE public.game_rooms
  SET player_ids = remaining_ids,
      player_names = remaining_names,
      host_id = CASE WHEN leaving_is_host THEN remaining_ids[1] ELSE host_id END,
      host_name = CASE WHEN leaving_is_host THEN remaining_names[1] ELSE host_name END,
      game_state = NULL,
      status = 'waiting',
      current_turn = '0'
  WHERE id = target_room_id;
END;
$$;

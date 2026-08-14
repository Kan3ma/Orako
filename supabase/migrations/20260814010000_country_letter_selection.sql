ALTER TABLE public.country_rooms
  DROP CONSTRAINT IF EXISTS country_rooms_status_check;

ALTER TABLE public.country_rooms
  ADD CONSTRAINT country_rooms_status_check
  CHECK (status IN ('lobby','choosing','answering','review','finished'));

UPDATE public.country_rooms
SET game_state = game_state || jsonb_build_object(
  'usedLetters', COALESCE(game_state->'usedLetters', '[]'::jsonb)
)
WHERE NOT (game_state ? 'usedLetters');

CREATE OR REPLACE FUNCTION public.country_submit_answers(target_room_id UUID, player_answers JSONB)
RETURNS SETOF public.country_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  RETURN QUERY
  UPDATE public.country_rooms
  SET game_state = jsonb_set(
    jsonb_set(
      game_state,
      ARRAY['answers', auth.uid()::text],
      COALESCE(player_answers, '{}'::jsonb),
      true
    ),
    '{submitted}',
    CASE
      WHEN COALESCE(game_state->'submitted', '[]'::jsonb) ? auth.uid()::text
        THEN COALESCE(game_state->'submitted', '[]'::jsonb)
      ELSE COALESCE(game_state->'submitted', '[]'::jsonb) || to_jsonb(auth.uid()::text)
    END,
    true
  ), updated_at = now()
  WHERE id = target_room_id
    AND status = 'answering'
    AND auth.uid() = ANY(player_ids)
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.country_submit_answers(UUID, JSONB) TO authenticated;

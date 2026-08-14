CREATE TABLE IF NOT EXISTS public.country_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL UNIQUE CHECK (room_code ~ '^[0-9]{5}$'),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_ids UUID[] NOT NULL,
  player_names TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','choosing','answering','review','finished')),
  settings JSONB NOT NULL DEFAULT '{"duration":90,"rounds":5,"categories":["Boy name","Girl name","Food","Fruit","Country","Town/City"],"allowCapitalCityDuplicate":false}'::jsonb,
  game_state JSONB NOT NULL DEFAULT '{"round":0,"letter":"","letterPending":false,"usedLetters":[],"answers":{},"submitted":[],"scores":{},"totals":{},"roundScores":{},"challenges":[],"roundEndsAt":null}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.country_rooms ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.country_rooms TO authenticated;
DROP POLICY IF EXISTS "Country players view rooms" ON public.country_rooms;
DROP POLICY IF EXISTS "Country hosts create rooms" ON public.country_rooms;
DROP POLICY IF EXISTS "Country players update rooms" ON public.country_rooms;
DROP POLICY IF EXISTS "Country hosts delete rooms" ON public.country_rooms;
CREATE POLICY "Country players view rooms" ON public.country_rooms FOR SELECT TO authenticated USING (auth.uid() = ANY(player_ids));
CREATE POLICY "Country hosts create rooms" ON public.country_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id AND player_ids = ARRAY[auth.uid()]);
CREATE POLICY "Country players update rooms" ON public.country_rooms FOR UPDATE TO authenticated USING (auth.uid() = ANY(player_ids)) WITH CHECK (auth.uid() = ANY(player_ids));
CREATE POLICY "Country hosts delete rooms" ON public.country_rooms FOR DELETE TO authenticated USING (auth.uid() = host_id);

CREATE OR REPLACE FUNCTION public.join_country_room(join_code TEXT, player_name TEXT)
RETURNS SETOF public.country_rooms LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR char_length(trim(player_name)) NOT BETWEEN 1 AND 30 THEN RETURN; END IF;
  RETURN QUERY UPDATE public.country_rooms
  SET player_ids = array_append(player_ids, auth.uid()), player_names = array_append(player_names, left(trim(player_name),30)), updated_at = now()
  WHERE room_code = join_code AND status = 'lobby' AND cardinality(player_ids) < 6 AND NOT auth.uid() = ANY(player_ids)
  RETURNING *;
END; $$;

CREATE OR REPLACE FUNCTION public.leave_country_room(target_room_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pos INT; ids UUID[]; names TEXT[]; was_host BOOLEAN;
BEGIN
  SELECT array_position(player_ids,auth.uid()),host_id=auth.uid() INTO pos,was_host FROM public.country_rooms WHERE id=target_room_id;
  IF pos IS NULL THEN RETURN; END IF;
  SELECT ARRAY(SELECT x FROM unnest(player_ids) WITH ORDINALITY a(x,n) WHERE n<>pos ORDER BY n), ARRAY(SELECT x FROM unnest(player_names) WITH ORDINALITY a(x,n) WHERE n<>pos ORDER BY n) INTO ids,names FROM public.country_rooms WHERE id=target_room_id;
  IF cardinality(ids)=0 THEN DELETE FROM public.country_rooms WHERE id=target_room_id; RETURN; END IF;
  UPDATE public.country_rooms SET player_ids=ids,player_names=names,host_id=CASE WHEN was_host THEN ids[1] ELSE host_id END,updated_at=now() WHERE id=target_room_id;
END; $$;

ALTER TABLE public.country_rooms REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.country_rooms; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

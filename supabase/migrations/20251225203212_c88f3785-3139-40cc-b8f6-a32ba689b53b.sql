-- Create game_rooms table for multiplayer
CREATE TABLE public.game_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  host_name TEXT NOT NULL,
  guest_name TEXT,
  game_state JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  current_turn TEXT DEFAULT 'host',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view rooms (needed to join by code)
CREATE POLICY "Anyone can view game rooms" 
ON public.game_rooms 
FOR SELECT 
USING (true);

-- Allow anyone to create rooms
CREATE POLICY "Anyone can create game rooms" 
ON public.game_rooms 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update rooms (for joining and game moves)
CREATE POLICY "Anyone can update game rooms" 
ON public.game_rooms 
FOR UPDATE 
USING (true);

-- Allow anyone to delete rooms
CREATE POLICY "Anyone can delete game rooms" 
ON public.game_rooms 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_game_rooms_updated_at
BEFORE UPDATE ON public.game_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for game_rooms
ALTER TABLE public.game_rooms REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
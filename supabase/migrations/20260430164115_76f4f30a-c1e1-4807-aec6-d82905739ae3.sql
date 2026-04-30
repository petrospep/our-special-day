
CREATE TABLE public.rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_name TEXT NOT NULL,
  email TEXT NOT NULL,
  attending BOOLEAN NOT NULL,
  number_of_guests INTEGER NOT NULL DEFAULT 1,
  dietary_requirements TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.song_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_name TEXT NOT NULL,
  song_title TEXT NOT NULL,
  artist TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert
CREATE POLICY "Anyone can submit RSVPs"
  ON public.rsvps FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can submit song requests"
  ON public.song_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users can view submissions (admin via backend)
CREATE POLICY "Authenticated can view RSVPs"
  ON public.rsvps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can view song requests"
  ON public.song_requests FOR SELECT
  TO authenticated
  USING (true);

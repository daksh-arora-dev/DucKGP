-- Execute once in Supabase SQL Editor.
CREATE TABLE IF NOT EXISTS public.gmail_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  encrypted_refresh_token TEXT NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gmail_oauth_states (
  state_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gmail_connections, public.gmail_oauth_states FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gmail_connections, public.gmail_oauth_states TO service_role;

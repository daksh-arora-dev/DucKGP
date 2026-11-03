-- Student profile table

CREATE TABLE public.profiles (

    id UUID PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    full_name TEXT NOT NULL,

    roll_number TEXT NOT NULL UNIQUE,

    institute_email TEXT NOT NULL,

    personal_email TEXT NOT NULL,

    department TEXT NOT NULL,

    programme TEXT NOT NULL,

    year_of_study INTEGER NOT NULL
        CHECK (year_of_study BETWEEN 1 AND 7),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- Ensure institute emails are unique, regardless of case
CREATE UNIQUE INDEX profiles_institute_email_unique
ON public.profiles (LOWER(institute_email));


-- Enable Row Level Security
ALTER TABLE public.profiles
ENABLE ROW LEVEL SECURITY;


-- Students can read their own profiles
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = id);


-- Students can create their own profiles
CREATE POLICY "Users can create own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);


-- Students can update their own profiles
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);
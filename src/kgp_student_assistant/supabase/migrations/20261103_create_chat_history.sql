-- 1. Conversations table
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    title TEXT NOT NULL DEFAULT 'New Chat',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 2. Messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    conversation_id UUID NOT NULL
        REFERENCES public.conversations(id)
        ON DELETE CASCADE,

    role TEXT NOT NULL
        CHECK (role IN ('user', 'assistant')),

    content TEXT NOT NULL,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. Indexes for faster retrieval
CREATE INDEX conversations_user_idx
ON public.conversations(user_id, updated_at DESC);

CREATE INDEX messages_conversation_idx
ON public.messages(conversation_id, created_at);


-- 4. Enable security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.conversations, public.messages
FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.conversations TO authenticated;

GRANT SELECT, INSERT
ON public.messages TO authenticated;


-- 5. Conversation security policies
CREATE POLICY "Read own conversations"
ON public.conversations FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Create own conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Update own conversations"
ON public.conversations FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Delete own conversations"
ON public.conversations FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);


-- 6. Message security policies
CREATE POLICY "Read own messages"
ON public.messages FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = messages.conversation_id
        AND c.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Insert own messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = messages.conversation_id
        AND c.user_id = (SELECT auth.uid())
    )
);
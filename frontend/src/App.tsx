import { useCallback, useEffect, useRef, useState } from 'react';
import Library from './components/Library';
import {
  ArrowRight,
  BookOpenCheck,
  ChevronDown,
  CircleHelp,
  FileSearch2,
  GraduationCap,
  Layers3,
  MapPinned,
  Plus,
  Sparkles,
  Wifi,
} from 'lucide-react';

import Sidebar, { MobileMenuButton } from './components/Sidebar';
import RightRail from './components/RightRail';
import Composer from './components/Composer';
import ChatMessage from './components/ChatMessage';
import DuckMark from './components/DuckMark';
import { supabase } from './lib/supabase';

import { DEMO_MODE, sendChatMessage } from './lib/chatApi';
import { conversationTitle, createConversation } from './lib/storage';
import { loadCloudConversations, deleteCloudConversation } from './lib/chatHistory';
import type { ChatMessage as Message, Conversation } from './lib/types';
import { useAuth } from './auth/AuthProvider';

const STARTERS = [
  {
    icon: FileSearch2,
    title: 'Hunt for PYQs',
    sub: 'Find past-year papers',
    className: 'starter-yellow',
    prompt: 'Find previous-year midsem question papers for CH21207',
  },
  {
    icon: BookOpenCheck,
    title: 'Crack a concept',
    sub: 'Make the tricky stuff click',
    className: 'starter-lavender',
    prompt: 'Explain how convolutional neural networks work using a simple analogy',
  },
  {
    icon: MapPinned,
    title: 'Campus radar',
    sub: 'Explore the KGP universe',
    className: 'starter-coral',
    prompt: 'Which classrooms are free today at 3 PM?',
  },
  {
    icon: Layers3,
    title: 'Plan my week',
    sub: 'Less chaos, more clarity',
    className: 'starter-mint',
    prompt: 'Help me organize my study timetable for this week',
  },
];


function Welcome({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-top-label">
        <span className="label-cross">✳</span> A LITTLE BRAINS. A LOT OF WING.
      </div>

      <div className="welcome-hero">
        <div className="welcome-copy">
          <div className="hello-line">
            Oh hey, fellow KGPian! <span className="handwave">✳</span>
          </div>
          <h1>
            Let's hatch
            <br />
            <span>something</span> <em>great.</em>
          </h1>
          <p>
            Meet your campus co-pilot. Part study buddy, part question hunter,
            fully powered by curiosity.
          </p>
          <div className="welcome-signature">
            <div className="signature-dots">
              <i />
              <i />
              <i />
            </div>
            <span>MADE FOR THE CURIOUS MINDS OF IIT KGP</span>
          </div>
        </div>

        <div className="welcome-mascot-area" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <span className="orbit-cross orbit-cross-one">+</span>
          <span className="orbit-cross orbit-cross-two">✳</span>
          <div className="mascot-glow" />
          <div className="mascot-main">
            <DuckMark size={206} animated />
          </div>
          <div className="mascot-chip chip-brain">
            <Sparkles size={13} />
            <span>
              IDEAS <strong>ON</strong>
            </span>
          </div>
          <div className="mascot-chip chip-quack">
            <span>QUACK!_</span>
            <i />
          </div>
          <div className="mascot-decoration">DUCK ENGINE / v1.0</div>
        </div>
      </div>

      <div className="starters-heading">
        <div>
          <span className="dash-yellow" /> SOMEWHERE TO START
        </div>
        <span>01 — 04 / PICK YOUR ADVENTURE</span>
      </div>

      <div className="starters-grid">
        {STARTERS.map(({ icon: Icon, title, sub, className, prompt }, index) => (
          <button
            key={title}
            className={`starter-card ${className}`}
            onClick={() => onSelect(prompt)}
          >
            <div className="starter-top">
              <span className="starter-icon">
                <Icon size={23} strokeWidth={1.8} />
              </span>
              <span className="starter-index">
                0{index + 1} <ArrowRight size={15} />
              </span>
            </div>
            <strong>{title}</strong>
            <p>{sub}</p>
          </button>
        ))}
      </div>

      <div className="welcome-bottom-note">
        <div className="mini-circle">✳</div>
        <span>JUST TYPE SOMETHING BELOW. I'VE GOT YOU.</span>
        <span className="note-arrow">↙</span>
      </div>
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="chat-message message-assistant loading-message">
      <div className="message-avatar assistant-avatar">
        <DuckMark size={36} />
      </div>
      <div className="message-body">
        <div className="message-meta">
          <span>DucKGP</span>
          <span className="message-spark">
            <Sparkles size={12} />
          </span>
        </div>
        <div className="typing-pill">
          <span />
          <span />
          <span />
          <span className="typing-label">hatching a thought</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {

  const [showLibrary, setShowLibrary] = useState(false);

  const handleSignOut = async () => {

  const { error } = await supabase.auth.signOut({
    scope: 'local',
  });

  if (error) {
    console.error('Logout failed:', error.message);
  }
};

  const { session, loading } = useAuth();
  // Conversation and UI state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historyRetry, setHistoryRetry] = useState(0);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [suggestedText, setSuggestedText] = useState('');

  // References to DOM elements and the in-flight chat request
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const chatViewportRef = useRef<HTMLDivElement | null>(null);

  const activeConversation =
    conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0];
  const activeId = activeConversation?.id;
  const messages = activeConversation?.messages ?? [];


  // Load the signed-in user's conversations from Supabase.
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError('');

    async function loadHistory() {
      try {
        const saved = await loadCloudConversations(userId!);
        if (cancelled) return;
        const next = saved.length ? saved : [createConversation()];
        setConversations(next);
        setSelectedId(next[0].id);
      } catch (error) {
        if (cancelled) return;
        setHistoryError(error instanceof Error ? error.message : 'Could not load chats');
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    void loadHistory();
    return () => { cancelled = true; };
  }, [session?.user.id, historyRetry]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isBusy, selectedId]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsBusy(false);
  }, []);

  const newChat = useCallback(() => {
    cancel();
    setSidebarOpen(false);
    setSuggestedText('');

    const empty = conversations.find((conversation) => conversation.messages.length === 0);

    if (empty) {
      setSelectedId(empty.id);
    } else {
      const fresh = createConversation();
      setConversations((previous) => [fresh, ...previous]);
      setSelectedId(fresh.id);
    }

    window.setTimeout(() => composerRef.current?.focus(), 30);
  }, [cancel, conversations]);

  const changeChat = useCallback(
    (id: string) => {
      cancel();
      setSidebarOpen(false);
      setSelectedId(id);
    },
    [cancel],
  );

  const deleteChat = useCallback(async (id: string) => {
    cancel();
    try {
      await deleteCloudConversation(id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not delete chat');
      return;
    }

    const remaining = conversations.filter((chat) => chat.id !== id);
    const next = remaining.length ? remaining : [createConversation()];
    setConversations(next);
    if (id === selectedId || !next.some((chat) => chat.id === selectedId)) {
      setSelectedId(next[0].id);
    }
  }, [cancel, conversations, selectedId]);

  const send = useCallback(
    async (content: string) => {
      if (historyLoading || isBusy || !content.trim() || !activeId) return;

      const conversationId = activeId;
      const controller = new AbortController();
      abortRef.current = controller;

      const outgoing: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
        createdAt: Date.now(),
      };

      const previousMessages = activeConversation?.messages ?? [];

      // Display the user's message immediately, before the API responds.
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                title:
                  conversation.messages.length === 0
                    ? conversationTitle(content)
                    : conversation.title,
                messages: [...conversation.messages, outgoing],
                updatedAt: Date.now(),
              }
            : conversation,
        ),
      );

      setIsBusy(true);

      try {
        const result = await sendChatMessage(
          outgoing.content,
          conversationId,
          previousMessages,
          controller.signal,
        );

        if (controller.signal.aborted) return;

        const incoming: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.reply,
          createdAt: Date.now(),
          toolsUsed: result.toolsUsed,
          sources: result.sources,
        };

        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  messages: [...conversation.messages, incoming],
                  updatedAt: Date.now(),
                }
              : conversation,
          ),
        );
      } catch (error) {
        if (controller.signal.aborted) return;

        const detail = error instanceof Error ? error.message : 'Unexpected error';
        const failed: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I couldn't complete that request. **${detail}**\n\nCheck that your FastAPI backend is running and that its chat route is configured.`,
          createdAt: Date.now(),
          error: true,
        };

        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  messages: [...conversation.messages, failed],
                  updatedAt: Date.now(),
                }
              : conversation,
          ),
        );
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsBusy(false);
        }
      }
    },
    [historyLoading, isBusy, activeId, activeConversation],
  );

  // Keyboard shortcuts: Ctrl/Cmd+K to focus; Ctrl/Cmd+Shift+O for a new chat.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        composerRef.current?.focus();
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === 'o'
      ) {
        event.preventDefault();
        newChat();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [newChat]);

  const suggest = (text: string) => {
    // Right-rail shortcuts fill the composer; starter cards send immediately.
    setSuggestedText(text);
    window.setTimeout(() => composerRef.current?.focus(), 30);
  };

  const currentTitle = messages.length ? activeConversation?.title : 'Command center';

  if (historyLoading) {
    return <div className="auth-page">Loading your conversations...</div>;
  }

  if (historyError) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="auth-error">{historyError}</p>
          <button onClick={() => setHistoryRetry((n) => n + 1)}>Retry</button>
        </div>
      </div>
    );
  }

  if (showLibrary) {
  return (
    <Library
      onBack={() => setShowLibrary(false)}
    />
  );
}

  return (
    <div className="app-frame">
      <Sidebar
        conversations={conversations}
        selectedId={activeId ?? ''}
        open={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={changeChat}
        onNew={newChat}
        onDelete={deleteChat}
      />

      <main className="main-panel">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />

        <header className="main-header">
          <div className="header-left">
            <MobileMenuButton onClick={() => setSidebarOpen(true)} />
            <span className="header-location">
              <GraduationCap size={17} />
              <span>CAMPUS</span>
              <span className="slash">/</span>
              <strong>{currentTitle}</strong>
            </span>
          </div>

          <div className="header-right">
            <span>
              {loading
                ? 'Checking login...'
                : session
                  ? `Signed in: ${session.user.email}`
                  : 'Not signed in'}
            </span>
            <button
              type="button"
              className="auth-logout"
              onClick={handleSignOut}
            >
              Logout
            </button>
            <button
            type="button"
            className="library-open"
            onClick={() => setShowLibrary(true)}
            >
              My Library
            </button>
            <span className={`mode-badge ${DEMO_MODE ? 'demo-badge' : 'api-badge'}`}>
              <span className="status-led" />
              {DEMO_MODE ? 'DESIGN PREVIEW' : 'LIVE API MODE'}
            </span>
            <button
              className="header-help"
              title="About DucKGP"
              aria-label="About DucKGP"
              onClick={() => suggest('What can DucKGP help me with?')}
            >
              <CircleHelp size={17} />
            </button>
          </div>
        </header>

        <div
          className={`main-scroll ${messages.length ? 'is-chatting' : 'is-welcome'}`}
          ref={chatViewportRef}
        >
          {messages.length === 0 ? (
            <Welcome onSelect={send} />
          ) : (
            <div className="conversation-view">
              <div className="conversation-top">
                <span className="conversation-kicker">
                  SESSION / <span>{activeId?.slice(0, 8).toUpperCase()}</span>
                </span>
                <div className="conversation-title-row">
                  <h2>{activeConversation?.title}</h2>
                  <span>
                    <ChevronDown size={15} /> OPEN SESSION
                  </span>
                </div>
                <p>One question at a time, one bright idea after another.</p>
              </div>

              <div className="message-list">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {isBusy && <LoadingMessage />}
              </div>
              <div ref={endRef} className="end-marker" />
            </div>
          )}
        </div>

        <Composer
          onSend={send}
          onStop={cancel}
          busy={isBusy}
          focusRef={composerRef}
          suggestedText={suggestedText}
          onSuggestionApplied={() => setSuggestedText('')}
        />

        <div className="main-edge-ornament">
          <span>✳</span> CURIOUS / CAPABLE / QUACKABLE <span>✳</span>
        </div>
      </main>

      <RightRail onPrompt={suggest} />

      <button
        className="new-chat-floating"
        onClick={newChat}
        title="New conversation"
        aria-label="New conversation"
      >
        <Plus size={22} />
      </button>

      <div className="screen-reader" aria-live="polite">
        {DEMO_MODE ? 'Demo mode: answers are simulated' : 'Live API mode'}
      </div>

      <div className="version-corner">
        <Wifi size={12} /> DUCKSYSTEM · 1.0 <ArrowRight size={12} />
      </div>
    </div>
  );
}

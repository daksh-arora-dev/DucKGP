import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, FileSearch2, Inbox, Sparkles, UserRound, Wifi, WifiOff, X } from 'lucide-react';
import Sidebar, { MobileMenuButton } from './components/Sidebar';
import Composer from './components/Composer';
import ChatMessage from './components/ChatMessage';
import DuckMark from './components/DuckMark';
import DuckyScene from './components/DuckyScene';
import Library from './components/Library';
import GmailConnect from './components/GmailConnect';
import { useAuth } from './auth/AuthProvider';
import { supabase } from './lib/supabase';
import { sendChatMessage } from './lib/chatApi';
import { loadCloudConversations, deleteCloudConversation } from './lib/chatHistory';
import { conversationTitle, createConversation } from './lib/storage';
import type { ChatMessage as Message, Conversation } from './lib/types';

type View = 'chat' | 'library' | 'gmail' | 'account';
type ApiStatus = 'checking' | 'online' | 'offline';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

function LoadingMessage() {
  return (
    <div className="chat-message message-assistant loading-message" role="status" aria-label="DucKGP is thinking">
      <div className="message-avatar assistant-avatar"><DuckMark size={34}/></div>
      <div className="message-body">
        <div className="message-meta"><span>DucKGP</span><span className="message-spark"><Sparkles size={14}/></span></div>
        <div className="typing-pill"><i/><i/><i/><span>hatching an answer</span></div>
      </div>
    </div>
  );
}

function Welcome({
  onPrompt,
  onLibrary,
  onGmail,
}: {
  onPrompt: (prompt: string) => void;
  onLibrary: () => void;
  onGmail: () => void;
}) {
  return (
    <div className="welcome-screen">
      <div className="hero-layout">
        <div className="welcome-copy">
          <div className="eyebrow"><span className="eyebrow-dot"/> HI, KGPian. I'M DUCK.</div>
          <h1>Your campus,<br/><em>a little lighter.</em></h1>
          <p>Big questions, small worries. I'll help you figure things out, one quack at a time.</p>
          <div className="hero-stamp"><Sparkles size={15}/> Your tiny, mighty campus sidekick.</div>
        </div>
        <DuckyScene />
      </div>
      <div className="quick-starts">
        <div className="quick-title"><span>WHERE TO?</span><span className="quick-title-line" /></div>
        <div className="quick-grid">
          <button type="button" className="quick-card" onClick={() => onPrompt('Find CH21207 Fluid Mechanics previous-year midsem papers')}>
            <span className="quick-icon"><FileSearch2 size={19}/></span>
            <span className="quick-copy"><strong>Find question papers</strong><small>Look up a PYQ</small></span>
            <ArrowRight size={16}/>
          </button>
          <button type="button" className="quick-card" onClick={onLibrary}>
            <span className="quick-icon"><BookOpen size={19}/></span>
            <span className="quick-copy"><strong>Open my library</strong><small>Files & shared notes</small></span>
            <ArrowRight size={16}/>
          </button>
          <button type="button" className="quick-card" onClick={onGmail}>
            <span className="quick-icon"><Inbox size={19}/></span>
            <span className="quick-copy"><strong>Connect my inbox</strong><small>Gmail integration</small></span>
            <ArrowRight size={16}/>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const email = session?.user.email;
  const [view, setView] = useState<View>('chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historyRetry, setHistoryRetry] = useState(0);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [suggestedText, setSuggestedText] = useState('');
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');
  const [profileName, setProfileName] = useState('');
  const [signOutError, setSignOutError] = useState('');

  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = conversations.find((c) => c.id === selectedId) ?? conversations[0];
  const activeId = activeConversation?.id;
  const messages = activeConversation?.messages ?? [];

  // Fetch the signed-in student's actual chat history; do not read global localStorage chats.
  useEffect(() => {
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
        if (!cancelled) setHistoryError(error instanceof Error ? error.message : 'Could not load chat history.');
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }
    void loadHistory();
    return () => { cancelled = true; };
  }, [userId, historyRetry]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function loadName() {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', userId);
      if (!cancelled && data?.[0]?.full_name) setProfileName(String(data[0].full_name));
    }
    void loadName();
    return () => { cancelled = true; };
  }, [userId]);

  // Display a real backend status rather than a hardcoded 'live' label.
  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const result = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
        if (mounted) setApiStatus(result.ok ? 'online' : 'offline');
      } catch {
        if (mounted) setApiStatus('offline');
      }
    }
    void check();
    const timer = window.setInterval(() => { void check(); }, 45_000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.length, isBusy, selectedId]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsBusy(false);
  }, []);

  const newChat = useCallback(() => {
    cancel();
    setView('chat');
    setSidebarOpen(false);
    setSuggestedText('');
    const empty = conversations.find((c) => c.messages.length === 0);
    if (empty) setSelectedId(empty.id);
    else {
      const fresh = createConversation();
      setConversations((previous) => [fresh, ...previous]);
      setSelectedId(fresh.id);
    }
    window.setTimeout(() => composerRef.current?.focus(), 50);
  }, [cancel, conversations]);

  const selectChat = useCallback((id: string) => {
    cancel();
    setSelectedId(id);
    setView('chat');
    setSidebarOpen(false);
  }, [cancel]);

  const deleteChat = useCallback(async (id: string) => {
    cancel();
    try {
      // Never delete a remote chat that hasn't been persisted.
      const conversation = conversations.find((c) => c.id === id);
      if (conversation?.messages.length) await deleteCloudConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      const next = remaining.length ? remaining : [createConversation()];
      setConversations(next);
      if (selectedId === id || !next.some((c) => c.id === selectedId)) setSelectedId(next[0].id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not delete this chat.');
    }
  }, [cancel, conversations, selectedId]);

  const send = useCallback(async (content: string) => {
    if (historyLoading || isBusy || !content.trim() || !activeId) return;
    const conversationId = activeId;
    const controller = new AbortController();
    abortRef.current = controller;
    const outgoing: Message = { id: crypto.randomUUID(), role: 'user', content: content.trim(), createdAt: Date.now() };
    const previousMessages = activeConversation?.messages ?? [];
    setConversations((current) => current.map((chat) => chat.id === conversationId ? {
      ...chat,
      title: chat.messages.length === 0 ? conversationTitle(content) : chat.title,
      messages: [...chat.messages, outgoing],
      updatedAt: Date.now(),
    } : chat));
    setIsBusy(true);
    setView('chat');
    try {
      const result = await sendChatMessage(outgoing.content, conversationId, previousMessages, controller.signal);
      if (controller.signal.aborted) return;
      const incoming: Message = {
        id: crypto.randomUUID(), role: 'assistant', content: result.reply, createdAt: Date.now(),
        toolsUsed: result.toolsUsed, sources: result.sources,
      };
      setConversations((current) => current.map((chat) => chat.id === conversationId
        ? { ...chat, messages: [...chat.messages, incoming], updatedAt: Date.now() }
        : chat));
    } catch (error) {
      if (controller.signal.aborted) return;
      const detail = error instanceof Error ? error.message : 'Unexpected error';
      const failed: Message = {
        id: crypto.randomUUID(), role: 'assistant', createdAt: Date.now(), error: true,
        content: `Something went wrong: **${detail}**\n\nPlease check your connection and try again.`,
      };
      setConversations((current) => current.map((chat) => chat.id === conversationId
        ? { ...chat, messages: [...chat.messages, failed], updatedAt: Date.now() }
        : chat));
    } finally {
      if (abortRef.current === controller) { abortRef.current = null; setIsBusy(false); }
    }
  }, [historyLoading, isBusy, activeId, activeConversation]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setView('chat');
        composerRef.current?.focus();
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        newChat();
      }
      if (event.key === 'Escape') setView('chat');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [newChat]);

  function show(viewName: View) { setView(viewName); setSidebarOpen(false); }
  async function signOut() {
    setSignOutError('');
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) { setSignOutError(error.message); setView('account'); }
  }

  if (historyLoading) return <div className="app-loading"><DuckMark size={76} animated /><p>Unpacking your conversations...</p></div>;
  if (historyError) return (
    <div className="app-loading"><DuckMark size={76}/><p>{historyError}</p><button type="button" className="action-button" onClick={() => setHistoryRetry((n) => n + 1)}>Try again</button></div>
  );

  if (view === 'library') return <Library onBack={() => setView('chat')}/>;

  return (
    <div className="app-frame">
      <Sidebar
        conversations={conversations} selectedId={activeId ?? ''} open={isSidebarOpen}
        onClose={() => setSidebarOpen(false)} onSelect={selectChat} onNew={newChat}
        onChat={() => show('chat')} onDelete={(id) => { void deleteChat(id); }} onLibrary={() => show('library')}
        onGmail={() => show('gmail')} onAccount={() => show('account')}
        onSignOut={() => { void signOut(); }} email={email}
      />
      <main className="main-panel">
        <div className="ambient ambient-one" aria-hidden="true"/>
        <div className="ambient ambient-two" aria-hidden="true"/>
        <header className="main-header">
          <div className="header-left">
            <MobileMenuButton onClick={() => setSidebarOpen(true)}/>
            <span className="header-location"><span className="header-star">✳</span><span>MY DUCK SPACE</span><span className="slash">/</span><strong>{messages.length ? activeConversation?.title : 'Home'}</strong></span>
          </div>
          <div className="header-right">
            <span className={`connection-badge is-${apiStatus}`} title={`FastAPI: ${apiStatus}`}>
              {apiStatus === 'offline' ? <WifiOff size={13}/> : <Wifi size={13}/>}
              <span>{apiStatus === 'online' ? 'All systems go' : apiStatus === 'checking' ? 'Connecting...' : 'Backend offline'}</span>
            </span>
            <button type="button" className="topbar-icon" title="Open library" aria-label="Open library" onClick={() => show('library')}><BookOpen size={18}/></button>
            <button type="button" className="topbar-icon" title="Gmail connections" aria-label="Gmail connections" onClick={() => show('gmail')}><Inbox size={18}/></button>
            <button type="button" className="topbar-avatar" title="My account" aria-label="My account" onClick={() => show('account')}><UserRound size={17}/></button>
          </div>
        </header>

        <div className={`main-scroll ${messages.length ? 'is-chatting' : 'is-welcome'}`}>
          {messages.length === 0 ? (
            <Welcome onPrompt={(prompt) => { void send(prompt); }} onLibrary={() => show('library')} onGmail={() => show('gmail')}/>
          ) : (
            <div className="conversation-view">
              <div className="conversation-top">
                <span className="conversation-kicker">DUCK TALK / {activeId?.slice(0, 8).toUpperCase()}</span>
                <div className="conversation-title-row"><h2>{activeConversation?.title}</h2></div>
                <p>Thinking together, one message at a time.</p>
              </div>
              <div className="message-list">
                {messages.map((message) => <ChatMessage key={message.id} message={message}/>)}
                {isBusy && <LoadingMessage/>}
              </div>
              <div ref={endRef} className="end-marker"/>
            </div>
          )}
        </div>
        <Composer
          onSend={(content) => { void send(content); }} onStop={cancel} busy={isBusy}
          focusRef={composerRef} suggestedText={suggestedText}
          onSuggestionApplied={() => setSuggestedText('')}
        />
      </main>

      {(view === 'gmail' || view === 'account') && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setView('chat'); }}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-label={view === 'gmail' ? 'Gmail connection' : 'My account'}>
            <button type="button" className="modal-close" onClick={() => setView('chat')} aria-label="Close dialog"><X size={18}/></button>
            <div className="modal-symbol">{view === 'gmail' ? <Inbox size={23}/> : <UserRound size={23}/>}</div>
            {view === 'gmail' ? (
              <>
                <p className="modal-eyebrow">YOUR CONNECTIONS</p>
                <h2>Gmail, meet DucKGP.</h2>
                <p>Connect your inbox to let the assistant search and summarize your mail when you ask. You stay in control.</p>
                <GmailConnect />
              </>
            ) : (
              <>
                <p className="modal-eyebrow">YOUR SPACE</p>
                <h2>{profileName || 'My account'}</h2>
                <p>{email || 'Signed in to DucKGP'}</p>
                {signOutError && <p role="alert" className="auth-error">{signOutError}</p>}
                <button type="button" className="action-button" onClick={() => { void signOut(); }}>Sign out <ArrowRight size={16}/></button>
              </>
            )}
            <button type="button" className="modal-back" onClick={() => setView('chat')}><ArrowLeft size={15}/> Back to chat</button>
          </section>
        </div>
      )}
    </div>
  );
}

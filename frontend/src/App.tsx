import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight, BookOpenCheck, ChevronDown, CircleHelp, FileSearch2, GraduationCap,
  Layers3, MapPinned, Plus, Sparkles, Wifi,
} from 'lucide-react';
import Sidebar, { MobileMenuButton } from './components/Sidebar';
import RightRail from './components/RightRail';
import Composer from './components/Composer';
import ChatMessage from './components/ChatMessage';
import DuckMark from './components/DuckMark';
import { DEMO_MODE, sendChatMessage } from './lib/chatApi';
import { conversationTitle, createConversation, loadConversations, saveConversations } from './lib/storage';
import type { ChatMessage as Message, Conversation } from './lib/types';

const STARTERS = [
  { icon: FileSearch2, title: 'Hunt for PYQs', sub: 'Find past-year papers', className: 'starter-yellow', prompt: 'Find previous-year midsem question papers for CH21207' },
  { icon: BookOpenCheck, title: 'Crack a concept', sub: 'Make the tricky stuff click', className: 'starter-lavender', prompt: 'Explain how convolutional neural networks work using a simple analogy' },
  { icon: MapPinned, title: 'Campus radar', sub: 'Explore the KGP universe', className: 'starter-coral', prompt: 'Which classrooms are free today at 3 PM?' },
  { icon: Layers3, title: 'Plan my week', sub: 'Less chaos, more clarity', className: 'starter-mint', prompt: 'Help me organize my study timetable for this week' },
];

function initialConversations(): Conversation[] {
  const saved = loadConversations();
  return saved.length > 0 ? saved : [createConversation()];
}

function Welcome({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-top-label"><span className="label-cross">✳</span> A LITTLE BRAINS. A LOT OF WING.</div>
      <div className="welcome-hero">
        <div className="welcome-copy">
          <div className="hello-line">Oh hey, fellow KGPian! <span className="handwave">✳</span></div>
          <h1>Let's hatch<br /><span>something</span> <em>great.</em></h1>
          <p>Meet your campus co-pilot. Part study buddy, part question hunter, fully powered by curiosity.</p>
          <div className="welcome-signature"><div className="signature-dots"><i /><i /><i /></div><span>MADE FOR THE CURIOUS MINDS OF IIT KGP</span></div>
        </div>
        <div className="welcome-mascot-area" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
          <span className="orbit-cross orbit-cross-one">+</span><span className="orbit-cross orbit-cross-two">✳</span>
          <div className="mascot-glow" />
          <div className="mascot-main"><DuckMark size={206} animated /></div>
          <div className="mascot-chip chip-brain"><Sparkles size={13} /><span>IDEAS <strong>ON</strong></span></div>
          <div className="mascot-chip chip-quack"><span>QUACK!_</span><i /></div>
          <div className="mascot-decoration">DUCK ENGINE / v1.0</div>
        </div>
      </div>

      <div className="starters-heading"><div><span className="dash-yellow" /> SOMEWHERE TO START</div><span>01 — 04 / PICK YOUR ADVENTURE</span></div>
      <div className="starters-grid">
        {STARTERS.map(({ icon: Icon, title, sub, className, prompt }, index) => (
          <button className={`starter-card ${className}`} onClick={() => onSelect(prompt)} key={title}>
            <div className="starter-top"><span className="starter-icon"><Icon size={23} strokeWidth={1.8} /></span><span className="starter-index">0{index + 1} <ArrowRight size={15} /></span></div>
            <strong>{title}</strong><p>{sub}</p>
          </button>
        ))}
      </div>
      <div className="welcome-bottom-note"><div className="mini-circle">✳</div><span>JUST TYPE SOMETHING BELOW. I'VE GOT YOU.</span><span className="note-arrow">↙</span></div>
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="chat-message message-assistant loading-message">
      <div className="message-avatar assistant-avatar"><DuckMark size={36} /></div>
      <div className="message-body"><div className="message-meta"><span>DucKGP</span><span className="message-spark"><Sparkles size={12} /></span></div><div className="typing-pill"><span /><span /><span /><span className="typing-label">hatching a thought</span></div></div>
    </div>
  );
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState(() => loadConversations()[0]?.id || '');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [suggestedText, setSuggestedText] = useState('');
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const chatViewportRef = useRef<HTMLDivElement | null>(null);

  // Ensure the chosen session exists, including first launch with no saved chats.
  const activeConversation = conversations.find((item) => item.id === selectedId) ?? conversations[0];
  const activeId = activeConversation?.id;
  const messages = activeConversation?.messages ?? [];

  useEffect(() => { saveConversations(conversations); }, [conversations]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.length, isBusy, selectedId]);

  const cancel = useCallback(() => { abortRef.current?.abort(); abortRef.current = null; setIsBusy(false); }, []);

  const newChat = useCallback(() => {
    cancel();
    setSidebarOpen(false);
    setSuggestedText('');
    const empty = conversations.find((chat) => chat.messages.length === 0);
    if (empty) setSelectedId(empty.id);
    else {
      const fresh = createConversation();
      setConversations((previous) => [fresh, ...previous]);
      setSelectedId(fresh.id);
    }
    window.setTimeout(() => composerRef.current?.focus(), 30);
  }, [cancel, conversations]);

  const changeChat = useCallback((id: string) => {
    cancel();
    setSidebarOpen(false);
    setSelectedId(id);
  }, [cancel]);

  const deleteChat = useCallback((id: string) => {
    cancel();
    const rest = conversations.filter((item) => item.id !== id);
    const next = rest.length > 0 ? rest : [createConversation()];
    setConversations(next);
    if (id === selectedId || !next.some((chat) => chat.id === selectedId)) {
      setSelectedId(next[0].id);
    }
  }, [cancel, conversations, selectedId]);

  const send = useCallback(async (content: string) => {
    if (isBusy || !content.trim() || !activeId) return;
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
    try {
      const result = await sendChatMessage(outgoing.content, conversationId, previousMessages, controller.signal);
      if (controller.signal.aborted) return;
      const incoming: Message = { id: crypto.randomUUID(), role: 'assistant', content: result.reply, createdAt: Date.now(), toolsUsed: result.toolsUsed, sources: result.sources };
      setConversations((current) => current.map((chat) => chat.id === conversationId ? { ...chat, messages: [...chat.messages, incoming], updatedAt: Date.now() } : chat));
    } catch (error) {
      if (controller.signal.aborted) return;
      const detail = error instanceof Error ? error.message : 'Unexpected error';
      const failed: Message = { id: crypto.randomUUID(), role: 'assistant', content: `I couldn't complete that request. **${detail}**\n\nCheck that your FastAPI backend is running and that its chat route is configured.`, createdAt: Date.now(), error: true };
      setConversations((current) => current.map((chat) => chat.id === conversationId ? { ...chat, messages: [...chat.messages, failed], updatedAt: Date.now() } : chat));
    } finally {
      if (abortRef.current === controller) { abortRef.current = null; setIsBusy(false); }
    }
  }, [isBusy, activeId, activeConversation]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        composerRef.current?.focus();
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault(); newChat();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [newChat]);

  const suggest = (text: string) => {
    // Starter cards send immediately; rail shortcuts populate the composer for editing.
    setSuggestedText(text);
    window.setTimeout(() => composerRef.current?.focus(), 30);
  };
  const currentTitle = messages.length ? activeConversation?.title : 'Command center';

  return (
    <div className="app-frame">
      <Sidebar conversations={conversations} selectedId={activeId ?? ''} open={isSidebarOpen} onClose={() => setSidebarOpen(false)} onSelect={changeChat} onNew={newChat} onDelete={deleteChat} />
      <main className="main-panel">
        <div className="ambient ambient-one" /><div className="ambient ambient-two" />
        <header className="main-header">
          <div className="header-left"><MobileMenuButton onClick={() => setSidebarOpen(true)} /><span className="header-location"><GraduationCap size={17} /><span>CAMPUS</span><span className="slash">/</span><strong>{currentTitle}</strong></span></div>
          <div className="header-right"><span className={`mode-badge ${DEMO_MODE ? 'demo-badge' : 'api-badge'}`}><span className="status-led" />{DEMO_MODE ? 'DESIGN PREVIEW' : 'LIVE API MODE'}</span><button className="header-help" title="About DucKGP" onClick={() => suggest('What can DucKGP help me with?')} aria-label="About DucKGP"><CircleHelp size={17} /></button></div>
        </header>

        <div className={`main-scroll ${messages.length ? 'is-chatting' : 'is-welcome'}`} ref={chatViewportRef}>
          {messages.length === 0 ? <Welcome onSelect={send} /> : (
            <div className="conversation-view">
              <div className="conversation-top"><span className="conversation-kicker">SESSION / <span>{activeId?.slice(0, 8).toUpperCase()}</span></span><div className="conversation-title-row"><h2>{activeConversation.title}</h2><span><ChevronDown size={15} /> OPEN SESSION</span></div><p>One question at a time, one bright idea after another.</p></div>
              <div className="message-list">{messages.map((message) => <ChatMessage key={message.id} message={message} />)}{isBusy && <LoadingMessage />}</div>
              <div ref={endRef} className="end-marker" />
            </div>
          )}
        </div>

        <Composer onSend={send} onStop={cancel} busy={isBusy} focusRef={composerRef} suggestedText={suggestedText} onSuggestionApplied={() => setSuggestedText('')} />
        <div className="main-edge-ornament"><span>✳</span> CURIOUS / CAPABLE / QUACKABLE <span>✳</span></div>
      </main>
      <RightRail onPrompt={suggest} />
      <button className="new-chat-floating" onClick={newChat} title="New conversation" aria-label="New conversation"><Plus size={22} /></button>
      <div className="screen-reader" aria-live="polite">{DEMO_MODE ? 'Demo mode: answers are simulated' : 'Live API mode'}</div>
      <div className="version-corner"><Wifi size={12} /> DUCKSYSTEM · 1.0 <ArrowRight size={12} /></div>
    </div>
  );
}

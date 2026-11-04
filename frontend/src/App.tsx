import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useSpring, useTransform } from 'motion/react';
import { ArrowDown, Command as CmdIcon, Menu, Minimize2, PanelRight, Settings2, Share2, Wifi, WifiOff, Maximize2 } from 'lucide-react';
import Sidebar, { type NavView } from './components/Sidebar';
import Composer from './components/Composer';
import ChatMessage from './components/ChatMessage';
import Welcome from './components/Welcome';
import Duck from './components/Duck';
import CommandPalette, { type Command } from './components/CommandPalette';
import type { SettingsSection } from './components/SettingsModal';
import ShareDialog from './components/ShareDialog';
import ContextPanel from './components/ContextPanel';
import { ConfirmDialog, Toasts } from './components/ui';
import { IntegrationsProvider, useIntegrations } from './core/IntegrationsProvider';
import { setAudioPrefs, setPrefs, usePrefs } from './core/prefs';
import { changeThemeAnimated } from './core/theme';
import { pointerX, pointerY } from './core/duck';
import { useMotionScale, spring } from './core/motion';
import { useMediaQuery } from './core/hooks';
import { sfx } from './core/audio';
import { useAuth } from './auth/AuthProvider';
import { supabase } from './lib/supabase';
import { API_BASE } from './lib/api';
import { useChat } from './lib/useChat';
import { toast } from './core/toast';

const Library = lazy(() => import('./components/Library'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
type ApiStatus = 'checking' | 'online' | 'offline';
const WIDTHS = { narrow: 680, medium: 820, wide: 1020 } as const;

function Ambient() {
  const scale = useMotionScale();
  const ax = useSpring(useTransform(pointerX, (v) => v * -30 * scale), { stiffness: 40, damping: 20 });
  const ay = useSpring(useTransform(pointerY, (v) => v * -24 * scale), { stiffness: 40, damping: 20 });
  return <div className="ambient" aria-hidden="true"><motion.i className="orb o1" style={{ x: ax, y: ay }} /><motion.i className="orb o2" style={{ x: ay, y: ax }} /></div>;
}

function Shell() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const email = session?.user.email;
  const prefs = usePrefs();
  const chat = useChat(userId);
  const { summary } = useIntegrations();
  const narrow = useMediaQuery('(max-width: 820px)');
  const wideEnough = useMediaQuery('(min-width: 1180px)');

  const [view, setView] = useState<NavView>('chat');
  const [name, setName] = useState('');
  const [api, setApi] = useState<ApiStatus>('checking');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settings, setSettings] = useState<{ open: boolean; section: SettingsSection }>({ open: false, section: 'appearance' });
  const [shareFor, setShareFor] = useState<string | null>(null);
  const [deleteFor, setDeleteFor] = useState<string | null>(null);
  const [injected, setInjected] = useState<{ text: string; nonce: number } | null>(null);
  const [unseen, setUnseen] = useState(0);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const signOutRef = useRef(false);

  const { active, activeId, conversations, caps } = chat;
  const messages = active?.messages ?? [];
  const lastMsg = messages[messages.length - 1];
  const focus = prefs.focusMode;
  const showContext = prefs.contextPanel && wideEnough && !focus && view === 'chat';
  const openSettings = useCallback((section: SettingsSection = 'appearance') => setSettings({ open: true, section }), []);

  useEffect(() => {
    if (!userId) return;
    let off = false;
    void supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle().then(({ data }) => { if (!off && data?.full_name) setName(String(data.full_name)); });
    return () => { off = true; };
  }, [userId]);

  useEffect(() => {
    let on = true;
    async function check() {
      try { const r = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) }); if (on) setApi(r.ok ? 'online' : 'offline'); }
      catch { if (on) setApi('offline'); }
    }
    void check();
    const t = window.setInterval(() => { void check(); }, 45_000);
    return () => { on = false; window.clearInterval(t); };
  }, []);

  // Intelligent auto-scroll: follow only when the reader is already at the bottom.
  const toBottom = useCallback((smooth: boolean) => {
    const el = scrollRef.current; if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && prefs.intensity !== 'off' ? 'smooth' : 'auto' });
    stick.current = true; setUnseen(0);
  }, [prefs.intensity]);
  useEffect(() => { requestAnimationFrame(() => toBottom(false)); }, [activeId, view, toBottom]);
  useEffect(() => {
    if (!lastMsg) return;
    if (stick.current || lastMsg.role === 'user') requestAnimationFrame(() => toBottom(true));
    else setUnseen((n) => n + 1);
  }, [lastMsg?.id, chat.isBusy]); // eslint-disable-line react-hooks/exhaustive-deps
  const onScroll = () => { const el = scrollRef.current; if (!el) return; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90; if (stick.current) setUnseen(0); };

  const goChat = useCallback(() => { setView('chat'); setMobileOpen(false); }, []);
  const newChat = useCallback(() => { chat.newChat(); goChat(); window.setTimeout(() => composerRef.current?.focus(), 80); }, [chat, goChat]);
  const send = useCallback((text: string) => { goChat(); void chat.send(text); }, [chat, goChat]);
  const inject = useCallback((text: string) => { goChat(); setInjected({ text, nonce: Date.now() }); }, [goChat]);
  const fromIntegration = useCallback((text: string) => { if (text.endsWith(' ')) inject(text); else send(text); }, [inject, send]);
  const signOut = useCallback(async () => {
    if (signOutRef.current) return; signOutRef.current = true;
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) { toast('error', 'Could not sign out', error.message); signOutRef.current = false; }
  }, []);

  const commands = useMemo<Command[]>(() => {
    const c: Command[] = [
      { id: 'new', group: 'Actions', label: 'New chat', hint: '⇧⌘O', run: newChat },
      { id: 'lib', group: 'Actions', label: 'Open library', run: () => { sfx('nav'); setView('library'); } },
      { id: 'focus', group: 'Actions', label: focus ? 'Exit focus mode' : 'Enter focus mode', hint: '⇧⌘F', run: () => setPrefs({ focusMode: !focus }) },
      { id: 'sidebar', group: 'Actions', label: 'Toggle sidebar', hint: '⌘B', run: () => setPrefs({ sidebarCollapsed: !prefs.sidebarCollapsed }) },
      { id: 'ctx', group: 'Actions', label: 'Toggle context panel', hint: '⌘\\', run: () => setPrefs({ contextPanel: !prefs.contextPanel }) },
      { id: 'th-sys', group: 'Theme', label: 'Theme: System', run: () => changeThemeAnimated(() => setPrefs({ theme: 'system' })) },
      { id: 'th-l', group: 'Theme', label: 'Theme: Light', run: () => changeThemeAnimated(() => setPrefs({ theme: 'light' })) },
      { id: 'th-d', group: 'Theme', label: 'Theme: Dark', run: () => changeThemeAnimated(() => setPrefs({ theme: 'dark' })) },
      { id: 'snd', group: 'Sound', label: prefs.audio.master ? 'Turn all sound off' : 'Turn sound on', run: () => setAudioPrefs({ master: !prefs.audio.master }) },
      { id: 'set', group: 'Settings', label: 'Open settings', hint: '⌘,', run: () => openSettings() },
      { id: 'set-int', group: 'Settings', label: 'Integrations & ecosystem ring', keywords: 'gmail connect', run: () => openSettings('integrations') },
      { id: 'set-snd', group: 'Settings', label: 'Sound settings', run: () => openSettings('sound') },
      { id: 'set-priv', group: 'Settings', label: 'Privacy & shared links', run: () => openSettings('privacy') },
      { id: 'set-acc', group: 'Settings', label: 'Account & profile', run: () => openSettings('account') },
    ];
    conversations.filter((x) => x.messages.length).slice(0, 40).forEach((x) =>
      c.push({ id: `c-${x.id}`, group: 'Chats', label: x.title, keywords: x.messages.map((m) => m.content).join(' ').slice(0, 2000), run: () => { chat.select(x.id); goChat(); } }));
    return c;
  }, [conversations, newChat, focus, prefs, openSettings, chat, goChat]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const typing = /^(input|textarea|select)$/i.test((e.target as HTMLElement)?.tagName ?? '');
      if (mod && k === 'k') { e.preventDefault(); setPaletteOpen((o) => !o); }
      else if (mod && e.shiftKey && k === 'o') { e.preventDefault(); newChat(); }
      else if (mod && !e.shiftKey && k === 'b') { e.preventDefault(); if (narrow) setMobileOpen((o) => !o); else setPrefs({ sidebarCollapsed: !prefs.sidebarCollapsed }); }
      else if (mod && k === '\\') { e.preventDefault(); setPrefs({ contextPanel: !prefs.contextPanel }); }
      else if (mod && e.shiftKey && k === 'f') { e.preventDefault(); setPrefs({ focusMode: !focus }); }
      else if (mod && k === ',') { e.preventDefault(); openSettings(); }
      else if (k === '/' && !mod && !typing) { e.preventDefault(); goChat(); composerRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [newChat, narrow, prefs.sidebarCollapsed, prefs.contextPanel, focus, openSettings, goChat]);

  if (chat.loading) return <div className="app-loading"><Duck size={96} interactive={false} /><p>Unpacking your conversations…</p></div>;
  if (chat.loadError) return <div className="app-loading"><Duck size={96} interactive={false} /><p role="alert">{chat.loadError}</p><button type="button" className="btn primary" onClick={chat.retryLoad}>Try again</button></div>;

  const deleting = conversations.find((c) => c.id === deleteFor);
  const sharing = conversations.find((c) => c.id === shareFor);
  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant' && !m.error)?.id;
  const userBefore = (id: string) => { const i = messages.findIndex((m) => m.id === id); for (let j = i - 1; j >= 0; j--) if (messages[j].role === 'user') return messages[j].content; return undefined; };
  const canDelete = caps.messageDelete !== false;
  const sidebarW = focus ? 0 : narrow ? 0 : prefs.sidebarCollapsed ? 68 : prefs.sidebarWidth;

  return (
    <MotionConfig reducedMotion={prefs.intensity === 'off' || prefs.reducedMotion ? 'always' : 'user'} transition={spring}>
      <div className={`app ${focus ? 'is-focus' : ''}`} style={{ ['--sidebar-w' as string]: `${sidebarW}px`, ['--chat-w' as string]: `${WIDTHS[prefs.chatWidth]}px`, ['--context-w' as string]: showContext ? '320px' : '0px' }}>
        {!focus && (
          <Sidebar conversations={conversations} activeId={activeId} caps={caps} view={view} collapsed={prefs.sidebarCollapsed} width={prefs.sidebarWidth} mobile={narrow} mobileOpen={mobileOpen}
            name={name} email={email} onNew={newChat} onSelect={(id) => { chat.select(id); goChat(); }} onRename={(id, t) => { void chat.rename(id, t); }}
            onPin={(id) => { void chat.togglePin(id); }} onArchive={(id) => { void chat.toggleArchive(id); }} onShare={setShareFor} onDelete={setDeleteFor}
            onNav={(v) => { setView(v); setMobileOpen(false); }} onSettings={() => openSettings()} onSearch={() => setPaletteOpen(true)}
            onResize={(w) => setPrefs({ sidebarWidth: w })} onToggleCollapse={() => setPrefs({ sidebarCollapsed: !prefs.sidebarCollapsed })} onCloseMobile={() => setMobileOpen(false)} />
        )}
        <main className="main">
          <Ambient />
          <header className="topbar">
            {narrow && !focus && <button type="button" className="icon-btn" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>}
            <h2 className="top-title">{view === 'library' ? 'Library' : messages.length ? active?.title : 'New chat'}</h2>
            <div className="top-actions">
              <span className={`status-badge ${api}`} title={`FastAPI: ${api}`}>{api === 'offline' ? <WifiOff size={13} /> : <Wifi size={13} />}<span>{api === 'online' ? 'Online' : api === 'checking' ? 'Connecting' : 'Backend offline'}</span></span>
              {view === 'chat' && messages.length > 0 && <button type="button" className="icon-btn" aria-label="Share conversation" title={caps.sharing ? 'Share conversation' : 'Sharing needs migration 03'} disabled={!caps.sharing || !!lastMsg?.local && messages.every((m) => m.local)} onClick={() => setShareFor(activeId)}><Share2 size={17} /></button>}
              <button type="button" className="icon-btn" aria-label="Command palette" title="Command palette (Ctrl+K)" onClick={() => setPaletteOpen(true)}><CmdIcon size={17} /></button>
              {wideEnough && <button type="button" className={`icon-btn ${prefs.contextPanel ? 'on' : ''}`} aria-pressed={prefs.contextPanel} aria-label="Toggle context panel" title="Context panel (Ctrl+\)" onClick={() => setPrefs({ contextPanel: !prefs.contextPanel })}><PanelRight size={17} /></button>}
              <button type="button" className={`icon-btn ${focus ? 'on' : ''}`} aria-pressed={focus} aria-label={focus ? 'Exit focus mode' : 'Focus mode'} title="Focus mode (Ctrl+Shift+F)" onClick={() => setPrefs({ focusMode: !focus })}>{focus ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
              <button type="button" className="icon-btn" aria-label="Settings" title="Settings (Ctrl+,)" onClick={() => openSettings()}><Settings2 size={17} /></button>
            </div>
          </header>

          {view === 'library' ? <div className="scroll"><Suspense fallback={null}><Library /></Suspense></div> : (
            <>
              <div className="scroll" ref={scrollRef} onScroll={onScroll}>
                {messages.length === 0 ? (
                  <Welcome name={name} onPrompt={send} onIntegrations={() => openSettings('integrations')} />
                ) : (
                  <div className="thread" role="log" aria-live="polite" aria-label="Conversation">
                    {messages.map((m) => (
                      <ChatMessage key={m.id} message={m} isLastAssistant={m.id === lastAssistantId} canDelete={canDelete} deleteHint="Message delete needs migration 02"
                        onRegenerate={() => { const t = userBefore(m.id); if (t) void chat.send(t); }}
                        onRetry={() => { const t = userBefore(m.id); if (t) { void chat.deleteMessage(activeId, m); void chat.send(t); } }}
                        onEdit={m.role === 'user' ? inject : undefined} onDelete={() => { void chat.deleteMessage(activeId, m); }} />
                    ))}
                    <AnimatePresence>{chat.isBusy && <Thinking key="thinking" onStop={() => chat.cancel()} />}</AnimatePresence>
                    {chat.stopped[activeId] && !chat.isBusy && (
                      <div className="note" role="status">You stopped waiting. The server may still finish this reply and save it. <button type="button" className="link-btn" onClick={() => { void chat.checkLate(activeId); }}>Check for it</button></div>
                    )}
                  </div>
                )}
              </div>
              <AnimatePresence>
                {unseen > 0 && <motion.button type="button" className="jump" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} onClick={() => toBottom(true)}><ArrowDown size={15} />{unseen} new</motion.button>}
              </AnimatePresence>
              <Composer conversationId={activeId} onSend={(t) => { void chat.send(t); }} onStop={() => chat.cancel()} busy={chat.isBusy} focusRef={composerRef} injected={injected} />
            </>
          )}
        </main>
        {showContext && <ContextPanel conversation={active} api={api} onClose={() => setPrefs({ contextPanel: false })} onOpenIntegrations={() => openSettings('integrations')} />}
        {focus && <button type="button" className="focus-exit" onClick={() => setPrefs({ focusMode: false })}><Minimize2 size={14} /> Exit focus</button>}
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <Suspense fallback={null}><SettingsModal open={settings.open} section={settings.section} onSection={(s) => setSettings({ open: true, section: s })} onClose={() => setSettings((s) => ({ ...s, open: false }))}
        userId={userId} email={email} caps={caps} onSignOut={() => { void signOut(); }} onName={setName} onPrompt={fromIntegration} onView={(v) => setView(v)} /></Suspense>
      <ShareDialog conversationId={shareFor} title={sharing?.title ?? ''} onClose={() => setShareFor(null)} />
      <ConfirmDialog open={!!deleting} danger title="Delete conversation?" confirmLabel="Delete" body={<>“{deleting?.title}” and all its messages will be permanently deleted{caps.sharing ? ', and any share links to it stop working' : ''}.</>}
        onCancel={() => setDeleteFor(null)} onConfirm={() => { if (deleteFor) void chat.remove(deleteFor); setDeleteFor(null); }} />
      <Toasts />
      <span className="sr-only" aria-live="polite">{summary.total ? `${summary.connected} of ${summary.total} integrations connected` : ''}</span>
    </MotionConfig>
  );
}

function Thinking({ onStop }: { onStop: () => void }) {
  const [s, setS] = useState(0);
  useEffect(() => { const t = window.setInterval(() => setS((n) => n + 1), 1000); return () => window.clearInterval(t); }, []);
  return (
    <motion.div className="msg msg-ai thinking" role="status" aria-label="DucKGP is working on your message" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
      <div className="msg-avatar"><Duck size={34} interactive={false} /></div>
      <div className="msg-main"><div className="msg-bubble think-bubble"><span className="dots"><i /><i /><i /></span>
        <span>Thinking · {s}s</span>{s >= 20 && <small>Still working — tool lookups can take a while.</small>}
        <button type="button" className="link-btn" onClick={onStop}>Stop waiting</button></div></div>
    </motion.div>
  );
}

export default function App() {
  return <IntegrationsProvider><Shell /></IntegrationsProvider>;
}

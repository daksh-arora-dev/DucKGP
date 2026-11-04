import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Archive, ArchiveRestore, BookOpen, ChevronDown, MessageCircle, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Pencil, Pin, PinOff, Plus, Search, Settings2, Share2, Trash2, X } from 'lucide-react';
import type { Capabilities, Conversation } from '../lib/types';
import Duck from './Duck';
import { SIDEBAR_MAX, SIDEBAR_MIN } from '../core/prefs';
import { spring, springSoft } from '../core/motion';
import { useDismiss } from '../core/hooks';

export type NavView = 'chat' | 'library';

interface Props {
  conversations: Conversation[]; activeId: string; caps: Capabilities; view: NavView;
  collapsed: boolean; width: number; mobile: boolean; mobileOpen: boolean; name?: string; email?: string;
  onNew: () => void; onSelect: (id: string) => void; onRename: (id: string, t: string) => void;
  onPin: (id: string) => void; onArchive: (id: string) => void; onShare: (id: string) => void; onDelete: (id: string) => void;
  onNav: (v: NavView) => void; onSettings: () => void; onSearch: () => void;
  onResize: (w: number) => void; onToggleCollapse: () => void; onCloseMobile: () => void;
}

function bucket(t: number) {
  const d = new Date(); const mid = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return t >= mid ? 'Today' : t >= mid - 86_400_000 ? 'Yesterday' : t >= mid - 7 * 86_400_000 ? 'Last 7 days' : 'Earlier';
}

export default function Sidebar(p: Props) {
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [dragW, setDragW] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  useDismiss(menuRef, !!menu, closeMenu);

  const { pinned, groups, archived } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = p.conversations.filter((c) => c.messages.length && (!q || c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q))));
    const live = list.filter((c) => !c.archivedAt);
    const g = live.filter((c) => !c.pinnedAt).sort((a, b) => b.updatedAt - a.updatedAt).reduce<Record<string, Conversation[]>>((acc, c) => { (acc[bucket(c.updatedAt)] ??= []).push(c); return acc; }, {});
    return {
      pinned: live.filter((c) => c.pinnedAt).sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0)),
      groups: Object.entries(g), archived: list.filter((c) => c.archivedAt).sort((a, b) => b.updatedAt - a.updatedAt),
    };
  }, [p.conversations, query]);

  const width = p.collapsed && !p.mobile ? 68 : dragW ?? p.width;
  const startResize = (e: RPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const startX = e.clientX, start = p.width;
    const move = (ev: PointerEvent) => setDragW(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, start + ev.clientX - startX)));
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      p.onResize(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, start + ev.clientX - startX))); setDragW(null);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const onResizeKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); p.onResize(Math.max(SIDEBAR_MIN, p.width - 16)); }
    if (e.key === 'ArrowRight') { e.preventDefault(); p.onResize(Math.min(SIDEBAR_MAX, p.width + 16)); }
  };

  const commitRename = () => { if (renaming && draft.trim()) p.onRename(renaming, draft); setRenaming(null); };
  const rail = p.collapsed && !p.mobile;

  const item = (c: Conversation) => (
    <motion.li key={c.id} layout="position" transition={springSoft} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}
      className={`chat-item ${p.activeId === c.id && p.view === 'chat' ? 'active' : ''}`} onContextMenu={(e) => { e.preventDefault(); setMenu({ id: c.id, x: e.clientX, y: e.clientY }); }}>
      {renaming === c.id ? (
        <input className="rename-input" autoFocus value={draft} maxLength={80} aria-label="Rename conversation" onChange={(e) => setDraft(e.target.value)} onBlur={commitRename}
          onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null); }} />
      ) : (
        <button type="button" className="chat-btn" onClick={() => p.onSelect(c.id)} onDoubleClick={() => { setRenaming(c.id); setDraft(c.title); }} title={c.title}>
          {c.pinnedAt ? <Pin size={13} className="pin-ico" /> : <MessageCircle size={14} />}<span>{c.title}</span>
        </button>
      )}
      <button type="button" className="chat-more" aria-label={`Actions for ${c.title}`} aria-haspopup="menu"
        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ id: c.id, x: r.right, y: r.bottom }); }}><MoreHorizontal size={15} /></button>
    </motion.li>
  );

  const menuConv = menu ? p.conversations.find((c) => c.id === menu.id) : null;
  const organizeHint = p.caps.organize ? undefined : 'Needs migration 02';
  const body = (
    <>
      <div className="brand">
        <Duck size={rail ? 40 : 44} label="Quack!" />
        {!rail && <div className="brand-text"><b>duc<span>kgp</span></b><small>your campus, less chaos</small></div>}
        {p.mobile
          ? <button type="button" className="icon-btn" aria-label="Close menu" onClick={p.onCloseMobile}><X size={18} /></button>
          : !rail && <button type="button" className="icon-btn" aria-label="Collapse sidebar" title="Collapse sidebar (Ctrl+B)" onClick={p.onToggleCollapse}><PanelLeftClose size={18} /></button>}
      </div>
      {rail && <button type="button" className="icon-btn rail-btn" aria-label="Expand sidebar" title="Expand sidebar (Ctrl+B)" onClick={p.onToggleCollapse}><PanelLeftOpen size={18} /></button>}
      <motion.button type="button" className={`new-chat ${rail ? 'rail' : ''}`} onClick={p.onNew} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} transition={spring} aria-label="New chat" title="New chat (Ctrl+Shift+O)"><Plus size={18} />{!rail && <span>New chat</span>}</motion.button>
      <nav className="side-nav" aria-label="Workspace">
        <button type="button" className={p.view === 'library' ? 'active' : ''} onClick={() => p.onNav('library')} title="My library" aria-label="My library"><BookOpen size={17} />{!rail && <span>My library</span>}</button>
        <button type="button" onClick={p.onSearch} title="Search & commands (Ctrl+K)" aria-label="Search and commands"><Search size={17} />{!rail && <><span>Search &amp; commands</span><kbd>⌘K</kbd></>}</button>
      </nav>
      {!rail && (
        <div className="history">
          <label className="side-search"><Search size={14} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter chats" aria-label="Filter chats" />{query && <button type="button" aria-label="Clear filter" onClick={() => setQuery('')}><X size={13} /></button>}</label>
          <div className="history-scroll">
            {pinned.length > 0 && <section><h4>Pinned</h4><ul><AnimatePresence initial={false}>{pinned.map(item)}</AnimatePresence></ul></section>}
            {groups.map(([g, list]) => <section key={g}><h4>{g}</h4><ul><AnimatePresence initial={false}>{list.map(item)}</AnimatePresence></ul></section>)}
            {!pinned.length && !groups.length && !archived.length && <p className="empty">{query ? 'No matching chats' : 'Your chats will appear here'}</p>}
            {archived.length > 0 && (
              <section><button type="button" className="arch-toggle" aria-expanded={showArchived} onClick={() => setShowArchived(!showArchived)}><Archive size={13} />Archived ({archived.length})<ChevronDown size={13} className={showArchived ? 'flip' : ''} /></button>
                <AnimatePresence initial={false}>{showArchived && <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>{archived.map(item)}</motion.ul>}</AnimatePresence></section>
            )}
          </div>
        </div>
      )}
      <div className="side-bottom">
        <button type="button" className="account-row" onClick={p.onSettings} aria-label="Settings and account">
          <span className="avatar">{(p.name || p.email || 'D').slice(0, 1).toUpperCase()}</span>
          {!rail && <><span className="acct-text"><strong>{p.name || 'Settings'}</strong><small>{p.email}</small></span><Settings2 size={16} /></>}
        </button>
      </div>

      <AnimatePresence>
        {menu && menuConv && (
          <motion.div ref={menuRef} role="menu" className="ctx-menu" style={{ left: Math.min(menu.x, window.innerWidth - 200), top: Math.min(menu.y, window.innerHeight - 230) }}
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.12 }}>
            <button role="menuitem" type="button" disabled={!p.caps.organize} title={organizeHint} onClick={() => { p.onPin(menuConv.id); closeMenu(); }}>{menuConv.pinnedAt ? <PinOff size={15} /> : <Pin size={15} />}{menuConv.pinnedAt ? 'Unpin' : 'Pin'}</button>
            <button role="menuitem" type="button" onClick={() => { setRenaming(menuConv.id); setDraft(menuConv.title); closeMenu(); }}><Pencil size={15} />Rename</button>
            <button role="menuitem" type="button" disabled={!p.caps.sharing} title={p.caps.sharing ? undefined : 'Needs migration 03'} onClick={() => { p.onShare(menuConv.id); closeMenu(); }}><Share2 size={15} />Share…</button>
            <button role="menuitem" type="button" disabled={!p.caps.organize} title={organizeHint} onClick={() => { p.onArchive(menuConv.id); closeMenu(); }}>{menuConv.archivedAt ? <ArchiveRestore size={15} /> : <Archive size={15} />}{menuConv.archivedAt ? 'Unarchive' : 'Archive'}</button>
            <hr />
            <button role="menuitem" type="button" className="danger" onClick={() => { p.onDelete(menuConv.id); closeMenu(); }}><Trash2 size={15} />Delete</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (p.mobile) {
    return (
      <AnimatePresence>
        {p.mobileOpen && <>
          <motion.button type="button" className="scrim" aria-label="Close menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={p.onCloseMobile} />
          <motion.aside className="sidebar is-drawer" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={spring}
            drag="x" dragConstraints={{ left: -320, right: 0 }} dragElastic={0.1} onDragEnd={(_, i) => { if (i.offset.x < -80 || i.velocity.x < -400) p.onCloseMobile(); }}>{body}</motion.aside>
        </>}
      </AnimatePresence>
    );
  }
  return (
    <aside className={`sidebar ${rail ? 'is-rail' : ''}`} style={{ width }}>
      {body}
      {!rail && <div className="resize-handle" role="separator" aria-orientation="vertical" aria-label="Resize sidebar" aria-valuemin={SIDEBAR_MIN} aria-valuemax={SIDEBAR_MAX} aria-valuenow={width} tabIndex={0} onPointerDown={startResize} onKeyDown={onResizeKey} />}
    </aside>
  );
}

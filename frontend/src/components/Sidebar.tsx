import { useMemo, useState } from 'react';
import {
  BookOpen, ChevronRight, FileText, Inbox, LogOut, Menu, MessageCircle,
  Plus, Search, Settings2, Trash2, X,
} from 'lucide-react';
import DuckMark from './DuckMark';
import type { Conversation } from '../lib/types';

interface Props {
  conversations: Conversation[];
  selectedId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onChat: () => void;
  onDelete: (id: string) => void;
  onLibrary: () => void;
  onGmail: () => void;
  onAccount: () => void;
  onSignOut: () => void;
  email?: string;
}

function sectionForTime(value: number) {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (value >= midnight) return 'Today';
  if (value >= midnight - 86_400_000) return 'Yesterday';
  if (value >= midnight - 7 * 86_400_000) return 'Last 7 days';
  return 'Earlier';
}

export default function Sidebar(props: Props) {
  const [search, setSearch] = useState('');
  const { conversations, selectedId, open, onClose, onSelect, onNew, onChat,
    onDelete, onLibrary, onGmail, onAccount, onSignOut, email } = props;

  const groups = useMemo(() => {
    const ordered = conversations
      .filter((chat) => chat.messages.length && chat.title.toLowerCase().includes(search.toLowerCase().trim()))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const grouped = ordered.reduce<Record<string, Conversation[]>>((acc, chat) => {
      (acc[sectionForTime(chat.updatedAt)] ??= []).push(chat);
      return acc;
    }, {});
    return Object.entries(grouped);
  }, [conversations, search]);

  function deleteWithConfirmation(id: string, title: string) {
    if (window.confirm(`Delete “${title}”? This cannot be undone.`)) onDelete(id);
  }

  return (
    <>
      {open && <button type="button" className="mobile-backdrop" aria-label="Close menu" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-badge"><DuckMark size={38} /></div>
          <div className="brand-wordmark">
            <div className="brand-name">duc<span>kgp</span><span className="brand-tm">®</span></div>
            <div className="brand-sub">your campus, less chaos</div>
          </div>
          <button type="button" className="icon-button close-sidebar" onClick={onClose} aria-label="Close menu"><X size={19}/></button>
        </div>

        <div className="sidebar-main">
          <button type="button" className="new-chat-button" onClick={onNew}>
            <Plus size={19}/><span>New chat</span><span className="button-key">↗</span>
          </button>
          <div className="sidebar-caption space-above">WORKSPACE</div>
          <button type="button" className="sidebar-nav-item" onClick={onChat}><MessageCircle size={17}/><span>Chat</span><ChevronRight size={15}/></button>
          <button type="button" className="sidebar-nav-item" onClick={onLibrary}><BookOpen size={17}/><span>My library</span><ChevronRight size={15}/></button>
          <button type="button" className="sidebar-nav-item" onClick={onGmail}><Inbox size={17}/><span>Gmail</span><ChevronRight size={15}/></button>

          <div className="sidebar-caption history-caption">YOUR CONVERSATIONS</div>
          <label className="sidebar-search">
            <Search size={15}/>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats" aria-label="Search chats" />
            {search && <button type="button" onClick={() => setSearch('')} title="Clear search" aria-label="Clear search"><X size={13}/></button>}
          </label>
          <div className="history-list">
            {groups.length === 0 && <div className="empty-history"><FileText size={18}/><span>{search ? 'No matching conversations' : 'Your chats will appear here'}</span></div>}
            {groups.map(([group, chats]) => (
              <div className="history-group" key={group}>
                <div className="history-group-title">{group}</div>
                {chats.map((chat) => (
                  <div key={chat.id} className={`history-item-wrap ${selectedId === chat.id ? 'selected' : ''}`}>
                    <button type="button" className="history-item" onClick={() => onSelect(chat.id)} title={chat.title}>
                      <MessageCircle size={15}/><span>{chat.title}</span>
                    </button>
                    <button type="button" className="history-delete" onClick={() => deleteWithConfirmation(chat.id, chat.title)} title="Delete chat" aria-label={`Delete ${chat.title}`}><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="sidebar-bottom">
          <button type="button" className="account-row" onClick={onAccount}>
            <span className="account-avatar">{email?.slice(0, 1).toUpperCase() || 'D'}</span>
            <span className="account-text"><strong>My account</strong><small>{email || 'DucKGP student'}</small></span>
            <Settings2 size={17}/>
          </button>
          <button type="button" className="signout-row" onClick={onSignOut}><LogOut size={15}/><span>Sign out</span></button>
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return <button type="button" className="icon-button mobile-menu-button" onClick={onClick} title="Open navigation" aria-label="Open navigation"><Menu size={20}/></button>;
}

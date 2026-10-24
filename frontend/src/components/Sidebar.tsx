import { useMemo } from 'react';
import {
  ArrowUpRight, BookOpenText, Clock3, Github, Menu, MessageCircle,
  Plus, Sparkles, Trash2, X,
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
  onDelete: (id: string) => void;
}

function sectionForTime(timestamp: number): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (timestamp >= today) return 'Today';
  if (timestamp >= today - 86400000) return 'Yesterday';
  if (timestamp >= today - 6 * 86400000) return 'Previous 7 days';
  return 'Older';
}

export default function Sidebar({ conversations, selectedId, open, onClose, onSelect, onNew, onDelete }: Props) {
  const groups = useMemo(() => {
    const ordered = [...conversations].filter((chat) => chat.messages.length > 0).sort((a, b) => b.updatedAt - a.updatedAt);
    const grouped = ordered.reduce<Record<string, Conversation[]>>((acc, item) => {
      const key = sectionForTime(item.updatedAt);
      (acc[key] ??= []).push(item);
      return acc;
    }, {});
    return Object.entries(grouped).map(([label, chats]) => ({ label, chats }));
  }, [conversations]);

  return (
    <>
      {open && <button className="mobile-backdrop" aria-label="Close menu" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-badge"><DuckMark size={42} /></div>
          <div className="brand-wordmark">
            <div className="brand-name">Duc<span>KGP</span><span className="brand-tm">™</span></div>
            <div className="brand-sub">CAMPUS INTELLIGENCE</div>
          </div>
          <button className="icon-button close-sidebar" onClick={onClose} aria-label="Close menu"><X size={18} /></button>
        </div>

        <div className="sidebar-main">
          <button className="new-chat-button" onClick={onNew}>
            <Plus size={19} strokeWidth={2.5} /><span>New conversation</span><span className="button-key">+</span>
          </button>

          <div className="sidebar-caption space-above"><span>YOUR WORKSPACE</span><span className="caption-dash" /></div>
          <div className="nav-static"><BookOpenText size={17} /><span>Campus co-pilot</span><span className="tiny-glow" /></div>

          <div className="sidebar-caption history-caption"><span>RECENT CHATS</span><Clock3 size={13} /></div>
          <div className="history-list">
            {groups.length === 0 && (
              <div className="empty-history"><MessageCircle size={20} /><span>Conversations you start<br />will appear here.</span></div>
            )}
            {groups.map(({ label, chats }) => (
              <div className="history-group" key={label}>
                <div className="history-group-title">{label}</div>
                {chats.map((chat) => (
                  <div className={`history-item-wrap ${chat.id === selectedId ? 'selected' : ''}`} key={chat.id}>
                    <button className="history-item" title={chat.title} onClick={() => onSelect(chat.id)}>
                      <MessageCircle size={15} /><span>{chat.title}</span>
                    </button>
                    <button className="history-delete" onClick={() => onDelete(chat.id)} aria-label={`Delete ${chat.title}`} title="Delete chat"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="sidebar-tip-top"><span className="tip-glimmer"><Sparkles size={14} /></span> THE LITTLE BIG IDEA</div>
            <p>Big campus questions.<br /><strong>Tiny duck energy.</strong></p>
            <div className="tip-decoration">✳</div>
          </div>
          <a className="sidebar-footer" href="https://github.com/metakgp" target="_blank" rel="noopener noreferrer">
            <span className="footer-icon"><Github size={15} /></span><span>Built for the KGP community</span><ArrowUpRight size={14} />
          </a>
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return <button className="icon-button mobile-menu-button" onClick={onClick} aria-label="Open menu"><Menu size={20} /></button>;
}

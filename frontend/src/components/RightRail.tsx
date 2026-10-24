import { ArrowUpRight, BookMarked, ChevronRight, Command, FileSearch2, FlaskConical, MapPin, Radio, ShieldCheck, Zap } from 'lucide-react';
import { DEMO_MODE } from '../lib/chatApi';

interface Props { onPrompt: (value: string) => void; }

export default function RightRail({ onPrompt }: Props) {
  return (
    <aside className="right-rail">
      <div className="rail-header"><span className="rail-dot" /><span>THE DUCK DECK</span><span className="rail-index">01 / 03</span></div>
      <div className="rail-feature">
        <div className="rail-feature-top"><span className="rail-mono">YOUR DIGITAL CAMPUS COMPANION</span><Zap size={16} /></div>
        <div className="rail-feature-art"><div className="radar-ring radar-ring-a" /><div className="radar-ring radar-ring-b" /><div className="radar-center">✳</div><div className="radar-ping radar-ping-one" /><div className="radar-ping radar-ping-two" /></div>
        <div className="rail-feature-bottom"><span>Curiosity is<br />the whole point.</span><div className="rail-feature-arrow"><ArrowUpRight size={17} /></div></div>
      </div>

      <div className="rail-section-heading"><span>EXPLORE CAPABILITIES</span><span>✦</span></div>
      <button className="capability" onClick={() => onPrompt('Find CH21207 midsem previous-year question papers')}>
        <span className="capability-icon gold"><FileSearch2 size={18} /></span>
        <span className="capability-copy"><strong>Question papers</strong><small>Find PYQs with IQPS</small></span><ChevronRight size={16} />
      </button>
      <button className="capability" onClick={() => onPrompt('Help me understand convolutional neural networks')}>
        <span className="capability-icon blue"><BookMarked size={18} /></span>
        <span className="capability-copy"><strong>Study sidekick</strong><small>Unpack tough concepts</small></span><ChevronRight size={16} />
      </button>
      <button className="capability" onClick={() => onPrompt('Which classrooms are free today at 3 PM?')}>
        <span className="capability-icon coral"><MapPin size={18} /></span>
        <span className="capability-copy"><strong>Campus explorer</strong><small>Room data · coming soon</small></span><ChevronRight size={16} />
      </button>

      <div className="rail-section-heading rail-connect-heading"><span>CONNECTION STATUS</span><Radio size={14} /></div>
      <div className="connection-panel">
        <div className="connection-status-row"><span className={`connection-pulse ${DEMO_MODE ? 'is-demo' : ''}`} /><span>{DEMO_MODE ? 'Preview environment' : 'Live API mode'}</span><span className="status-tag">{DEMO_MODE ? 'DEMO' : 'API'}</span></div>
        <p>{DEMO_MODE ? 'You are viewing sample responses. No requests go to your LLM.' : 'Requests are sent to your configured backend. Tool availability depends on its MCP setup.'}</p>
        <div className="panel-divider" />
        <div className="connection-detail"><ShieldCheck size={14} /><span>Local chat history</span><span>ON</span></div>
        <div className="connection-detail"><FlaskConical size={14} /><span>Environment</span><span>{DEMO_MODE ? 'SANDBOX' : 'CUSTOM'}</span></div>
      </div>

      <div className="rail-bottom-note"><Command size={14} /><span>Press <kbd>Ctrl</kbd> + <kbd>K</kbd> to jump to chat.</span></div>
    </aside>
  );
}

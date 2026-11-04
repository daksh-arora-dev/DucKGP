import { motion, useSpring, useTransform } from 'motion/react';
import { ArrowRight, Building2, FileSearch2, Inbox, Sparkles, UserSearch } from 'lucide-react';
import Duck from './Duck';
import { pointerX, pointerY } from '../core/duck';
import { fadeUp, stagger, useMotionScale } from '../core/motion';
import { useIntegrations } from '../core/IntegrationsProvider';

export default function Welcome({ name, onPrompt, onIntegrations }: { name?: string; onPrompt: (p: string) => void; onIntegrations: () => void }) {
  const scale = useMotionScale();
  const { states, summary } = useIntegrations();
  const px = useSpring(useTransform(pointerX, (v) => v * 16 * scale), { stiffness: 60, damping: 20 });
  const py = useSpring(useTransform(pointerY, (v) => v * 12 * scale), { stiffness: 60, damping: 20 });
  const hour = new Date().getHours();
  const hello = hour < 5 ? 'Burning the midnight oil' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = name?.trim().split(/\s+/)[0];
  const gmail = states.gmail?.status === 'connected';
  const prompts = [
    { icon: <FileSearch2 size={18} />, title: 'Find question papers', sub: 'IQPS · previous years', text: 'Find CH21207 Fluid Mechanics previous-year midsem papers' },
    { icon: <Building2 size={18} />, title: 'Empty classrooms', sub: 'Timetable-based', text: 'Which classrooms are free right now?' },
    gmail
      ? { icon: <Inbox size={18} />, title: 'Check my inbox', sub: 'Gmail · connected', text: 'Search my Gmail for unread messages and summarize them.' }
      : { icon: <UserSearch size={18} />, title: 'Find a professor’s class', sub: 'MetaKGP WIMP', text: 'Where is my professor scheduled to teach today? Professor: ' },
  ];
  return (
    <motion.div className="welcome" variants={stagger(0.07)} initial="hidden" animate="show">
      <motion.div className="welcome-duck" style={{ x: px, y: py }} variants={fadeUp}><div className="duck-glow" aria-hidden="true" /><Duck size={188} /></motion.div>
      <motion.h1 variants={fadeUp}>{hello}{first ? `, ${first}` : ''}.<br /><em>What shall we figure out?</em></motion.h1>
      <motion.p className="muted" variants={fadeUp}>Tap the duck. Ask anything about campus life, courses, or your inbox.</motion.p>
      <motion.div className="prompt-grid" variants={fadeUp}>
        {prompts.map((p) => (
          <motion.button key={p.title} type="button" className="prompt-card" whileHover={scale ? { y: -4, rotateX: 3 } : undefined} whileTap={{ scale: 0.97 }} onClick={() => onPrompt(p.text)}>
            <span className="prompt-ico">{p.icon}</span><span className="prompt-txt"><strong>{p.title}</strong><small>{p.sub}</small></span><ArrowRight size={15} className="go" />
          </motion.button>
        ))}
      </motion.div>
      <motion.button type="button" className="eco-chip" variants={fadeUp} onClick={onIntegrations}>
        <Sparkles size={14} />{summary.total === 0 ? 'Explore integrations' : `${summary.connected} of ${summary.total} integrations connected`}
        <span className="eco-chip-bar" aria-hidden="true"><motion.i animate={{ width: `${summary.fraction * 100}%` }} /></span>
      </motion.button>
    </motion.div>
  );
}

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Boxes, Brush, LayoutPanelLeft, LogOut, Monitor, Moon, Shield, Sun, User, Volume2 } from 'lucide-react';
import { Modal, Segmented, Slider, Switch } from './ui';
import IntegrationsPanel from './IntegrationsPanel';
import { resetPrefs, setAudioPrefs, setPrefs, usePrefs, type ThemePref } from '../core/prefs';
import { changeThemeAnimated } from '../core/theme';
import { audio, sfx } from '../core/audio';
import { duck } from '../core/duck';
import { useIntegrations } from '../core/IntegrationsProvider';
import { listShares, revokeShare, type ShareRecord } from '../lib/sharing';
import { supabase } from '../lib/supabase';
import { toast } from '../core/toast';
import { fadeUp } from '../core/motion';
import type { Capabilities } from '../lib/types';

export type SettingsSection = 'appearance' | 'workspace' | 'sound' | 'integrations' | 'account' | 'privacy';
const SECTIONS: Array<{ id: SettingsSection; label: string; icon: ReactNode }> = [
  { id: 'appearance', label: 'Appearance', icon: <Brush size={16} /> },
  { id: 'workspace', label: 'Workspace', icon: <LayoutPanelLeft size={16} /> },
  { id: 'sound', label: 'Sound', icon: <Volume2 size={16} /> },
  { id: 'integrations', label: 'Integrations', icon: <Boxes size={16} /> },
  { id: 'account', label: 'Account', icon: <User size={16} /> },
  { id: 'privacy', label: 'Privacy', icon: <Shield size={16} /> },
];

const Row = ({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) => (
  <div className="set-row"><div><strong>{title}</strong>{desc && <small>{desc}</small>}</div><div className="set-ctl">{children}</div></div>
);

function Appearance() {
  const p = usePrefs();
  return (<>
    <Row title="Theme" desc="System follows your operating system automatically.">
      <Segmented<ThemePref> label="Theme" value={p.theme} onChange={(v, e) => changeThemeAnimated(() => setPrefs({ theme: v }), { x: e.clientX, y: e.clientY })}
        options={[{ value: 'system', label: 'System', icon: <Monitor size={14} /> }, { value: 'light', label: 'Light', icon: <Sun size={14} /> }, { value: 'dark', label: 'Dark', icon: <Moon size={14} /> }]} />
    </Row>
    <Row title="Animation intensity" desc="Full = parallax and idle motion. Calm = softer. Off = no ambient motion.">
      <Segmented label="Animation intensity" value={p.intensity} onChange={(v) => setPrefs({ intensity: v })} options={[{ value: 'full', label: 'Full' }, { value: 'calm', label: 'Calm' }, { value: 'off', label: 'Off' }]} />
    </Row>
    <Row title="Reduce motion" desc="Also honoured automatically if your OS asks for reduced motion."><Switch label="Reduce motion" checked={p.reducedMotion} onChange={(v) => setPrefs({ reducedMotion: v })} /></Row>
    <Row title="Interface density">
      <Segmented label="Density" value={p.density} onChange={(v) => setPrefs({ density: v })} options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} />
    </Row>
  </>);
}

function Workspace() {
  const p = usePrefs();
  const keys: Array<[string, string]> = [['Ctrl/⌘ + K', 'Command palette'], ['Ctrl/⌘ + Shift + O', 'New chat'], ['Ctrl/⌘ + B', 'Toggle sidebar'], ['Ctrl/⌘ + \\', 'Toggle context panel'], ['Ctrl/⌘ + Shift + F', 'Focus mode'], ['Ctrl/⌘ + ,', 'Settings'], ['/', 'Focus the composer'], ['Esc', 'Close dialogs / stop waiting']];
  return (<>
    <Row title="Conversation width"><Segmented label="Chat width" value={p.chatWidth} onChange={(v) => setPrefs({ chatWidth: v })} options={[{ value: 'narrow', label: 'Narrow' }, { value: 'medium', label: 'Medium' }, { value: 'wide', label: 'Wide' }]} /></Row>
    <Row title="Collapse sidebar" desc="Drag the sidebar edge to resize it; use arrow keys when focused."><Switch label="Collapse sidebar" checked={p.sidebarCollapsed} onChange={(v) => setPrefs({ sidebarCollapsed: v })} /></Row>
    <Row title="Context panel" desc="Tools, sources and ecosystem status for the open chat (wide screens)."><Switch label="Context panel" checked={p.contextPanel} onChange={(v) => setPrefs({ contextPanel: v })} /></Row>
    <Row title="Focus mode" desc="Hides the sidebar and panels so only the conversation remains."><Switch label="Focus mode" checked={p.focusMode} onChange={(v) => setPrefs({ focusMode: v })} /></Row>
    <h3 className="group-title">Keyboard shortcuts</h3>
    <dl className="keys">{keys.map(([k, d]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{d}</dd></div>)}</dl>
  </>);
}

function Sound() {
  const { audio: a } = usePrefs();
  const music = useSyncExternalStore((l) => audio.onMusicState(l), () => audio.musicState);
  const off = !a.master;
  return (<>
    <p className="note">All sound is <strong>off by default</strong>. Sounds are generated in your browser — nothing is downloaded.</p>
    <Row title="Master audio"><Switch label="Master audio" checked={a.master} onChange={(v) => setAudioPrefs({ master: v })} /></Row>
    <Row title="Click sounds" desc="Buttons, navigation, toggles, sending."><Switch label="Click sounds" checked={a.click} disabled={off} onChange={(v) => setAudioPrefs({ click: v })} /></Row>
    <Row title="Notification sounds" desc="Reply finished, success and error chimes."><Switch label="Notification sounds" checked={a.notify} disabled={off} onChange={(v) => setAudioPrefs({ notify: v })} /></Row>
    <Row title="Mascot sounds" desc="Quacks when you tap the duck."><Switch label="Mascot sounds" checked={a.mascot} disabled={off} onChange={(v) => setAudioPrefs({ mascot: v })} /></Row>
    <Row title="Background music" desc={music === 'waiting-for-gesture' ? 'Your browser blocked autoplay — click anywhere to start.' : 'Soft ambient pad.'}><Switch label="Background music" checked={a.music} disabled={off} onChange={(v) => setAudioPrefs({ music: v })} /></Row>
    <Row title="Effects volume"><Slider label="Sound effects volume" value={a.sfxVolume} disabled={off} onChange={(v) => setAudioPrefs({ sfxVolume: v })} /></Row>
    <Row title="Music volume"><Slider label="Music volume" value={a.musicVolume} disabled={off || !a.music} onChange={(v) => setAudioPrefs({ musicVolume: v })} /></Row>
    <div className="row gap wrap"><button type="button" className="btn ghost" disabled={off} onClick={() => sfx('notify')}>Preview chime</button><button type="button" className="btn ghost" disabled={off || !a.mascot} onClick={() => duck.quack()}>Preview quack</button></div>
  </>);
}

interface Profile { full_name: string; roll_number: string; institute_email: string; personal_email: string; department: string; programme: string; year_of_study: number }

function Account({ userId, email, onSignOut, onName }: { userId: string; email?: string; onSignOut: () => void; onName: (n: string) => void }) {
  const { defs, states } = useIntegrations();
  const [p, setP] = useState<Profile | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void supabase.from('profiles').select('full_name, roll_number, institute_email, personal_email, department, programme, year_of_study').eq('id', userId).maybeSingle()
      .then(({ data, error }) => { if (error) setErr(error.message); else setP(data as Profile | null); });
  }, [userId]);
  async function save() {
    if (!p) return;
    if (!p.full_name.trim() || !Number.isInteger(p.year_of_study) || p.year_of_study < 1 || p.year_of_study > 7) { setErr('Enter a name and a year of study between 1 and 7.'); return; }
    setBusy(true); setErr('');
    const { data, error } = await supabase.from('profiles').update({ full_name: p.full_name.trim(), personal_email: p.personal_email.trim(), department: p.department.trim(), programme: p.programme.trim(), year_of_study: p.year_of_study }).eq('id', userId).select('id');
    setBusy(false);
    if (error || !data?.length) { setErr(error?.message ?? 'Profile was not saved.'); return; }
    onName(p.full_name.trim()); toast('success', 'Profile saved');
  }
  const set = (k: keyof Profile, v: string) => setP((cur) => (cur ? { ...cur, [k]: k === 'year_of_study' ? Number(v) : v } : cur));
  const connected = defs.filter((d) => d.kind === 'account' && states[d.id]?.status === 'connected');
  return (<>
    <p className="muted">Signed in as <strong>{email}</strong></p>
    {p ? (
      <form className="profile-grid" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <label>Full name<input value={p.full_name} onChange={(e) => set('full_name', e.target.value)} required /></label>
        <label>Roll number<input value={p.roll_number} readOnly aria-readonly="true" title="Roll number can’t be changed here" /></label>
        <label>Institute email<input value={p.institute_email} readOnly aria-readonly="true" title="Institute email can’t be changed here" /></label>
        <label>Personal email<input type="email" value={p.personal_email} onChange={(e) => set('personal_email', e.target.value)} required /></label>
        <label>Department<input value={p.department} onChange={(e) => set('department', e.target.value)} required /></label>
        <label>Programme<input value={p.programme} onChange={(e) => set('programme', e.target.value)} required /></label>
        <label>Year of study<input type="number" min={1} max={7} value={p.year_of_study} onChange={(e) => set('year_of_study', e.target.value)} required /></label>
        <div className="row gap full"><button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
      </form>
    ) : !err && <p className="muted">Loading profile…</p>}
    {err && <p className="error-text" role="alert">{err}</p>}
    <h3 className="group-title">Connected accounts</h3>
    {connected.length ? <ul className="share-list">{connected.map((d) => <li key={d.id}><span>{d.name}{states[d.id]?.label ? ` · ${states[d.id]?.label}` : ''}</span></li>)}</ul> : <p className="muted small">No external accounts connected.</p>}
    <div className="row gap"><button type="button" className="btn ghost" onClick={onSignOut}><LogOut size={15} /> Sign out</button></div>
  </>);
}

function Privacy({ caps }: { caps: Capabilities }) {
  const { defs, states, disconnect } = useIntegrations();
  const [shares, setShares] = useState<ShareRecord[] | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    if (!caps.sharing) return;
    try { setShares(await listShares()); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not load shared links'); }
  }, [caps.sharing]);
  useEffect(() => { void load(); }, [load]);
  const active = (shares ?? []).filter((s) => !s.revoked_at && (!s.expires_at || Date.parse(s.expires_at) > Date.now()));
  const connected = defs.filter((d) => d.kind === 'account' && states[d.id]?.status === 'connected');
  return (<>
    <h3 className="group-title">Shared conversations</h3>
    {!caps.sharing ? <p className="note">Sharing isn’t installed on this Supabase project (migration 03), so nothing is shared.</p>
      : active.length === 0 ? <p className="muted small">You have no active shared links.</p>
      : <ul className="share-list">{active.map((s) => <li key={s.id}><span><strong>{s.title}</strong><br /><small>Created {new Date(s.created_at).toLocaleDateString()} · {s.expires_at ? `expires ${new Date(s.expires_at).toLocaleDateString()}` : 'no expiry'}</small></span>
        <button type="button" className="btn ghost danger-text" onClick={() => { void revokeShare(s.id).then(load).then(() => toast('info', 'Link revoked')).catch((e: unknown) => toast('error', 'Could not revoke', e instanceof Error ? e.message : undefined)); }}>Revoke</button></li>)}</ul>}
    {err && <p className="error-text" role="alert">{err}</p>}
    <h3 className="group-title">Authorized integrations</h3>
    {connected.length === 0 ? <p className="muted small">No integration currently has access to your accounts.</p> : connected.map((d) => (
      <div key={d.id} className="perm-card"><div><strong>{d.name}</strong><ul>{d.permissions?.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <button type="button" className="btn ghost danger-text" disabled={states[d.id]?.busy} onClick={() => { void disconnect(d.id); }}>Revoke access</button></div>))}
    <h3 className="group-title">On this device</h3>
    <Row title="Reset preferences" desc="Restores theme, layout and sound settings (audio goes back to off)."><button type="button" className="btn ghost" onClick={() => { resetPrefs(); toast('info', 'Preferences reset'); }}>Reset</button></Row>
  </>);
}

export default function SettingsModal({ open, section, onSection, onClose, userId, email, caps, onSignOut, onName, onPrompt, onView }: {
  open: boolean; section: SettingsSection; onSection: (s: SettingsSection) => void; onClose: () => void; userId: string; email?: string; caps: Capabilities;
  onSignOut: () => void; onName: (n: string) => void; onPrompt: (p: string) => void; onView: (v: 'library') => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Settings" wide className="settings">
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" className={section === s.id ? 'active' : ''} aria-current={section === s.id ? 'page' : undefined} onClick={() => onSection(s.id)}>
              {section === s.id && <motion.span layoutId="set-pill" className="set-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              <span className="row-in">{s.icon}{s.label}</span>
            </button>
          ))}
        </nav>
        <div className="settings-body">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={section} variants={fadeUp} initial="hidden" animate="show" exit="exit" className="stack">
              <h3 className="section-title">{SECTIONS.find((s) => s.id === section)?.label}</h3>
              {section === 'appearance' && <Appearance />}
              {section === 'workspace' && <Workspace />}
              {section === 'sound' && <Sound />}
              {section === 'integrations' && <IntegrationsPanel onPrompt={(t) => { onClose(); onPrompt(t); }} onView={(v) => { onClose(); onView(v); }} />}
              {section === 'account' && <Account userId={userId} email={email} onSignOut={onSignOut} onName={onName} />}
              {section === 'privacy' && <Privacy caps={caps} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
}

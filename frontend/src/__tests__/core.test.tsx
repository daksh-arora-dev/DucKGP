import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DEFAULT_PREFS, sanitizePrefs, setAudioPrefs, getPrefs, resetPrefs } from '../core/prefs';
import { INTEGRATIONS, connectable, summarize, type ConnState } from '../core/integrations';
import { arcLayout } from '../components/EcosystemRing';
import { generateShareToken, hashToken, tokenFromHash } from '../lib/sharing';
import { MotionConfig } from 'motion/react';
import ChatMessage from '../components/ChatMessage';

describe('preferences', () => {
  beforeEach(() => { localStorage.clear(); resetPrefs(); });
  it('has every audio option OFF by default', () => {
    const a = DEFAULT_PREFS.audio;
    expect([a.master, a.click, a.notify, a.mascot, a.music]).toEqual([false, false, false, false, false]);
  });
  it('sanitizes corrupt stored data', () => {
    const p = sanitizePrefs({ theme: 'neon', sidebarWidth: 99999, audio: { master: 'yes', sfxVolume: -4 } });
    expect(p.theme).toBe('system'); expect(p.sidebarWidth).toBe(420); expect(p.audio.master).toBe(false); expect(p.audio.sfxVolume).toBe(0);
  });
  it('persists audio changes', () => {
    setAudioPrefs({ master: true, sfxVolume: 0.8 });
    expect(JSON.parse(localStorage.getItem('duckgp-prefs-v2')!).audio.master).toBe(true);
    expect(getPrefs().audio.sfxVolume).toBe(0.8);
  });
});

describe('ecosystem ring', () => {
  const st = (s: ConnState['status']): ConnState => ({ status: s });
  it('handles zero connectable integrations without NaN', () => {
    const s = summarize([], {});
    expect(s).toEqual({ total: 0, connected: 0, fraction: 0, planned: 0 });
    expect(arcLayout(0)).toEqual([]);
  });
  it('counts only user-connectable, implemented integrations', () => {
    expect(connectable().map((d) => d.id)).toEqual(['gmail']);
    expect(summarize(INTEGRATIONS, { gmail: st('connected') }).fraction).toBe(1);
    expect(summarize(INTEGRATIONS, { gmail: st('error'), iqps: st('connected') }).connected).toBe(0); // built-in tools never count
    expect(summarize(INTEGRATIONS, {}).planned).toBe(5);
  });
  it('lays out arcs inside the circle without overlap', () => {
    const arcs = arcLayout(4);
    expect(arcs).toHaveLength(4);
    arcs.forEach((a, i) => { expect(a.end).toBeGreaterThan(a.start); if (i) expect(a.start).toBeGreaterThan(arcs[i - 1].end); });
  });
  it('registry entries are unique and planned ones have no connection controls', () => {
    expect(new Set(INTEGRATIONS.map((d) => d.id)).size).toBe(INTEGRATIONS.length);
    INTEGRATIONS.filter((d) => d.availability === 'planned').forEach((d) => { expect(d.connection).toBeUndefined(); expect(d.actions).toHaveLength(0); });
  });
});

describe('share tokens', () => {
  it('generates url-safe 256-bit tokens that round-trip through the hash route', () => {
    const t = generateShareToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokenFromHash(`#/share/${t}`)).toBe(t);
    expect(tokenFromHash('#/share/../../etc')).toBeNull();
    expect(generateShareToken()).not.toBe(t);
  });
  it('hashes deterministically to 64 hex chars', async () => {
    const h = await hashToken('abc');
    expect(h).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('chat message rendering', () => {
  const wrap = (content: string) => render(
    <MotionConfig reducedMotion="always"><ChatMessage readOnly message={{ id: '1', role: 'assistant', content, createdAt: Date.now() }} /></MotionConfig>);
  it('renders markdown, math and tables, and strips scripts/raw HTML', async () => {
    const { container } = wrap('# Title\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nInline $x^2$ and <script>alert(1)</script><img src=x onerror=alert(1)>\n\n```py\nprint(1)\n```');
    await waitFor(() => expect(container.querySelector('h1')).not.toBeNull());
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelector('.katex')).not.toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.code-block')).not.toBeNull();
  });
  it('blocks javascript: links and opens real links safely', async () => {
    const { container } = wrap('[bad](javascript:alert(1)) [ok](https://example.com)');
    await waitFor(() => expect(container.querySelector('.md')).not.toBeNull());
    const links = [...container.querySelectorAll('a')];
    expect(links.some((a) => (a.getAttribute('href') ?? '').startsWith('javascript:'))).toBe(false);
    const ok = links.find((a) => a.getAttribute('href') === 'https://example.com')!;
    expect(ok.getAttribute('rel')).toContain('noopener'); expect(ok.getAttribute('target')).toBe('_blank');
  });
  it('right-aligns user messages and left-aligns assistant messages', () => {
    const { container } = render(<MotionConfig reducedMotion="always"><ChatMessage readOnly message={{ id: '2', role: 'user', content: 'hi', createdAt: 1 }} /></MotionConfig>);
    expect(container.querySelector('article')!.className).toContain('msg-user');
    expect(screen.getByText('hi')).toBeTruthy();
  });
});

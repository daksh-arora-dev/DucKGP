/**
 * Integration registry. Adding an integration = adding one object here.
 *
 * kind:
 *  - 'account'     user authorizes their own account (counted by the Ecosystem Ring)
 *  - 'public-tool' built-in public MCP tool, no user authorization (never counted as "connected")
 *  - 'workspace'   part of the DucKGP account itself (Supabase)
 * availability 'planned' = not implemented in the backend; shown as such, never as operational.
 */
import { Backpack, BookOpen, Building2, CalendarDays, FileSearch2, GraduationCap, Github, HardDrive, Mail, MapPinned, NotebookText, UserSearch, type LucideIcon } from 'lucide-react';
import { apiRequest } from '../lib/api';

export type Category = 'Academics' | 'Campus' | 'Communication' | 'Productivity' | 'Developer Tools' | 'Storage';
export const CATEGORIES: Category[] = ['Academics', 'Campus', 'Communication', 'Productivity', 'Developer Tools', 'Storage'];
export type Kind = 'account' | 'public-tool' | 'workspace';

export interface ConnectionAdapter {
  status(): Promise<{ connected: boolean; label?: string }>;
  /** Starts authorization (may redirect the page). */
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export interface IntegrationAction { id: string; label: string; prompt?: string; needsConnection?: boolean; view?: 'library' }

export interface IntegrationDef {
  id: string;
  name: string;
  description: string;
  category: Category;
  kind: Kind;
  availability: 'available' | 'planned';
  icon: LucideIcon;
  /** Backend MCP tool names (from kgp_student_assistant/mcp/server.py). */
  tools?: string[];
  permissions?: string[];
  setup?: string[];
  actions: IntegrationAction[];
  connection?: ConnectionAdapter;
  note?: string;
}

const gmail: ConnectionAdapter = {
  async status() {
    const d = await apiRequest<{ connected?: boolean; email?: string | null }>('/gmail/status');
    return { connected: Boolean(d.connected ?? d.email), label: d.email ?? undefined };
  },
  async connect() {
    const { url } = await apiRequest<{ url: string }>('/gmail/connect', 'POST');
    if (typeof url !== 'string' || !url.startsWith('https://accounts.google.com/')) throw new Error('Google authorization URL is invalid.');
    window.location.assign(url);
  },
  async disconnect() { await apiRequest('/gmail/disconnect', 'DELETE'); },
};

export const INTEGRATIONS: IntegrationDef[] = [
  {
    id: 'gmail', name: 'Gmail', category: 'Communication', kind: 'account', availability: 'available', icon: Mail,
    description: 'Let DucKGP search your inbox when you ask. Read-only.',
    tools: ['search_gmail'],
    permissions: ['Read-only access to your Gmail messages (gmail.readonly)', 'Refresh token stored encrypted on the DucKGP server'],
    setup: ['Backend needs Google OAuth credentials and redirect URI configured', 'You approve read access on Google’s consent screen'],
    connection: gmail,
    actions: [
      { id: 'unread', label: 'Summarize unread mail', prompt: 'Search my Gmail for unread messages and summarize them.', needsConnection: true },
      { id: 'sent', label: 'Find something I sent', prompt: 'Search my sent Gmail for ', needsConnection: true },
    ],
  },
  {
    id: 'iqps', name: 'IQPS', category: 'Academics', kind: 'public-tool', availability: 'available', icon: FileSearch2,
    description: 'Previous-year question papers by course code or name.',
    tools: ['search_pyqs'], permissions: ['Public data only — no account access'],
    actions: [{ id: 'pyq', label: 'Find midsem papers', prompt: 'Find CH21207 Fluid Mechanics previous-year midsem papers' }],
  },
  {
    id: 'metakgp-chillzone', name: 'MetaKGP Chillzone', category: 'Campus', kind: 'public-tool', availability: 'available', icon: Building2,
    description: 'Timetable-based empty classrooms (not live occupancy).',
    tools: ['find_empty_classrooms'], permissions: ['Public data only — no account access'],
    actions: [{ id: 'rooms', label: 'Empty classrooms now', prompt: 'Which classrooms are free right now?' }],
  },
  {
    id: 'metakgp-wimp', name: 'MetaKGP WIMP', category: 'Campus', kind: 'public-tool', availability: 'available', icon: UserSearch,
    description: 'Where a professor is scheduled to teach (not real-time location).',
    tools: ['where_is_my_prof'], permissions: ['Public data only — no account access'],
    actions: [{ id: 'prof', label: 'Find a professor’s class', prompt: 'Where is my professor scheduled to teach today? Professor: ' }],
  },
  {
    id: 'library', name: 'Library', category: 'Storage', kind: 'workspace', availability: 'available', icon: BookOpen,
    description: 'Your private documents and moderated shared resources, stored in Supabase.',
    permissions: ['Private files visible only to you (row-level security)'],
    note: 'The assistant cannot read library files yet — there is no library tool in the backend.',
    actions: [{ id: 'open', label: 'Open library', view: 'library' }],
  },
  { id: 'erp', name: 'IIT KGP ERP', category: 'Academics', kind: 'account', availability: 'planned', icon: GraduationCap, description: 'Grades, timetable and registration.', note: 'Backend tool is a placeholder.', actions: [] },
  { id: 'google-calendar', name: 'Google Calendar', category: 'Productivity', kind: 'account', availability: 'planned', icon: CalendarDays, description: 'Schedule and reminders.', actions: [] },
  { id: 'google-drive', name: 'Google Drive', category: 'Storage', kind: 'account', availability: 'planned', icon: HardDrive, description: 'Search your Drive files.', actions: [] },
  { id: 'notion', name: 'Notion', category: 'Productivity', kind: 'account', availability: 'planned', icon: NotebookText, description: 'Notes and wikis.', actions: [] },
  { id: 'github', name: 'GitHub', category: 'Developer Tools', kind: 'account', availability: 'planned', icon: Github, description: 'Repos, issues and PRs.', actions: [] },
];

export const connectable = (defs: IntegrationDef[] = INTEGRATIONS) =>
  defs.filter((d) => d.kind === 'account' && d.availability === 'available' && d.connection);
export const planned = (defs: IntegrationDef[] = INTEGRATIONS) => defs.filter((d) => d.availability === 'planned');
export const builtIn = (defs: IntegrationDef[] = INTEGRATIONS) => defs.filter((d) => d.kind !== 'account' && d.availability === 'available');
export const iconFallback = Backpack;
export const mapIcon = MapPinned;

export type ConnStatus = 'unknown' | 'checking' | 'connected' | 'disconnected' | 'error';
export interface ConnState { status: ConnStatus; label?: string; error?: string; busy?: boolean }

export interface RingSummary { total: number; connected: number; fraction: number; planned: number }
/** Pure + division-safe, so the ring can be unit-tested. */
export function summarize(defs: IntegrationDef[], states: Record<string, ConnState | undefined>): RingSummary {
  const list = connectable(defs);
  const connected = list.filter((d) => states[d.id]?.status === 'connected').length;
  return { total: list.length, connected, fraction: list.length === 0 ? 0 : connected / list.length, planned: planned(defs).length };
}

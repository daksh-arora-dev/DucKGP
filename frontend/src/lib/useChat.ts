import { useCallback, useEffect, useRef, useState } from 'react';
import { sendChatMessage } from './chatApi';
import {
  deleteCloudConversation, deleteCloudMessage, loadCloudConversations, loadConversationMessages,
  renameCloudConversation, setConversationFlag,
} from './chatHistory';
import { sharingAvailable } from './sharing';
import { conversationTitle, createConversation } from './storage';
import type { Capabilities, ChatMessage, Conversation } from './types';
import { duck } from '../core/duck';
import { sfx } from '../core/audio';
import { toast } from '../core/toast';

export const MAX_MESSAGE = 6000; // FastAPI ChatRequest.message max_length

function errorMessage(detail: string, prompt: string): ChatMessage {
  return { id: crypto.randomUUID(), role: 'assistant', createdAt: Date.now(), error: true, local: true, content: `Something went wrong: **${detail}**\n\nYour message was: _${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}_`, toolsUsed: undefined };
}

/** Merge server truth with local-only extras (error notes; tool metadata the DB may not store). */
function reconcile(local: ChatMessage[], remote: ChatMessage[]): ChatMessage[] {
  const meta = new Map(local.filter((m) => m.role === 'assistant' && (m.toolsUsed || m.sources)).map((m) => [m.content, m]));
  const merged = remote.map((m) => {
    const hit = meta.get(m.content);
    return hit ? { ...m, toolsUsed: m.toolsUsed ?? hit.toolsUsed, sources: m.sources ?? hit.sources } : m;
  });
  const extras = local.filter((m) => m.error && m.local);
  return [...merged, ...extras].sort((a, b) => a.createdAt - b.createdAt);
}

export function useChat(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [stopped, setStopped] = useState<Record<string, boolean>>({});
  const [caps, setCaps] = useState<Capabilities>({ organize: false, sharing: false, messageDelete: 'unknown' });
  const controllers = useRef(new Map<string, AbortController>());
  const convRef = useRef<Conversation[]>([]);
  convRef.current = conversations;

  const patchConv = useCallback((id: string, fn: (c: Conversation) => Conversation) =>
    setConversations((cur) => cur.map((c) => (c.id === id ? fn(c) : c))), []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true); setLoadError('');
    (async () => {
      try {
        const [{ conversations: saved, organize }, sharing] = await Promise.all([loadCloudConversations(userId), sharingAvailable().catch(() => false)]);
        if (cancelled) return;
        const fresh = createConversation();
        const next = [fresh, ...saved];
        setConversations(next);
        setSelectedId(saved.find((c) => !c.archivedAt)?.id ?? fresh.id);
        setCaps((c) => ({ ...c, organize, sharing }));
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not load chat history.');
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [userId, retryKey]);

  const active = conversations.find((c) => c.id === selectedId) ?? conversations[0];
  const activeId = active?.id ?? '';
  const isBusy = busyIds.includes(activeId);
  const setBusy = (id: string, on: boolean) => setBusyIds((cur) => (on ? [...new Set([...cur, id])] : cur.filter((x) => x !== id)));

  const reloadConversation = useCallback(async (id: string) => {
    try {
      const remote = await loadConversationMessages(id);
      if (!remote.length) return false;
      patchConv(id, (c) => ({ ...c, messages: reconcile(c.messages, remote) }));
      return true;
    } catch { return false; }
  }, [patchConv]);

  const newChat = useCallback(() => {
    const empty = convRef.current.find((c) => c.messages.length === 0);
    if (empty) { setSelectedId(empty.id); return empty.id; }
    const fresh = createConversation();
    setConversations((cur) => [fresh, ...cur]);
    setSelectedId(fresh.id);
    return fresh.id;
  }, []);

  const send = useCallback(async (raw: string, targetId?: string) => {
    const content = raw.trim();
    const id = targetId ?? activeId;
    if (loading || !content || !id || content.length > MAX_MESSAGE || controllers.current.has(id)) return;
    const controller = new AbortController();
    controllers.current.set(id, controller);
    const conv = convRef.current.find((c) => c.id === id);
    const previous = conv?.messages.filter((m) => !m.error) ?? [];
    const outgoing: ChatMessage = { id: crypto.randomUUID(), role: 'user', content, createdAt: Date.now(), local: true };
    patchConv(id, (c) => ({ ...c, title: c.messages.length === 0 ? conversationTitle(content) : c.title, messages: [...c.messages, outgoing], updatedAt: Date.now() }));
    setStopped((s) => ({ ...s, [id]: false }));
    setBusy(id, true); duck.thinking(true); sfx('send');
    try {
      const result = await sendChatMessage(content, id, previous, controller.signal);
      const incoming: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: result.reply, createdAt: Date.now(), toolsUsed: result.toolsUsed, sources: result.sources, local: true };
      patchConv(id, (c) => ({ ...c, messages: [...c.messages, incoming], updatedAt: Date.now() }));
      duck.thinking(false); duck.success(); sfx('done');
      void reloadConversation(id); // swap local ids for real Supabase ids (needed for delete)
    } catch (e) {
      if (controller.signal.aborted) return;
      duck.thinking(false); duck.error();
      patchConv(id, (c) => ({ ...c, messages: [...c.messages, errorMessage(e instanceof Error ? e.message : 'Unexpected error', content)] }));
    } finally {
      if (controllers.current.get(id) === controller) controllers.current.delete(id);
      setBusy(id, false);
      if (controllers.current.size === 0) duck.thinking(false);
    }
  }, [activeId, loading, patchConv, reloadConversation]);

  const cancel = useCallback((id = activeId) => {
    const c = controllers.current.get(id);
    if (!c) return;
    c.abort(); controllers.current.delete(id);
    setBusy(id, false); setStopped((s) => ({ ...s, [id]: true }));
    if (controllers.current.size === 0) duck.thinking(false);
  }, [activeId]);

  const select = useCallback((id: string) => setSelectedId(id), []);

  const remove = useCallback(async (id: string) => {
    cancel(id);
    const conv = convRef.current.find((c) => c.id === id);
    try {
      if (conv?.messages.length) await deleteCloudConversation(id);
      const rest = convRef.current.filter((c) => c.id !== id);
      const next = rest.some((c) => c.messages.length === 0) ? rest : [createConversation(), ...rest];
      setConversations(next);
      if (selectedId === id) setSelectedId(next.find((c) => !c.archivedAt)?.id ?? next[0].id);
      toast('info', 'Conversation deleted');
    } catch (e) { toast('error', 'Could not delete chat', e instanceof Error ? e.message : undefined); duck.error(); }
  }, [cancel, selectedId]);

  const rename = useCallback(async (id: string, title: string) => {
    const clean = title.replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!clean) return;
    const before = convRef.current.find((c) => c.id === id)?.title;
    patchConv(id, (c) => ({ ...c, title: clean }));
    try { await renameCloudConversation(id, clean); }
    catch (e) { if (before) patchConv(id, (c) => ({ ...c, title: before })); toast('error', 'Rename failed', e instanceof Error ? e.message : undefined); }
  }, [patchConv]);

  const toggleFlag = useCallback(async (id: string, flag: 'pinned_at' | 'archived_at') => {
    if (!caps.organize) { toast('info', 'Needs migration 02', 'Pin and archive require the optional organize-chats migration.'); return; }
    const key = flag === 'pinned_at' ? 'pinnedAt' : 'archivedAt';
    const cur = convRef.current.find((c) => c.id === id)?.[key];
    try {
      const value = await setConversationFlag(id, flag, !cur);
      patchConv(id, (c) => ({ ...c, [key]: value }));
      if (flag === 'archived_at' && value && selectedId === id) setSelectedId(convRef.current.find((c) => c.id !== id && !c.archivedAt)?.id ?? newChat());
    } catch (e) { toast('error', 'Could not update chat', e instanceof Error ? e.message : undefined); }
  }, [caps.organize, patchConv, selectedId, newChat]);

  const deleteMessage = useCallback(async (convId: string, message: ChatMessage) => {
    if (message.error && message.local) { patchConv(convId, (c) => ({ ...c, messages: c.messages.filter((m) => m.id !== message.id) })); return; }
    try {
      const ok = await deleteCloudMessage(message.id);
      if (!ok) {
        setCaps((c) => ({ ...c, messageDelete: false }));
        toast('info', 'Message delete is not enabled', 'Install migration 02 (adds a DELETE policy on messages), or the message was not saved yet.');
        return;
      }
      setCaps((c) => ({ ...c, messageDelete: true }));
      patchConv(convId, (c) => ({ ...c, messages: c.messages.filter((m) => m.id !== message.id) }));
    } catch (e) { toast('error', 'Could not delete message', e instanceof Error ? e.message : undefined); }
  }, [patchConv]);

  const checkLate = useCallback(async (id: string) => {
    const found = await reloadConversation(id);
    toast(found ? 'success' : 'info', found ? 'Conversation refreshed' : 'Nothing new yet');
    setStopped((s) => ({ ...s, [id]: false }));
  }, [reloadConversation]);

  useEffect(() => () => { controllers.current.forEach((c) => c.abort()); duck.thinking(false); }, []);

  return {
    conversations, active, activeId, isBusy, loading, loadError, caps, stopped,
    retryLoad: () => setRetryKey((n) => n + 1), newChat, select, send, cancel, remove, rename,
    togglePin: (id: string) => toggleFlag(id, 'pinned_at'), toggleArchive: (id: string) => toggleFlag(id, 'archived_at'),
    deleteMessage, checkLate, setConversations,
  };
}

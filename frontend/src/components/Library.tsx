import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

type Tab = 'personal' | 'shared';
type StoredFile = {
  id: string;
  filename: string;
  storage_path: string;
  file_size: number;
};
type Document = StoredFile;
type Resource = StoredFile & {
  title: string;
  author_name: string;
  course_code: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  uploader_id: string;
};

const MAX_BYTES = 20 * 1024 * 1024;
const EXTENSIONS = ['pdf', 'doc', 'docx', 'pptx', 'xlsx', 'txt', 'png', 'jpg', 'jpeg'];

export default function Library({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('personal');
  const [userId, setUserId] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [course, setCourse] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refresh() {
    const [own, shared] = await Promise.all([
      supabase.from('documents')
        .select('id, filename, storage_path, file_size')
        .order('created_at', { ascending: false }),
      supabase.from('resources')
        .select('id, filename, storage_path, file_size, title, author_name, course_code, description, status, uploader_id')
        .order('created_at', { ascending: false }),
    ]);
    if (own.error) throw own.error;
    if (shared.error) throw shared.error;
    setDocuments(own.data ?? []);
    setResources((shared.data ?? []) as Resource[]);
  }

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) throw new Error('Please log in again.');
        if (!active) return;
        setUserId(data.user.id);
        await refresh();
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load files');
      }
    }
    void initialize();
    return () => { active = false; };
  }, []);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    const form = event.currentTarget;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (!userId) throw new Error('Your account is still loading.');
      if (file.size === 0 || file.size > MAX_BYTES) {
        throw new Error('Choose a nonempty file smaller than 20 MB.');
      }
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!EXTENSIONS.includes(ext)) throw new Error('Unsupported file type.');
      if (tab === 'shared' && (!title.trim() || !author.trim())) {
        throw new Error('Title and author are required.');
      }

      const bucket = tab === 'personal' ? 'personal-documents' : 'shared-resources';
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket).upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      if (tab === 'personal') {
        const { error: dbError } = await supabase
            .from('documents')
            .insert({
                owner_id: userId,
                filename: file.name,
                storage_path: path,
                file_size: file.size,
            });

        if (dbError) {
            await supabase.storage.from(bucket).remove([path]);
            throw dbError;
            }
        } else {
            const { error: dbError } = await supabase
            .from('resources')
            .insert({
                uploader_id: userId,
                filename: file.name,
                storage_path: path,
                file_size: file.size,
                title: title.trim(),
                author_name: author.trim(),
                course_code: course.trim(),
                description: description.trim(),
            });

        if (dbError) {
            await supabase.storage.from(bucket).remove([path]);
            throw dbError;
        }
    }

      await refresh();
      form.reset();
      setFile(null);
      setTitle(''); setAuthor(''); setCourse(''); setDescription('');
      setNotice(tab === 'shared' ? 'Uploaded. Awaiting moderator approval.' : 'Document saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function download(bucket: string, item: StoredFile) {
    setError('');
    const { data, error } = await supabase.storage.from(bucket)
      .createSignedUrl(item.storage_path, 60, { download: item.filename });
    if (error || !data) {
      setError(error?.message ?? 'Unable to download file');
      return;
    }
    window.location.assign(data.signedUrl);
  }

  async function remove(bucket: string, table: 'documents' | 'resources', item: StoredFile) {
    if (!window.confirm(`Delete ${item.filename}?`)) return;
    setError('');
    setBusy(true);
    try {
      const { error } = await supabase.from(table).delete().eq('id', item.id);
      if (error) throw error;
      const { error: storageError } = await supabase.storage.from(bucket).remove([item.storage_path]);
      if (storageError) throw new Error('Record deleted, but storage cleanup failed: ' + storageError.message);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      try { await refresh(); } catch { /* Keep the original error. */ }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="library-page">
      <div className="library-panel">
        <button onClick={onBack}>← Back to DucKGP chat</button>
        <h1>DucKGP Library</h1>
        <div className="library-tabs">
          <button onClick={() => { setTab('personal'); setFile(null); }} disabled={busy}>My documents</button>
          <button onClick={() => { setTab('shared'); setFile(null); }} disabled={busy}>Shared resources</button>
        </div>
        <p>{tab === 'personal' ? 'Only you can see these documents.' : 'Approved resources are visible to signed-in students.'}</p>

        <form className="library-form" onSubmit={upload}>
          <input key={tab} type="file" required
            accept=".pdf,.doc,.docx,.pptx,.xlsx,.txt,.png,.jpg,.jpeg"
            onChange={event => setFile(event.target.files?.[0] ?? null)} />
          {tab === 'shared' && <>
            <input placeholder="Resource title" value={title} onChange={event => setTitle(event.target.value)} required />
            <input placeholder="Author name" value={author} onChange={event => setAuthor(event.target.value)} required />
            <input placeholder="Course code (e.g. CH21207)" value={course} onChange={event => setCourse(event.target.value)} />
            <textarea placeholder="Description (optional)" value={description}
              onChange={event => setDescription(event.target.value)} />
          </>}
          <button type="submit" disabled={busy || !userId}>{busy ? 'Working...' : 'Upload file'}</button>
        </form>
        {error && <p className="auth-error">{error}</p>}
        {notice && <p className="auth-message">{notice}</p>}

        <h2>{tab === 'personal' ? 'My files' : 'Available resources'}</h2>
        {tab === 'shared' && <input className="library-search" placeholder="Search by title, author, course" value={search} onChange={e => setSearch(e.target.value)} />}
        {tab === 'personal'
          ? documents.map(item => <div className="library-item" key={item.id}>
              <span>{item.filename}</span>
              <button onClick={() => void download('personal-documents', item)}>Download</button>
              <button disabled={busy} onClick={() => void remove('personal-documents', 'documents', item)}>Delete</button>
            </div>)
          : resources.filter(item => `${item.title} ${item.author_name} ${item.course_code}`.toLowerCase().includes(search.toLowerCase())).map(item => <div className="library-item" key={item.id}>
              <span><strong>{item.title}</strong> — {item.author_name} · {item.course_code || 'General'}
                {item.uploader_id === userId && ` · ${item.status}`}
                {item.description && <small> — {item.description}</small>}</span>
              <button onClick={() => void download('shared-resources', item)}>Download</button>
              {item.uploader_id === userId &&
                <button disabled={busy} onClick={() => void remove('shared-resources', 'resources', item)}>Delete</button>}
            </div>)}
      </div>
    </div>
  );
}
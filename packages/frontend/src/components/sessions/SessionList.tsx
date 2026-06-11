import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Pencil, Check, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/stores/session.store';
import { api } from '@/api/http';
import type { SessionSummary } from '@claudedeck/shared';

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  return `${mo}mo`;
}

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  session: SessionSummary;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onRename: (id: string, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(session.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== session.title) onRename(session.id, trimmed);
    setEditing(false);
  }

  function cancelEdit() {
    setDraft(session.title);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') cancelEdit();
  }

  return (
    <div
      className={cn(
        'group relative flex w-full items-start gap-1.5 px-3 py-2 text-left transition-colors hover:bg-accent cursor-pointer',
        isActive && 'bg-accent'
      )}
      onClick={editing ? undefined : onSelect}
    >
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitEdit}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded border border-ring bg-background px-1.5 py-0.5 text-xs text-foreground outline-none"
            autoFocus
          />
        ) : (
          <span className="block truncate text-xs leading-snug">{session.title}</span>
        )}
        <span className="text-[10px] text-muted-foreground/50 mt-0.5 block">
          {timeAgo(session.updatedAt)}
        </span>
      </div>

      {!editing && (
        <div className="hidden group-hover:flex shrink-0 items-center gap-0.5 mt-0.5">
          <button
            onClick={startEdit}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            title="Rename"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-0.5 text-muted-foreground hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      {editing && (
        <div className="flex shrink-0 items-center gap-0.5 mt-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); commitEdit(); }}
            className="rounded p-0.5 text-green-500 hover:text-green-400"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export function SessionList() {
  const { sessionId: activeId } = useParams<{ sessionId?: string }>();
  const { sessions, setSessions, addSession, removeSession, updateSession } = useSessionStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.sessions.list().then(setSessions).catch(console.error);
  }, [setSessions]);

  const filtered = query.trim()
    ? sessions.filter((s) => s.title.toLowerCase().includes(query.toLowerCase()))
    : sessions;

  async function handleNew() {
    try {
      const session = await api.sessions.create();
      addSession(session);
      navigate(`/session/${session.id}`);
    } catch (err) {
      console.error('Failed to create session', err);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api.sessions.delete(id);
      removeSession(id);
      if (activeId === id) navigate('/');
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  }

  async function handleRename(id: string, title: string) {
    try {
      await api.sessions.rename(id, title);
      updateSession(id, { title });
    } catch (err) {
      console.error('Failed to rename session', err);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-3 space-y-2">
        <Button onClick={handleNew} size="sm" className="w-full gap-2" variant="outline">
          <Plus className="h-4 w-4" />
          New session
        </Button>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions…"
            className="w-full rounded-md border border-border bg-muted/30 pl-7 pr-3 py-1.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-ring"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            {query ? 'No matching sessions' : 'No sessions yet — start one above'}
          </p>
        )}
        {filtered.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            isActive={activeId === session.id}
            onSelect={() => navigate(`/session/${session.id}`)}
            onDelete={(e) => handleDelete(session.id, e)}
            onRename={handleRename}
          />
        ))}
      </div>
    </div>
  );
}

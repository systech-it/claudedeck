import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/stores/session.store';
import { api } from '@/api/http';

export function SessionList() {
  const { sessionId: activeId } = useParams<{ sessionId?: string }>();
  const { sessions, setSessions, addSession, removeSession } = useSessionStore();
  const navigate = useNavigate();

  useEffect(() => {
    api.sessions.list().then(setSessions).catch(console.error);
  }, [setSessions]);

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

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button onClick={handleNew} size="sm" className="w-full gap-2" variant="outline">
          <Plus className="h-4 w-4" />
          New session
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            No sessions yet — start one above
          </p>
        )}
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => navigate(`/session/${session.id}`)}
            className={cn(
              'group flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent',
              activeId === session.id && 'bg-accent'
            )}
          >
            <span className="flex-1 truncate text-sm">{session.title}</span>
            <button
              onClick={(e) => handleDelete(session.id, e)}
              className="hidden shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive group-hover:block"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}

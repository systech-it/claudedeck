import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/api/http';

export default function LoginPage() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    api.auth.setupStatus()
      .then((r) => setNeedsSetup(r.needsSetup))
      .catch(() => setNeedsSetup(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = needsSetup
        ? await api.auth.register({ username, password })
        : await api.auth.login({ username, password });

      setAuth(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (needsSetup === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-logo text-3xl font-semibold tracking-tight">ClaudeDeck</h1>
          <p className="mt-1 text-sm text-muted-foreground">by SysTech Łukasz Grzywacki</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          {needsSetup && (
            <div className="mb-5 rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
              <p className="font-medium">Pierwsze uruchomienie</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Utwórz konto administratora. Po tym rejestracja zostanie wyłączona.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Nazwa użytkownika
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Hasło {needsSetup && <span className="text-muted-foreground/60">(min. 8 znaków)</span>}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={needsSetup ? 'new-password' : 'current-password'}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? 'Proszę czekać…'
                : needsSetup
                  ? 'Utwórz konto admina'
                  : 'Zaloguj się'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, Wifi, WifiOff, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import { useThemeStore } from '@/stores/theme.store';
import { wsClient } from '@/api/ws';
import { SessionList } from '@/components/sessions/SessionList';
import { UpdateBanner } from '@/components/UpdateBanner';

interface Props {
  children: React.ReactNode;
}

export function AppLayout({ children }: Props) {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const { wsConnected, setWsConnected } = useChatStore();
  const { theme, toggle: toggleTheme } = useThemeStore();

  useEffect(() => {
    wsClient.connect();
    const unsub = wsClient.onStatus(setWsConnected);
    return () => {
      unsub();
      wsClient.disconnect();
    };
  }, [setWsConnected]);

  function handleLogout() {
    clearAuth();
    wsClient.disconnect();
    navigate('/login');
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <UpdateBanner />

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="flex-1 font-logo text-base font-semibold tracking-tight claude-gradient-text">ClaudeDeck</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="h-6 w-6"
            >
              {theme === 'dark'
                ? <Sun className="h-3.5 w-3.5" />
                : <Moon className="h-3.5 w-3.5" />}
            </Button>
            {wsConnected ? (
              <Wifi className="h-3.5 w-3.5 text-green-400" aria-label="Connected" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-muted-foreground" aria-label="Disconnected" />
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            <SessionList />
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate text-xs text-muted-foreground">{user?.username}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => navigate('/settings')}
                title="Settings"
                className="h-7 w-7"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleLogout}
                title="Log out"
                className="h-7 w-7"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

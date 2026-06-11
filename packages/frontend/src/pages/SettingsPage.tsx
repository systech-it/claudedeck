import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/api/http';
import type { SystemInfo, VersionInfo } from '@claudedeck/shared';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    api.system.updateCheck().then(setVersionInfo).catch(() => {});
    if (user?.isAdmin) {
      api.system
        .forceUpdateCheck()
        .then(setVersionInfo)
        .catch(() => {});
    }
  }, [user?.isAdmin]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-border p-4">
            <h2 className="mb-3 text-sm font-semibold">Account</h2>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div>Username: <span className="text-foreground">{user?.username}</span></div>
              <div>Role: <span className="text-foreground">{user?.isAdmin ? 'Admin' : 'User'}</span></div>
            </div>
          </section>

          <section className="rounded-lg border border-border p-4">
            <h2 className="mb-3 text-sm font-semibold">Version</h2>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div>Current: <span className="text-foreground">{versionInfo?.current ?? '—'}</span></div>
              {versionInfo?.updateAvailable && (
                <div className="flex items-center gap-2">
                  <span className="text-green-400">Update available: {versionInfo.latest}</span>
                  <a
                    href={versionInfo.releaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline"
                  >
                    View release
                  </a>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border p-4">
            <h2 className="mb-2 text-sm font-semibold">About</h2>
            <p className="text-xs text-muted-foreground">
              ClaudeDeck — Self-hosted web UI for Claude Code CLI<br />
              Created by <strong className="text-foreground">SysTech Łukasz Grzywacki</strong><br />
              <a
                href="https://github.com/systech-it/claudedeck"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                github.com/systech-it/claudedeck
              </a>
            </p>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

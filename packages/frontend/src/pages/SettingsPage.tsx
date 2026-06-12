import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { useSettingsStore } from '@/stores/settings.store';
import { MODELS, EFFORTS } from '@/components/chat/ChatInput';
import { api } from '@/api/http';
import { cn } from '@/lib/utils';
import type { VersionInfo } from '@claudedeck/shared';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { defaultModel, defaultEffort, setDefaultModel, setDefaultEffort } = useSettingsStore();
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    api.system.updateCheck().then(setVersionInfo).catch(() => {});
    if (user?.isAdmin) {
      api.system.forceUpdateCheck().then(setVersionInfo).catch(() => {});
    }
  }, [user?.isAdmin]);

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Default Chat Settings */}
          <section className="rounded-lg border border-border p-4">
            <h2 className="mb-1 text-sm font-semibold">Chat defaults</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              These settings are applied automatically to every new chat. You can still override them per-message.
            </p>

            {/* Default Model */}
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Default model</h3>
              <div className="space-y-1">
                {MODELS.map((m) => (
                  <button
                    key={m.id ?? '_default'}
                    onClick={() => setDefaultModel(m.id)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent',
                      defaultModel === m.id && 'bg-accent/70'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{m.label}</span>
                        <span className="text-xs text-muted-foreground">{m.sublabel}</span>
                        {m.id === undefined && (
                          <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium">
                            recommended
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{m.desc}</div>
                    </div>
                    {defaultModel === m.id && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Effort */}
            <div>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Default effort</h3>
              <div className="space-y-1">
                {EFFORTS.map((ef) => (
                  <button
                    key={ef.id ?? '_default'}
                    onClick={() => setDefaultEffort(ef.id)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent',
                      defaultEffort === ef.id && 'bg-accent/70'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{ef.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{ef.desc}</div>
                    </div>
                    {defaultEffort === ef.id && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Account */}
          <section className="rounded-lg border border-border p-4">
            <h2 className="mb-3 text-sm font-semibold">Account</h2>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div>Username: <span className="text-foreground">{user?.username}</span></div>
              <div>Role: <span className="text-foreground">{user?.isAdmin ? 'Admin' : 'User'}</span></div>
            </div>
          </section>

          {/* Version */}
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

          {/* About */}
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
      </div>
    </AppLayout>
  );
}

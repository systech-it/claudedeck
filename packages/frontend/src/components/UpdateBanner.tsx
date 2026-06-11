import { useState, useEffect } from 'react';
import { X, ArrowUpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { api } from '@/api/http';
import type { VersionInfo } from '@claudedeck/shared';

export function UpdateBanner() {
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api.system
      .updateCheck()
      .then((v) => {
        if (v.updateAvailable) setInfo(v);
      })
      .catch(() => {});
  }, []);

  if (!info?.updateAvailable || dismissed) return null;

  return (
    <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 text-sm">
      <ArrowUpCircle className="h-4 w-4 shrink-0 text-primary" />
      <span className="flex-1">
        <strong>ClaudeDeck {info.latest}</strong> is available.{' '}
        <a
          href={info.releaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary"
        >
          View release notes
        </a>
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0"
        onClick={() => setDismissed(true)}
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

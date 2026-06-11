import { ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PendingPermission } from '@/stores/chat.store';

interface Props {
  permission: PendingPermission;
  onRespond: (allow: boolean) => void;
}

export function PermissionDialog({ permission, onRespond }: Props) {
  return (
    <div className="mx-auto my-3 max-w-lg rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
      <div className="mb-3 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-yellow-400" />
        <span className="text-sm font-semibold text-yellow-300">Permission Required</span>
      </div>

      <p className="mb-1 text-sm font-medium text-foreground">{permission.toolName}</p>
      <p className="mb-4 text-sm text-muted-foreground">{permission.description}</p>

      {Boolean(permission.toolInput) && (
        <pre className="mb-4 max-h-32 overflow-y-auto rounded border border-border/50 bg-background/50 p-2 text-xs text-muted-foreground">
          {typeof permission.toolInput === 'object'
            ? JSON.stringify(permission.toolInput as Record<string, unknown>, null, 2)
            : String(permission.toolInput as string)}
        </pre>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRespond(true)}
          className="gap-1.5 border-green-500/40 text-green-400 hover:bg-green-500/10"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Allow
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRespond(false)}
          className="gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10"
        >
          <XCircle className="h-3.5 w-3.5" />
          Deny
        </Button>
      </div>
    </div>
  );
}

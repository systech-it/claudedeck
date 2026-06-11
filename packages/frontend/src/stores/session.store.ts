import { create } from 'zustand';
import type { SessionSummary } from '@claudedeck/shared';

interface SessionState {
  sessions: SessionSummary[];
  activeSessionId: string | null;
  setSessions: (sessions: SessionSummary[]) => void;
  addSession: (session: SessionSummary) => void;
  updateSession: (id: string, patch: Partial<SessionSummary>) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSessionId: null,

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((s) => ({ sessions: [session, ...s.sessions] })),

  updateSession: (id, patch) =>
    set((s) => ({
      sessions: s.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })),

  removeSession: (id) =>
    set((s) => ({
      sessions: s.sessions.filter((s) => s.id !== id),
      activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
    })),

  setActiveSession: (id) => set({ activeSessionId: id }),
}));

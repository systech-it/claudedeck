export interface Session {
  id: string;
  userId: string;
  title: string;
  projectPath: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  messageCount: number;
}

export interface SessionSummary {
  id: string;
  title: string;
  projectPath: string;
  updatedAt: number;
  isActive: boolean;
  messageCount: number;
}

export interface CreateSessionRequest {
  projectPath: string;
}

export interface RenameSessionRequest {
  title: string;
}

export interface JsonlMessage {
  type: string;
  timestamp?: string;
  message?: {
    role: string;
    content: JsonlContent[] | string;
  };
  aiTitle?: string;
  sessionId?: string;
  costUSD?: number;
  usage?: TokenUsage;
}

export interface JsonlContent {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  id?: string;
  tool_use_id?: string;
  name?: string;
  input?: unknown;
  content?: JsonlContent[] | string;
  thinking?: string;
  is_error?: boolean;
}

export interface HistoryToolCall {
  id: string;
  name: string;
  input: unknown;
  output?: string;
  isError: boolean;
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  tools?: HistoryToolCall[];
  thinking?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
}

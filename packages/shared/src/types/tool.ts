export type ToolName =
  | 'Bash'
  | 'Read'
  | 'Write'
  | 'Edit'
  | 'MultiEdit'
  | 'Glob'
  | 'Grep'
  | 'LS'
  | 'TodoRead'
  | 'TodoWrite'
  | 'WebFetch'
  | 'WebSearch'
  | 'Task'
  | 'NotebookRead'
  | 'NotebookEdit'
  | string;

export type ToolStatus = 'running' | 'success' | 'error';

export interface ToolBlock {
  id: string;
  name: ToolName;
  input: unknown;
  output?: string;
  status: ToolStatus;
}

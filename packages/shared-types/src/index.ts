export type ISODateString = string;

export interface UserProfile {
  id: string;
  displayName: string;
  locale: string;
  timezone: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Fact {
  id: string;
  userId: string;
  category: string;
  content: string;
  source: "user" | "assistant" | "system";
  confidence: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type TaskStatus = "pending" | "in_progress" | "done" | "archived";

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number;
  dueAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type SpeakerRole = "user" | "assistant" | "system";

export interface ConversationTurn {
  id: string;
  sessionId: string;
  role: SpeakerRole;
  content: string;
  tokenCount: number | null;
  createdAt: ISODateString;
}

export interface ToolCall {
  id: string;
  turnId: string;
  toolName: string;
  inputJson: string;
  outputJson: string | null;
  status: "success" | "error" | "running";
  startedAt: ISODateString;
  endedAt: ISODateString | null;
}

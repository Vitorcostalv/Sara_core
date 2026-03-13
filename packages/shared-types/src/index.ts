export type ISODateString = string;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiItemResponse<TData> {
  data: TData;
}

export interface ApiListResponse<TData> {
  data: TData[];
  meta: PaginationMeta;
}

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
  key: string;
  value: string;
  category: string;
  isImportant: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type TaskStatus = "pending" | "in_progress" | "done" | "archived";
export type TaskPriority = 1 | 2 | 3 | 4 | 5;

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type ConversationRole = "user" | "assistant" | "system";
export type ConversationSource = string;

export interface ConversationTurn {
  id: string;
  userId: string;
  role: ConversationRole;
  content: string;
  source: ConversationSource;
  createdAt: ISODateString;
}

export type ToolCallStatus = "success" | "error" | "running";

export interface ToolCall {
  id: string;
  conversationTurnId: string;
  toolName: string;
  inputPayload: JsonValue;
  outputPayload: JsonValue | null;
  status: ToolCallStatus;
  durationMs: number | null;
  createdAt: ISODateString;
}

export type SpeakerRole = ConversationRole;

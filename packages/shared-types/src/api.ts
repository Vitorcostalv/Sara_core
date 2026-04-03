import type {
  BirthDateString,
  ConversationRole,
  ConversationSource,
  ConversationTurn,
  Fact,
  JsonValue,
  Task,
  TaskPriority,
  TaskStatus,
  ToolCall,
  ToolCallStatus,
  UserProfile
} from "./domain";

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

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

export interface PaginatedResponse<TData> {
  data: TData[];
  meta: PaginationMeta;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown | null;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}

export interface HealthStatusResponse {
  status: "ok";
  service: string;
  environment: "development" | "test" | "production";
  timestamp: string;
}

export interface IdPathParam {
  id: string;
}

export interface CreateFactRequest {
  userId?: string;
  key: string;
  value: string;
  category?: string;
  isImportant?: boolean;
}

export interface UpdateFactRequest {
  key?: string;
  value?: string;
  category?: string;
  isImportant?: boolean;
}

export interface MarkFactImportantRequest {
  isImportant?: boolean;
}

export interface ListFactsQuery extends PaginationQuery {
  userId?: string;
  category?: string;
  isImportant?: boolean;
}

export type FactResponse = ApiItemResponse<Fact>;
export type FactsListResponse = PaginatedResponse<Fact>;

export interface CreateTaskRequest {
  userId?: string;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export interface ListTasksQuery extends PaginationQuery {
  userId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}

export type TaskResponse = ApiItemResponse<Task>;
export type TasksListResponse = PaginatedResponse<Task>;

export interface CreateConversationTurnRequest {
  userId?: string;
  role: ConversationRole;
  content: string;
  source?: ConversationSource;
}

export interface ListConversationTurnsQuery extends PaginationQuery {
  userId?: string;
  role?: ConversationRole;
  source?: string;
}

export type ConversationTurnResponse = ApiItemResponse<ConversationTurn>;
export type ConversationTurnsListResponse = PaginatedResponse<ConversationTurn>;

export interface CreateToolCallRequest {
  conversationTurnId: string;
  toolName: string;
  inputPayload: JsonValue;
  outputPayload?: JsonValue | null;
  status?: ToolCallStatus;
  durationMs?: number | null;
}

export interface UpdateToolCallStatusRequest {
  status: ToolCallStatus;
  outputPayload?: JsonValue | null;
  durationMs?: number | null;
}

export interface ListToolCallsQuery extends PaginationQuery {
  conversationTurnId?: string;
  status?: ToolCallStatus;
}

export type ToolCallResponse = ApiItemResponse<ToolCall>;
export type ToolCallsListResponse = PaginatedResponse<ToolCall>;

export type UserProfileResponse = ApiItemResponse<UserProfile>;

export interface UpdateUserProfileRequest {
  displayName?: string;
  preferredName?: string | null;
  fullName?: string | null;
  email?: string | null;
  locale?: string;
  timezone?: string;
  birthDate?: BirthDateString | null;
}

export interface GenerateLlmRequest {
  prompt: string;
  userId?: string;
  ecosystems?: string[];
  maxFacts?: number;
  includeProfile?: boolean;
  dryRun?: boolean;
}

export interface LlmGroundingFactPreview {
  id: string;
  key: string;
  category: string;
  isImportant: boolean;
  valuePreview: string;
}

export interface LlmGroundingEcosystemPreview {
  slug: string;
  factCount: number;
  facts: LlmGroundingFactPreview[];
}

export interface LlmGroundingSummary {
  userId: string;
  profileIncluded: boolean;
  factCount: number;
  ecosystemsUsed: string[];
  warnings: string[];
}

export interface LlmGenerateResult {
  provider: string;
  model: string;
  answer: string | null;
  dryRun: boolean;
  contextPreview: string;
  factsPreview: LlmGroundingFactPreview[];
  ecosystems: LlmGroundingEcosystemPreview[];
  grounding: LlmGroundingSummary;
}

export type LlmGenerateResponse = ApiItemResponse<LlmGenerateResult>;

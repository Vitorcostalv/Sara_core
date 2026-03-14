import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChatCircleDots,
  ClockCounterClockwise,
  Microphone,
  StopCircle,
  UploadSimple,
  Waveform,
  WarningCircle,
} from "@phosphor-icons/react";
import type { ConversationRole, ConversationTurn, PaginationMeta } from "@sara/shared-types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  Input,
  LoadingBlock,
  PageHeader,
  PaginationControls,
  Section,
  Select,
  StatusPill,
  TextArea,
} from "../components/ui";
import { conversationTurnsApi, getApiErrorMessage } from "../services/api/client";
import { sendVoiceInteraction, VoiceApiError, type VoiceInteractionResponse } from "../services/api/voice";
import { formatDateTime } from "../utils/format";

// ─── Voice ───────────────────────────────────────────────────────────────────

type VoiceCaptureStatus = "idle" | "recording" | "uploading";

const preferredMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

function getSupportedRecorderMimeType() {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof MediaRecorder.isTypeSupported !== "function"
  ) {
    return undefined;
  }
  return preferredMimeTypes.find((mime) => MediaRecorder.isTypeSupported(mime));
}

function hasVoiceCaptureSupport() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "MediaRecorder" in window &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

// ─── Conversations list ───────────────────────────────────────────────────────

const initialMeta: PaginationMeta = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

interface ConversationFilters {
  role: "" | ConversationRole;
  source: string;
}

interface ConversationForm {
  role: ConversationRole;
  source: string;
  content: string;
}

const initialForm: ConversationForm = {
  role: "user",
  source: "chat",
  content: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ConversationsPage() {
  // --- voice state ---
  const [captureStatus, setCaptureStatus] = useState<VoiceCaptureStatus>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceResult, setVoiceResult] = useState<VoiceInteractionResponse | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isMountedRef = useRef(true);

  // --- conversation list state ---
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<ConversationFilters>({ role: "", source: "" });
  const [form, setForm] = useState<ConversationForm>(initialForm);

  const stopCurrentStream = () => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  };

  const resetCaptureResources = () => {
    const recorder = mediaRecorderRef.current;

    if (recorder) {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      recorder.onerror = null;

      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // Recorder may already be transitioning to inactive.
        }
      }
    }

    chunksRef.current = [];
    mediaRecorderRef.current = null;
    stopCurrentStream();
  };

  // ── voice effects ──

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      resetCaptureResources();
    };
  }, []);

  useEffect(() => {
    if (captureStatus !== "recording") return;
    const id = window.setInterval(
      () => setRecordingSeconds((s) => s + 1),
      1000
    );
    return () => window.clearInterval(id);
  }, [captureStatus]);

  // ── voice handlers ──

  const uploadAudio = async () => {
    setCaptureStatus("uploading");
    const recorder = mediaRecorderRef.current;
    const blobType =
      recorder?.mimeType && recorder.mimeType.length > 0
        ? recorder.mimeType
        : "audio/webm";

    try {
      const audioBlob = new Blob(chunksRef.current, { type: blobType });

      if (audioBlob.size === 0) {
        if (isMountedRef.current) {
          setVoiceError("Nenhum áudio foi capturado. Tente gravar novamente.");
        }
        return;
      }

      const response = await sendVoiceInteraction({ audioBlob });
      if (isMountedRef.current) {
        setVoiceResult(response);
        setVoiceError(null);
        // Recarrega o histórico para mostrar o turn gerado pela interação de voz
        void loadTurns(1);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      if (error instanceof VoiceApiError && error.status === 404) {
        setVoiceError(
          "Endpoint de voz não encontrado no backend (POST /voice/interactions)."
        );
      } else if (error instanceof Error) {
        setVoiceError(error.message);
      } else {
        setVoiceError("Falha ao enviar o áudio para o backend.");
      }
    } finally {
      resetCaptureResources();

      if (isMountedRef.current) {
        setRecordingSeconds(0);
        setCaptureStatus("idle");
      }
    }
  };

  const startRecording = async () => {
    if (captureStatus !== "idle") return;
    if (!hasVoiceCaptureSupport()) {
      setVoiceError("Este navegador não oferece suporte a gravação com MediaRecorder.");
      return;
    }
    try {
      resetCaptureResources();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedMimeType = getSupportedRecorderMimeType();
      const recorder = supportedMimeType
        ? new MediaRecorder(stream, { mimeType: supportedMimeType })
        : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => void uploadAudio();
      recorder.onerror = () => {
        resetCaptureResources();

        if (isMountedRef.current) {
          setCaptureStatus("idle");
          setVoiceError("Falha durante a gravação de áudio. Tente novamente.");
        }
      };
      recorder.start();

      setRecordingSeconds(0);
      setCaptureStatus("recording");
      setVoiceError(null);
    } catch {
      resetCaptureResources();
      setCaptureStatus("idle");
      setVoiceError(
        "Não foi possível acessar o microfone. Verifique as permissões do navegador."
      );
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    setCaptureStatus("uploading");

    try {
      recorder.stop();
    } catch {
      resetCaptureResources();

      if (isMountedRef.current) {
        setCaptureStatus("idle");
        setVoiceError("Não foi possível finalizar a gravação. Tente novamente.");
      }
    }
  };

  // ── conversation list handlers ──

  const loadTurns = useCallback(
    async (page = meta.page) => {
      setIsLoading(true);
      setListError(null);
      try {
        const response = await conversationTurnsApi.list({
          page,
          pageSize: meta.pageSize,
          role: filters.role || undefined,
          source: filters.source.trim() || undefined,
        });
        setTurns(response.data);
        setMeta(response.meta);
      } catch (error) {
        setListError(getApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [filters.role, filters.source, meta.page, meta.pageSize]
  );

  useEffect(() => {
    void loadTurns(1);
  }, [loadTurns]);

  const onCreateTurn = async () => {
    if (!form.content.trim()) {
      setListError("Conversation content is required.");
      return;
    }
    setIsSubmitting(true);
    setListError(null);
    setSuccessMessage(null);
    try {
      await conversationTurnsApi.create({
        role: form.role,
        source: form.source.trim() || "chat",
        content: form.content.trim(),
      });
      setForm(initialForm);
      setSuccessMessage("Conversation turn added.");
      await loadTurns(1);
    } catch (error) {
      setListError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── derived ──

  const voiceStatusTone =
    captureStatus === "recording"
      ? "warning"
      : captureStatus === "uploading"
        ? "info"
        : "neutral";

  const voiceStatusLabel =
    captureStatus === "recording"
      ? `Gravando (${recordingSeconds}s)`
      : captureStatus === "uploading"
        ? "Enviando áudio..."
        : "Parado";

  const columns = [
    {
      key: "content",
      header: "Content",
      render: (turn: ConversationTurn) => (
        <div>
          <strong>{turn.content.slice(0, 90)}</strong>
          <div className="ui-input-field__hint">{formatDateTime(turn.createdAt)}</div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (turn: ConversationTurn) => <Badge tone="info">{turn.role}</Badge>,
    },
    {
      key: "source",
      header: "Source",
      render: (turn: ConversationTurn) => <Badge tone="neutral">{turn.source}</Badge>,
    },
  ];

  // ── render ──

  return (
    <div className="page-stack">
      <PageHeader
        title="Conversations"
        description="Interação por voz e histórico de turns do assistente."
        icon={<ClockCounterClockwise weight="duotone" />}
      />

      {/* ── Seção de voz ── */}
      <Section
        title="Voice Interaction (MVP)"
        subtitle="Grave sua voz, envie ao backend e receba transcrição e resposta."
      >
        <Card>
          <CardHeader>
            <CardTitle>Microfone</CardTitle>
            <CardDescription>
              Capture sua voz, envie o áudio e receba transcrição/resposta do backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="voice-mvp">
            <div className="voice-mvp__controls">
              <StatusPill tone={voiceStatusTone}>{voiceStatusLabel}</StatusPill>
              <div className="voice-mvp__actions">
                <Button onClick={() => void startRecording()} disabled={captureStatus !== "idle"}>
                  <Microphone weight="duotone" />
                  Iniciar gravação
                </Button>
                <Button
                  variant="secondary"
                  onClick={stopRecording}
                  disabled={captureStatus !== "recording"}
                >
                  {captureStatus === "uploading" ? (
                    <UploadSimple weight="duotone" />
                  ) : (
                    <StopCircle weight="duotone" />
                  )}
                  {captureStatus === "uploading" ? "Enviando..." : "Parar e enviar"}
                </Button>
              </div>
            </div>

            {voiceError ? (
              <div className="voice-mvp__error" role="alert">
                <WarningCircle weight="duotone" />
                <span>{voiceError}</span>
              </div>
            ) : null}

            {voiceResult ? (
              <div className="voice-mvp__result">
                <div className="voice-mvp__result-block">
                  <strong>Transcrição</strong>
                  <p>{voiceResult.transcription ?? "Sem transcrição retornada."}</p>
                </div>
                <div className="voice-mvp__result-block">
                  <strong>Resposta</strong>
                  <p>{voiceResult.assistantText ?? "Sem resposta textual retornada."}</p>
                </div>
                {voiceResult.audioReplyUrl ? (
                  <small>TTS: backend retornou áudio em {voiceResult.audioReplyUrl}</small>
                ) : null}
              </div>
            ) : (
              <div className="voice-mvp__placeholder">
                <Waveform weight="duotone" />
                <p>Nenhuma interação enviada ainda. Grave e envie seu primeiro áudio.</p>
              </div>
            )}

            <small className="voice-mvp__hint">
              Contrato: <code>POST /voice/interactions</code> com{" "}
              <code>multipart/form-data</code> (<code>audio</code> + <code>language</code>).
            </small>
          </CardContent>
        </Card>
      </Section>

      {/* ── Seção de histórico ── */}
      <Section
        title="Conversation Timeline"
        subtitle="Paginated list ordered by backend createdAt DESC."
      >
        <Card>
          <CardHeader>
            <CardTitle>Register Conversation Turn</CardTitle>
          </CardHeader>
          <CardContent className="stack-sm">
            <div className="form-grid">
              <Select
                label="Role"
                value={form.role}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, role: e.target.value as ConversationRole }))
                }
              >
                <option value="user">user</option>
                <option value="assistant">assistant</option>
                <option value="system">system</option>
              </Select>
              <Input
                label="Source"
                value={form.source}
                onChange={(e) => setForm((cur) => ({ ...cur, source: e.target.value }))}
                placeholder="chat"
              />
            </div>
            <TextArea
              label="Content"
              value={form.content}
              onChange={(e) => setForm((cur) => ({ ...cur, content: e.target.value }))}
              placeholder="Conversation turn content"
            />
            <div className="form-actions">
              <Button
                variant="primary"
                onClick={() => void onCreateTurn()}
                disabled={isSubmitting}
              >
                <ChatCircleDots weight="duotone" />
                {isSubmitting ? "Saving..." : "Add Turn"}
              </Button>
              {successMessage ? (
                <span className="form-feedback">{successMessage}</span>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <FilterBar
          actions={
            <Button variant="ghost" onClick={() => setFilters({ role: "", source: "" })}>
              Reset filters
            </Button>
          }
        >
          <Select
            label="Role"
            value={filters.role}
            onChange={(e) =>
              setFilters((cur) => ({
                ...cur,
                role: e.target.value as ConversationFilters["role"],
              }))
            }
          >
            <option value="">All</option>
            <option value="user">user</option>
            <option value="assistant">assistant</option>
            <option value="system">system</option>
          </Select>
          <Input
            label="Source"
            value={filters.source}
            onChange={(e) => setFilters((cur) => ({ ...cur, source: e.target.value }))}
            placeholder="chat"
          />
        </FilterBar>

        {listError ? (
          <ErrorState message={listError} onRetry={() => void loadTurns(meta.page)} />
        ) : null}
        {isLoading ? <LoadingBlock label="Loading conversations..." /> : null}
        {!isLoading && !listError && turns.length === 0 ? (
          <EmptyState
            title="No turns found"
            description="Register turns or adjust current filters."
          />
        ) : null}
        {!isLoading && !listError && turns.length > 0 ? (
          <>
            <DataTable columns={columns} data={turns} rowKey={(turn) => turn.id} />
            <PaginationControls
              meta={meta}
              onPageChange={(page) => void loadTurns(page)}
            />
          </>
        ) : null}
      </Section>
    </div>
  );
}

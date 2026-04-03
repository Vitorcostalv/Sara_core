import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ClockCounterClockwise,
  Microphone,
  StopCircle,
  UploadSimple,
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
} from "../components/ui";
import { conversationTurnsApi, getApiErrorMessage } from "../services/api/client";
import { sendVoiceInteraction, VoiceApiError, type VoiceInteractionResponse } from "../services/api/voice";
import { formatDateTime } from "../utils/format";

type VoiceRequestStatus = "idle" | "recording" | "uploading";
type VoiceInputSource = "file" | "microphone";

const maxAudioUploadBytes = 10 * 1024 * 1024;

const supportedAudioMimeTypes = [
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
] as const;

const supportedAudioExtensions = [
  ".webm",
  ".ogg",
  ".wav",
  ".mp3",
  ".mp4",
  ".m4a",
  ".aac",
] as const;

const mimeTypeByExtension: Record<string, string> = {
  ".webm": "audio/webm",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".mp4": "audio/mp4",
  ".m4a": "audio/x-m4a",
  ".aac": "audio/aac",
};

const acceptedAudioTypes = [...supportedAudioMimeTypes, ...supportedAudioExtensions].join(",");

const preferredMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

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

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

function getSupportedRecorderMimeType() {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof MediaRecorder.isTypeSupported !== "function"
  ) {
    return undefined;
  }

  return preferredMimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

function hasVoiceCaptureSupport() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "MediaRecorder" in window &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

function isInsecureAudioContext() {
  return typeof window !== "undefined" && window.isSecureContext === false;
}

function getVoiceCaptureAvailabilityMessage() {
  if (!hasVoiceCaptureSupport()) {
    return "Este navegador nao oferece suporte a gravacao com MediaRecorder.";
  }

  if (isInsecureAudioContext()) {
    return "A captura de audio exige contexto seguro (HTTPS ou localhost).";
  }

  return null;
}

function getMicrophoneAccessErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "Microfone indisponivel. Conecte um dispositivo de entrada e tente novamente.";
    }

    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return isInsecureAudioContext()
        ? "A captura de audio exige contexto seguro (HTTPS ou localhost)."
        : "Permissao de microfone negada no navegador.";
    }

    if (error.name === "SecurityError") {
      return "A captura de audio exige contexto seguro (HTTPS ou localhost).";
    }

    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "Nao foi possivel ler o microfone. Feche outros apps que estejam usando o dispositivo.";
    }
  }

  if (error instanceof TypeError && isInsecureAudioContext()) {
    return "A captura de audio exige contexto seguro (HTTPS ou localhost).";
  }

  return "Nao foi possivel acessar o microfone. Verifique as permissoes do navegador.";
}

function getFileExtension(fileName: string) {
  const normalizedName = fileName.trim().toLowerCase();
  const extensionIndex = normalizedName.lastIndexOf(".");

  if (extensionIndex < 0) {
    return "";
  }

  return normalizedName.slice(extensionIndex);
}

function getAudioMimeTypeFromFile(file: File) {
  const normalizedMimeType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";

  if (supportedAudioMimeTypes.includes(normalizedMimeType as (typeof supportedAudioMimeTypes)[number])) {
    return normalizedMimeType;
  }

  return mimeTypeByExtension[getFileExtension(file.name)] ?? "";
}

function normalizeAudioFile(file: File) {
  const normalizedMimeType = getAudioMimeTypeFromFile(file);

  if (normalizedMimeType.length === 0 || normalizedMimeType === file.type) {
    return file;
  }

  return new File([file], file.name, {
    type: normalizedMimeType,
    lastModified: file.lastModified,
  });
}

function validateAudioFile(file: File) {
  if (file.size === 0) {
    return "O arquivo selecionado esta vazio.";
  }

  if (file.size > maxAudioUploadBytes) {
    return `O arquivo excede o limite atual de ${formatBytes(maxAudioUploadBytes)}.`;
  }

  const normalizedMimeType = getAudioMimeTypeFromFile(file);
  const extension = getFileExtension(file.name);

  if (
    normalizedMimeType.length === 0 &&
    !supportedAudioExtensions.includes(extension as (typeof supportedAudioExtensions)[number])
  ) {
    return "Formato de audio nao suportado. Use webm, ogg, wav, mp3, mp4, m4a ou aac.";
  }

  return null;
}

function getMicrophoneFileName(blobType: string) {
  if (blobType.includes("ogg")) {
    return "microphone-recording.ogg";
  }

  if (blobType.includes("mp4") || blobType.includes("m4a")) {
    return "microphone-recording.m4a";
  }

  return "microphone-recording.webm";
}

function getVoiceRequestErrorMessage(error: VoiceApiError) {
  const normalizedMessage = error.message.toLowerCase();

  if (error.status === 404) {
    return "Endpoint de voz nao encontrado no backend (POST /api/v1/voice/interactions).";
  }

  if (error.status === 400) {
    if (
      normalizedMessage.includes("uploaded audio file is empty") ||
      normalizedMessage.includes("voice_audio_empty")
    ) {
      return "O backend recebeu um audio vazio. Selecione outro arquivo e tente novamente.";
    }

    if (
      normalizedMessage.includes("audio file is required") ||
      normalizedMessage.includes("voice_audio_required")
    ) {
      return "Selecione um arquivo de audio antes de enviar.";
    }

    return "O backend rejeitou o upload. Revise o arquivo selecionado e tente novamente.";
  }

  if (error.status === 413) {
    return `O arquivo excede o limite configurado no backend (${formatBytes(maxAudioUploadBytes)} no ambiente atual).`;
  }

  if (error.status === 415) {
    return "Formato de audio nao suportado pelo backend. Use webm, ogg, wav, mp3, mp4, m4a ou aac.";
  }

  if (error.status >= 500) {
    if (normalizedMessage.includes("failed to convert audio")) {
      return "O backend nao conseguiu converter o audio enviado. Tente outro arquivo.";
    }

    return "Falha interna ao processar o audio no backend.";
  }

  return error.message;
}

export function ConversationsPage() {
  const [requestStatus, setRequestStatus] = useState<VoiceRequestStatus>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [language, setLanguage] = useState("pt-BR");
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [voiceResult, setVoiceResult] = useState<VoiceInteractionResponse | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [lastInputSource, setLastInputSource] = useState<VoiceInputSource | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isMountedRef = useRef(true);

  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ConversationFilters>({ role: "", source: "" });

  const stopCurrentStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const resetCaptureResources = (stopRecorder = false) => {
    const recorder = mediaRecorderRef.current;

    if (recorder) {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      recorder.onerror = null;

      if (stopRecorder && recorder.state !== "inactive") {
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

  const clearVoiceFeedback = () => {
    setVoiceResult(null);
    setVoiceError(null);
    setVoiceNotice(null);
  };

  const clearSelectedAudioFile = () => {
    setSelectedAudioFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearCurrentAttempt = () => {
    if (requestStatus !== "idle") {
      return;
    }

    clearSelectedAudioFile();
    clearVoiceFeedback();
    setLastInputSource(null);
    setRecordingSeconds(0);
  };

  const loadTurns = useCallback(
    async (page = 1) => {
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
    [filters.role, filters.source, meta.pageSize]
  );

  const submitAudio = useCallback(
    async (audioFile: Blob, source: VoiceInputSource, fileName?: string) => {
      setRequestStatus("uploading");
      setLastInputSource(source);
      setVoiceError(null);
      setVoiceNotice(null);
      setVoiceResult(null);

      try {
        const response = await sendVoiceInteraction({
          audioFile,
          fileName,
          language: language.trim() || undefined,
        });

        if (!isMountedRef.current) {
          return;
        }

        const normalizedTranscription = response.transcription?.trim() ?? "";

        setVoiceResult(response);
        setVoiceError(null);
        setVoiceNotice(
          normalizedTranscription.length === 0
            ? "O backend processou o audio, mas a transcricao voltou vazia."
            : null
        );

        void loadTurns(1);
      } catch (error) {
        if (!isMountedRef.current) {
          return;
        }

        setVoiceNotice(null);

        if (error instanceof VoiceApiError) {
          setVoiceError(getVoiceRequestErrorMessage(error));
          return;
        }

        if (error instanceof Error) {
          setVoiceError(error.message);
          return;
        }

        setVoiceError("Falha ao enviar o audio para o backend.");
      } finally {
        if (source === "microphone") {
          resetCaptureResources();
        }

        if (isMountedRef.current) {
          setRecordingSeconds(0);
          setRequestStatus("idle");
        }
      }
    },
    [language, loadTurns]
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      resetCaptureResources(true);
    };
  }, []);

  useEffect(() => {
    if (requestStatus !== "recording") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRecordingSeconds((currentSeconds) => currentSeconds + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [requestStatus]);

  useEffect(() => {
    void loadTurns(1);
  }, [loadTurns]);

  const openFilePicker = () => {
    if (requestStatus === "uploading") {
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const onAudioFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const validationMessage = validateAudioFile(selectedFile);

    setLastInputSource("file");

    if (validationMessage) {
      setSelectedAudioFile(null);
      setVoiceResult(null);
      setVoiceNotice(null);
      setVoiceError(validationMessage);
      event.target.value = "";
      return;
    }

    clearVoiceFeedback();
    setSelectedAudioFile(normalizeAudioFile(selectedFile));
  };

  const sendSelectedAudioFile = async () => {
    if (!selectedAudioFile || requestStatus !== "idle") {
      return;
    }

    await submitAudio(selectedAudioFile, "file", selectedAudioFile.name);
  };

  const startRecording = async () => {
    if (requestStatus !== "idle") {
      return;
    }

    const availabilityMessage = getVoiceCaptureAvailabilityMessage();

    setLastInputSource("microphone");

    if (availabilityMessage) {
      setVoiceNotice(null);
      setVoiceError(availabilityMessage);
      return;
    }

    try {
      resetCaptureResources(true);
      clearVoiceFeedback();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedMimeType = getSupportedRecorderMimeType();
      const recorder = supportedMimeType
        ? new MediaRecorder(stream, { mimeType: supportedMimeType })
        : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        resetCaptureResources();

        if (!isMountedRef.current) {
          return;
        }

        setRequestStatus("idle");
        setVoiceNotice(null);
        setVoiceError("Falha durante a gravacao de audio. Tente novamente.");
      };

      recorder.onstop = () => {
        const recordedMimeType =
          recorder.mimeType && recorder.mimeType.length > 0 ? recorder.mimeType : "audio/webm";
        const recordedBlob = new Blob(chunksRef.current, { type: recordedMimeType });

        if (recordedBlob.size === 0) {
          resetCaptureResources();

          if (!isMountedRef.current) {
            return;
          }

          setRequestStatus("idle");
          setRecordingSeconds(0);
          setVoiceNotice(null);
          setVoiceError("Nenhum audio foi capturado. Tente gravar novamente.");
          return;
        }

        const recordedFile = new File([recordedBlob], getMicrophoneFileName(recordedMimeType), {
          type: recordedMimeType,
        });

        void submitAudio(recordedFile, "microphone", recordedFile.name);
      };

      recorder.start();
      setRecordingSeconds(0);
      setRequestStatus("recording");
      setVoiceError(null);
    } catch (error) {
      resetCaptureResources(true);
      setRequestStatus("idle");
      setVoiceNotice(null);
      setVoiceError(getMicrophoneAccessErrorMessage(error));
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state !== "recording") {
      return;
    }

    setRequestStatus("uploading");

    try {
      recorder.stop();
    } catch {
      resetCaptureResources();

      if (!isMountedRef.current) {
        return;
      }

      setRequestStatus("idle");
      setVoiceNotice(null);
      setVoiceError("Nao foi possivel finalizar a gravacao. Tente novamente.");
    }
  };

  const voiceCaptureAvailabilityMessage = getVoiceCaptureAvailabilityMessage();
  const hasAttemptState =
    selectedAudioFile !== null ||
    voiceResult !== null ||
    voiceError !== null ||
    voiceNotice !== null ||
    lastInputSource !== null;
  const canSendSelectedFile = requestStatus === "idle" && selectedAudioFile !== null;
  const canStartRecording = requestStatus === "idle" && !voiceCaptureAvailabilityMessage;
  const transcriptionText = voiceResult?.transcription?.trim() ?? "";
  const assistantText = voiceResult?.assistantText?.trim() ?? "";

  const voiceStatusTone =
    requestStatus === "recording"
      ? "warning"
      : requestStatus === "uploading"
        ? "info"
        : "neutral";

  const voiceStatusLabel =
    requestStatus === "recording"
      ? `Gravando (${recordingSeconds}s)`
      : requestStatus === "uploading"
        ? "Enviando audio..."
        : "Pronto para teste";

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

  return (
    <div className="page-stack">
      <PageHeader
        title="Voice Validation"
        description="Fluxo principal para importar audio, enviar ao STT offline e revisar a resposta retornada pelo backend."
        icon={<ClockCounterClockwise weight="duotone" />}
        actions={<StatusPill tone="info">POST /api/v1/voice/interactions</StatusPill>}
      />

      <Section
        title="Arquivo de audio"
        subtitle="Fluxo principal desta fase: importar, enviar, validar transcricao e tentar novamente sem recarregar a pagina."
      >
        <Card>
          <CardHeader>
            <CardTitle>Teste por arquivo</CardTitle>
            <CardDescription>
              Use arquivos reais para validar o STT sem depender de microfone.
            </CardDescription>
          </CardHeader>
          <CardContent className="voice-mvp">
            <div className="voice-mvp__controls">
              <StatusPill tone={voiceStatusTone}>{voiceStatusLabel}</StatusPill>
              <span className="voice-mvp__support-copy">
                Aceita webm, ogg, wav, mp3, mp4, m4a e aac ate {formatBytes(maxAudioUploadBytes)}.
              </span>
            </div>

            <div className="voice-mvp__file-toolbar">
              <input
                ref={fileInputRef}
                className="voice-mvp__file-input"
                type="file"
                accept={acceptedAudioTypes}
                onChange={onAudioFileSelected}
              />

              <Button
                variant="secondary"
                onClick={openFilePicker}
                disabled={requestStatus === "uploading"}
              >
                <UploadSimple weight="duotone" />
                Importar audio
              </Button>

              <Button onClick={() => void sendSelectedAudioFile()} disabled={!canSendSelectedFile}>
                <UploadSimple weight="duotone" />
                {voiceResult && selectedAudioFile ? "Enviar novamente" : "Enviar arquivo"}
              </Button>

              <Button
                variant="ghost"
                onClick={clearCurrentAttempt}
                disabled={requestStatus !== "idle" || !hasAttemptState}
              >
                Limpar / tentar outro
              </Button>
            </div>

            <div className="voice-mvp__file-grid">
              <div className="voice-mvp__file-card">
                <strong>Arquivo selecionado</strong>
                <span>{selectedAudioFile?.name ?? "Nenhum arquivo selecionado."}</span>
                <small>
                  {selectedAudioFile
                    ? `${formatBytes(selectedAudioFile.size)} | ${selectedAudioFile.type || "tipo inferido"}`
                    : "Selecione um audio local para iniciar o teste."}
                </small>
              </div>

              <Input
                label="Language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                placeholder="pt-BR"
                hint="Campo opcional enviado junto ao multipart/form-data."
              />
            </div>

            {voiceError ? (
              <div className="voice-mvp__error" role="alert">
                <WarningCircle weight="duotone" />
                <span>{voiceError}</span>
              </div>
            ) : null}

            {voiceNotice ? (
              <div className="voice-mvp__notice" role="status">
                <WarningCircle weight="duotone" />
                <span>{voiceNotice}</span>
              </div>
            ) : null}

            {requestStatus === "uploading" ? (
              <LoadingBlock label="Enviando audio para o backend..." />
            ) : null}

            {voiceResult ? (
              <div className="voice-mvp__result">
                <div className="voice-mvp__result-block">
                  <strong>Origem da tentativa</strong>
                  <p>{lastInputSource === "microphone" ? "Microfone" : "Arquivo importado"}</p>
                </div>
                <div className="voice-mvp__result-block">
                  <strong>Transcricao</strong>
                  <p>{transcriptionText || "Audio processado, mas sem fala detectavel nesta tentativa."}</p>
                </div>
                <div className="voice-mvp__result-block">
                  <strong>Assistant text</strong>
                  <p>{assistantText || "Sem resposta textual retornada pelo backend."}</p>
                </div>
                {voiceResult.audioReplyUrl ? (
                  <small className="voice-mvp__hint">
                    Audio de resposta disponivel em {voiceResult.audioReplyUrl}
                  </small>
                ) : null}
              </div>
            ) : (
              <div className="voice-mvp__placeholder">
                <UploadSimple weight="duotone" />
                <p>
                  Nenhum audio enviado ainda. Importe um arquivo, envie para o backend e confira o retorno do STT.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </Section>

      <Section
        title="Microfone"
        subtitle="Fluxo complementar. Mantido organizado, mas fora do caminho principal de validacao por arquivo."
      >
        <Card>
          <CardHeader>
            <CardTitle>Captura opcional</CardTitle>
            <CardDescription>
              Use apenas quando houver microfone disponivel e voce quiser comparar com o upload de arquivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="voice-mvp">
            <div className="voice-mvp__actions">
              <Button onClick={() => void startRecording()} disabled={!canStartRecording}>
                <Microphone weight="duotone" />
                Iniciar gravacao
              </Button>
              <Button
                variant="secondary"
                onClick={stopRecording}
                disabled={requestStatus !== "recording"}
              >
                <StopCircle weight="duotone" />
                Parar e enviar
              </Button>
            </div>

            {voiceCaptureAvailabilityMessage ? (
              <div className="voice-mvp__notice" role="status">
                <WarningCircle weight="duotone" />
                <span>{voiceCaptureAvailabilityMessage}</span>
              </div>
            ) : (
              <small className="voice-mvp__hint">
                Se o navegador permitir, a gravacao sera enviada para o mesmo endpoint usado no upload.
              </small>
            )}
          </CardContent>
        </Card>
      </Section>

      <Section
        title="Conversation Timeline"
        subtitle="Historico util para debug. O fluxo de voz desta etapa prioriza resultado imediato; persistencia automatica de turns pode ser reforcada na fase seguinte."
      >
        <FilterBar
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => void loadTurns(meta.page)}
                disabled={isLoading}
              >
                Atualizar lista
              </Button>
              <Button
                variant="ghost"
                onClick={() => setFilters({ role: "", source: "" })}
                disabled={isLoading}
              >
                Limpar filtros
              </Button>
            </>
          }
        >
          <Select
            label="Role"
            value={filters.role}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                role: event.target.value as ConversationFilters["role"],
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
            onChange={(event) =>
              setFilters((current) => ({ ...current, source: event.target.value }))
            }
            placeholder="voice"
          />
        </FilterBar>

        {listError ? (
          <ErrorState message={listError} onRetry={() => void loadTurns(meta.page)} />
        ) : null}
        {isLoading ? <LoadingBlock label="Loading conversations..." /> : null}
        {!isLoading && !listError && turns.length === 0 ? (
          <EmptyState
            title="No turns found"
            description="Nenhum turn encontrado com os filtros atuais."
          />
        ) : null}
        {!isLoading && !listError && turns.length > 0 ? (
          <>
            <DataTable columns={columns} data={turns} rowKey={(turn) => turn.id} />
            <PaginationControls meta={meta} onPageChange={(page) => void loadTurns(page)} />
          </>
        ) : null}
      </Section>
    </div>
  );
}

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Broadcast,
  ClockCounterClockwise,
  MicrophoneStage,
  Pulse,
  Sparkle
} from "@phosphor-icons/react";
import type { ConversationRole, ConversationTurn, PaginationMeta } from "@sara/shared-types";
import { PageHeader, StatusPill } from "../components/ui";
import { ConversationTimelineSection } from "../features/voice/ConversationTimelineSection";
import { VoiceRecorderSection } from "../features/voice/VoiceRecorderSection";
import { VoiceUploadSection } from "../features/voice/VoiceUploadSection";
import {
  getVoiceRequestErrorMessage,
  normalizeAudioFile,
  validateAudioFile,
  type VoiceInputSource,
  type VoiceRequestStatus
} from "../features/voice/voice-audio";
import { useVoiceRecorder } from "../features/voice/use-voice-recorder";
import { conversationTurnsApi, getApiErrorMessage } from "../services/api/client";
import { sendVoiceInteraction, VoiceApiError, type VoiceInteractionResponse } from "../services/api/voice";
import { formatDateTime } from "../utils/format";

const initialMeta: PaginationMeta = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false
};

interface ConversationFilters {
  role: "" | ConversationRole;
  source: string;
}

export function ConversationsPage() {
  const [requestStatus, setRequestStatus] = useState<VoiceRequestStatus>("idle");
  const [language, setLanguage] = useState("pt-BR");
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [voiceResult, setVoiceResult] = useState<VoiceInteractionResponse | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [lastInputSource, setLastInputSource] = useState<VoiceInputSource | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isMountedRef = useRef(true);

  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ConversationFilters>({ role: "", source: "" });

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
          source: filters.source.trim() || undefined
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
          language: language.trim() || undefined
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
        if (isMountedRef.current) {
          setRequestStatus("idle");
        }
      }
    },
    [language, loadTurns]
  );

  const onRecorderError = useCallback((message: string) => {
    setVoiceNotice(null);
    setVoiceError(message);
    setRequestStatus("idle");
  }, []);

  const {
    availabilityMessage: voiceCaptureAvailabilityMessage,
    isRecording,
    recordingSeconds,
    startRecording: beginRecording,
    stopRecording: finishRecording
  } = useVoiceRecorder({
    onAudioReady: (recordedFile) => submitAudio(recordedFile, "microphone", recordedFile.name),
    onError: onRecorderError,
    onRecordingStateChange: (nextIsRecording) => {
      setRequestStatus(nextIsRecording ? "recording" : "idle");
    }
  });

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

    setLastInputSource("microphone");
    clearVoiceFeedback();

    await beginRecording();
  };

  const stopRecorder = () => {
    if (!isRecording) {
      return;
    }

    setRequestStatus("uploading");
    finishRecording();
  };

  const hasAttemptState =
    selectedAudioFile !== null ||
    voiceResult !== null ||
    voiceError !== null ||
    voiceNotice !== null ||
    lastInputSource !== null;
  const canSendSelectedFile = requestStatus === "idle" && selectedAudioFile !== null;
  const canStartRecording = requestStatus === "idle" && !voiceCaptureAvailabilityMessage;

  const voiceStatusTone =
    requestStatus === "recording"
      ? "warning"
      : requestStatus === "uploading"
        ? "info"
        : voiceResult && !voiceError
          ? "success"
          : "neutral";

  const voiceStatusLabel =
    requestStatus === "recording"
      ? `Gravando (${recordingSeconds}s)`
      : requestStatus === "uploading"
        ? "Processando audio"
        : voiceResult && !voiceError
          ? "Ultima tentativa concluida"
          : "Pronto para nova tentativa";

  const transcriptionLength = voiceResult?.transcription?.trim().length ?? 0;
  const assistantLength = voiceResult?.assistantText?.trim().length ?? 0;
  const latestTurnTime = turns[0]?.createdAt ? formatDateTime(turns[0].createdAt) : "Sem eventos recentes";

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Primary flow"
        title="Voice Console"
        description="A área principal da Sara Core agora prioriza um ciclo claro: selecionar sinal, executar o backend e revisar transcrição, resposta e persistência sem sair da tela."
        icon={<ClockCounterClockwise weight="duotone" />}
        actions={<StatusPill tone="info">POST /api/v1/voice/interactions</StatusPill>}
      />

      <section className="voice-hero">
        <div className="voice-hero__main">
          <div className="voice-hero__signal">
            <span className="voice-hero__eyebrow">Voice validation</span>
            <h3>Do audio bruto ao reply persistido, sem ambiguidade operacional.</h3>
            <p>
              Use arquivo como trilha principal, compare com microfone quando fizer sentido e mantenha o
              histórico visível para validar o comportamento real do backend.
            </p>
          </div>

          <div className="voice-hero__steps">
            <div className="voice-step">
              <Broadcast weight="duotone" />
              <div>
                <strong>1. Capture</strong>
                <span>Importe audio real ou grave um trecho curto.</span>
              </div>
            </div>
            <div className="voice-step">
              <Pulse weight="duotone" />
              <div>
                <strong>2. Execute</strong>
                <span>O backend transcreve, tenta a LLM e persiste o fluxo.</span>
              </div>
            </div>
            <div className="voice-step">
              <Sparkle weight="duotone" />
              <div>
                <strong>3. Audit</strong>
                <span>Valide texto, fallback, erros e rastros observáveis.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="voice-hero__metrics">
          <div className="signal-metric">
            <span>Status</span>
            <strong>{voiceStatusLabel}</strong>
            <small>{lastInputSource === "microphone" ? "Origem: microfone" : "Origem: arquivo"}</small>
          </div>
          <div className="signal-metric">
            <span>Transcricao</span>
            <strong>{transcriptionLength}</strong>
            <small>caracteres na ultima tentativa</small>
          </div>
          <div className="signal-metric">
            <span>Assistant text</span>
            <strong>{assistantLength}</strong>
            <small>caracteres retornados</small>
          </div>
          <div className="signal-metric">
            <span>Timeline</span>
            <strong>{meta.total}</strong>
            <small>{latestTurnTime}</small>
          </div>
        </div>
      </section>

      <div className="voice-layout">
        <div className="voice-layout__primary">
          <VoiceUploadSection
            canSendSelectedFile={canSendSelectedFile}
            fileInputRef={fileInputRef}
            hasAttemptState={hasAttemptState}
            language={language}
            lastInputSource={lastInputSource}
            requestStatus={requestStatus}
            selectedAudioFile={selectedAudioFile}
            statusLabel={voiceStatusLabel}
            statusTone={voiceStatusTone}
            voiceError={voiceError}
            voiceNotice={voiceNotice}
            voiceResult={voiceResult}
            onAudioFileSelected={onAudioFileSelected}
            onClearCurrentAttempt={clearCurrentAttempt}
            onLanguageChange={setLanguage}
            onOpenFilePicker={openFilePicker}
            onSendSelectedAudioFile={() => void sendSelectedAudioFile()}
          />
        </div>

        <div className="voice-layout__secondary">
          <VoiceRecorderSection
            availabilityMessage={voiceCaptureAvailabilityMessage}
            canStartRecording={canStartRecording}
            requestStatus={requestStatus}
            onStartRecording={() => void startRecording()}
            onStopRecording={stopRecorder}
          />
          <section className="side-note-card">
            <span className="side-note-card__eyebrow">Operational note</span>
            <h3>O upload continua sendo a trilha principal desta fase.</h3>
            <p>
              A captura por microfone fica disponível para comparação rápida, mas a leitura crítica do produto
              deve partir de amostras de audio controladas e repetíveis.
            </p>
            <div className="side-note-card__pills">
              <StatusPill tone="success">Transacao persistida</StatusPill>
              <StatusPill tone="warning">TTS fora do escopo</StatusPill>
            </div>
            <div className="side-note-card__footer">
              <MicrophoneStage weight="duotone" />
              <span>Mesmo endpoint, mesma trilha de persistencia, menos ruido operacional.</span>
            </div>
          </section>
        </div>
      </div>

      <ConversationTimelineSection
        filters={filters}
        isLoading={isLoading}
        listError={listError}
        meta={meta}
        turns={turns}
        onClearFilters={() => setFilters({ role: "", source: "" })}
        onLoadTurns={(page) => void loadTurns(page)}
        onRoleChange={(role) => setFilters((current) => ({ ...current, role }))}
        onSourceChange={(source) => setFilters((current) => ({ ...current, source }))}
      />
    </div>
  );
}

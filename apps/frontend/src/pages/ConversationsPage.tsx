import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Broadcast, ClockCounterClockwise } from "@phosphor-icons/react";
import type {
  ConversationRole,
  ConversationTurn,
  ConversationTurnsListResponse,
  PaginationMeta
} from "@sara/shared-types";
import { PageHeader } from "../components/ui";
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
import { buildApiUrl, conversationTurnsApi, getApiErrorMessage } from "../services/api/client";
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

const turnsPageSize = 10;
const timelineCacheTtlMs = 30_000;
const conversationTurnsCache = new Map<
  string,
  {
    timestamp: number;
    response: ConversationTurnsListResponse;
  }
>();

function buildTimelineCacheKey(page: number, filters: ConversationFilters) {
  return JSON.stringify({
    page,
    pageSize: turnsPageSize,
    role: filters.role || "",
    source: filters.source.trim().toLowerCase()
  });
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
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ConversationFilters>({ role: "", source: "" });
  const [appliedFilters, setAppliedFilters] = useState<ConversationFilters>({ role: "", source: "" });

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
    async (nextPage = 1, options?: { force?: boolean; filters?: ConversationFilters }) => {
      const nextFilters = options?.filters ?? appliedFilters;
      const cacheKey = buildTimelineCacheKey(nextPage, nextFilters);
      const cached = conversationTurnsCache.get(cacheKey);

      if (!options?.force && cached && Date.now() - cached.timestamp < timelineCacheTtlMs) {
        setTurns(cached.response.data);
        setMeta(cached.response.meta);
        setListError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setListError(null);

      try {
        const response = await conversationTurnsApi.list({
          page: nextPage,
          pageSize: turnsPageSize,
          role: nextFilters.role || undefined,
          source: nextFilters.source.trim() || undefined
        });

        conversationTurnsCache.set(cacheKey, {
          timestamp: Date.now(),
          response
        });
        setTurns(response.data);
        setMeta(response.meta);
      } catch (error) {
        setListError(getApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [appliedFilters]
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

        conversationTurnsCache.clear();
        setPage(1);
        void loadTurns(1, { force: true });
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
    void loadTurns(page);
  }, [loadTurns, page]);

  const applyFilters = () => {
    setAppliedFilters({
      role: filters.role,
      source: filters.source
    });
    setPage(1);
  };

  const clearFilters = () => {
    const nextFilters = { role: "", source: "" } satisfies ConversationFilters;
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPage(1);
    void loadTurns(1, { force: true, filters: nextFilters });
  };

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

  const audioUrl = voiceResult?.audioReplyUrl ? buildApiUrl(voiceResult.audioReplyUrl) : null;
  const transcriptionLength = voiceResult?.transcription?.trim().length ?? 0;
  const assistantLength = voiceResult?.assistantText?.trim().length ?? 0;
  const latestTurnTime = turns[0]?.createdAt ? formatDateTime(turns[0].createdAt) : "Sem eventos recentes";

  return (
    <div className="page-stack">
      <PageHeader
        title="Voice"
        description="Envie um audio, revise a transcricao e confira a resposta."
        icon={<ClockCounterClockwise weight="duotone" />}
      />

      <section className="voice-hero">
        <div className="voice-hero__main">
          <div className="voice-hero__signal">
            <h3>Um fluxo simples para testar audio e acompanhar o resultado.</h3>
            <p>Escolha um arquivo ou grave um trecho curto para validar a experiencia completa.</p>
          </div>

          <div className="voice-hero__steps">
            <div className="voice-step">
              <Broadcast weight="duotone" />
              <div>
                <strong>Envie e acompanhe</strong>
                <span>O resultado aparece na mesma tela, com tentativa atual e historico recente.</span>
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
            <span>Resposta</span>
            <strong>{assistantLength}</strong>
            <small>caracteres retornados</small>
          </div>
          <div className="signal-metric">
            <span>Historico</span>
            <strong>{meta.total}</strong>
            <small>{latestTurnTime}</small>
          </div>
        </div>
      </section>

      <div className="voice-layout">
        <div className="voice-layout__primary">
          <VoiceUploadSection
            audioUrl={audioUrl}
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
        </div>
      </div>

      <ConversationTimelineSection
        filters={filters}
        isLoading={isLoading}
        listError={listError}
        meta={meta}
        turns={turns}
        onApplyFilters={applyFilters}
        onClearFilters={clearFilters}
        onLoadTurns={(nextPage) => {
          setPage(nextPage);
        }}
        onRefresh={() => void loadTurns(page, { force: true })}
        onRoleChange={(role) => setFilters((current) => ({ ...current, role }))}
        onSourceChange={(source) => setFilters((current) => ({ ...current, source }))}
      />
    </div>
  );
}

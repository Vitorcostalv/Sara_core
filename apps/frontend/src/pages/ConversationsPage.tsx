import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClockCounterClockwise } from "@phosphor-icons/react";
import type { ConversationRole, ConversationTurn, PaginationMeta } from "@sara/shared-types";
import { PageHeader, Section, StatusPill } from "../components/ui";
import { conversationTurnsApi, getApiErrorMessage } from "../services/api/client";
import { sendVoiceInteraction, VoiceApiError, type VoiceInteractionResponse } from "../services/api/voice";
import { ConversationTimelineSection } from "../features/voice/ConversationTimelineSection";
import { VoiceRecorderSection } from "../features/voice/VoiceRecorderSection";
import { VoiceUploadSection } from "../features/voice/VoiceUploadSection";
import { useVoiceRecorder } from "../features/voice/use-voice-recorder";
import {
  getVoiceRequestErrorMessage,
  normalizeAudioFile,
  validateAudioFile,
  type VoiceInputSource,
  type VoiceRequestStatus
} from "../features/voice/voice-audio";

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
        : "neutral";

  const voiceStatusLabel =
    requestStatus === "recording"
      ? `Gravando (${recordingSeconds}s)`
      : requestStatus === "uploading"
        ? "Enviando audio..."
        : "Pronto para teste";

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
      </Section>

      <Section
        title="Microfone"
        subtitle="Fluxo complementar. Mantido organizado, mas fora do caminho principal de validacao por arquivo."
      >
        <VoiceRecorderSection
          availabilityMessage={voiceCaptureAvailabilityMessage}
          canStartRecording={canStartRecording}
          requestStatus={requestStatus}
          onStartRecording={() => void startRecording()}
          onStopRecording={stopRecorder}
        />
      </Section>

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

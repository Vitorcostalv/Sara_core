import type { ChangeEvent, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowClockwise,
  FileArrowUp,
  Headphones,
  Pause,
  Play,
  ShieldWarning,
  Sparkle,
  SpeakerSlash,
  UploadSimple,
  Waveform
} from "@phosphor-icons/react";
import type { VoiceInteractionResponse } from "../../services/api/voice";
import { Button, Input, LoadingBlock, StatusPill } from "../../components/ui";
import {
  acceptedAudioTypes,
  formatBytes,
  maxAudioUploadBytes,
  type VoiceInputSource,
  type VoiceRequestStatus
} from "./voice-audio";

interface VoiceUploadSectionProps {
  audioUrl: string | null;
  canSendSelectedFile: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  hasAttemptState: boolean;
  language: string;
  lastInputSource: VoiceInputSource | null;
  requestStatus: VoiceRequestStatus;
  selectedAudioFile: File | null;
  statusLabel: string;
  statusTone: "neutral" | "warning" | "info" | "success";
  voiceError: string | null;
  voiceNotice: string | null;
  voiceResult: VoiceInteractionResponse | null;
  onAudioFileSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearCurrentAttempt: () => void;
  onLanguageChange: (value: string) => void;
  onOpenFilePicker: () => void;
  onSendSelectedAudioFile: () => void;
}

export function VoiceUploadSection({
  audioUrl,
  canSendSelectedFile,
  fileInputRef,
  hasAttemptState,
  language,
  lastInputSource,
  requestStatus,
  selectedAudioFile,
  statusLabel,
  statusTone,
  voiceError,
  voiceNotice,
  voiceResult,
  onAudioFileSelected,
  onClearCurrentAttempt,
  onLanguageChange,
  onOpenFilePicker,
  onSendSelectedAudioFile
}: VoiceUploadSectionProps) {
  const transcriptionText = voiceResult?.transcription?.trim() ?? "";
  const assistantText = voiceResult?.assistantText?.trim() ?? "";
  const hasResult = voiceResult !== null;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setAudioError(false);
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || audioError) return;
    if (isPlaying) {
      audio.pause();
    } else {
      void audio.play().catch(() => {
        setAudioError(true);
        setIsPlaying(false);
      });
    }
  };

  return (
    <section className="signal-panel signal-panel--voice" data-testid="voice-upload-panel">
      <div className="signal-panel__header">
        <div>
          <span className="signal-panel__eyebrow">Main execution path</span>
          <h3>Upload and run</h3>
          <p>Importe amostras reais, envie para o backend e compare transcrição e resposta no mesmo contexto.</p>
        </div>
        <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
      </div>

      <div className="voice-dropzone">
        <input
          ref={fileInputRef as RefObject<HTMLInputElement>}
          className="voice-mvp__file-input"
          type="file"
          accept={acceptedAudioTypes}
          onChange={onAudioFileSelected}
          data-testid="voice-file-input"
        />

        <div className="voice-dropzone__content">
          <div className="voice-dropzone__icon">
            <UploadSimple weight="duotone" />
          </div>
          <div>
            <strong>{selectedAudioFile?.name ?? "Nenhum audio selecionado"}</strong>
            <p>
              {selectedAudioFile
                ? `${formatBytes(selectedAudioFile.size)} • ${selectedAudioFile.type || "tipo inferido"}`
                : `Aceita webm, ogg, wav, mp3, mp4, m4a e aac ate ${formatBytes(maxAudioUploadBytes)}.`}
            </p>
          </div>
        </div>

        <div className="voice-dropzone__actions">
          <Button variant="secondary" onClick={onOpenFilePicker} disabled={requestStatus === "uploading"} data-testid="voice-choose-file">
            <FileArrowUp weight="duotone" />
            Escolher arquivo
          </Button>
          <Button onClick={onSendSelectedAudioFile} disabled={!canSendSelectedFile} data-testid="voice-submit">
            <Waveform weight="duotone" />
            {hasResult && selectedAudioFile ? "Rodar novamente" : "Executar fluxo"}
          </Button>
          <Button
            variant="ghost"
            onClick={onClearCurrentAttempt}
            disabled={requestStatus !== "idle" || !hasAttemptState}
            data-testid="voice-clear"
          >
            <ArrowClockwise weight="duotone" />
            Limpar
          </Button>
        </div>
      </div>

      <div className="voice-panel-grid">
        <div className="voice-config-card">
          <div className="voice-config-card__header">
            <span>Request settings</span>
            <small>multipart/form-data</small>
          </div>
          <Input
            label="Language tag"
            value={language}
            onChange={(event) => onLanguageChange(event.target.value)}
            placeholder="pt-BR"
            hint="Campo opcional enviado junto ao upload para o backend."
          />
        </div>

        <div className="voice-config-card">
          <div className="voice-config-card__header">
            <span>Attempt context</span>
            <small>{lastInputSource === "microphone" ? "microfone" : "arquivo"}</small>
          </div>
          <div className="voice-context-list">
            <div>
              <strong>Origem</strong>
              <span>{lastInputSource === "microphone" ? "Microfone" : "Arquivo importado"}</span>
            </div>
            <div>
              <strong>Arquivo</strong>
              <span>{selectedAudioFile?.name ?? "Nenhum selecionado"}</span>
            </div>
          </div>
        </div>
      </div>

      {voiceError ? (
        <div className="signal-message signal-message--error" role="alert" data-testid="voice-error">
          <ShieldWarning weight="duotone" />
          <div>
            <strong>Falha na tentativa atual</strong>
            <span>{voiceError}</span>
          </div>
        </div>
      ) : null}

      {voiceNotice ? (
        <div className="signal-message signal-message--warning" role="status" data-testid="voice-notice">
          <Headphones weight="duotone" />
          <div>
            <strong>Processado com observação</strong>
            <span>{voiceNotice}</span>
          </div>
        </div>
      ) : null}

      {requestStatus === "uploading" ? <LoadingBlock label="Executando STT, LLM, TTS e persistencia..." /> : null}

      <div className="voice-results-grid" data-testid="voice-results">
        <article className="voice-result-card" data-testid="voice-transcription-card">
          <div className="voice-result-card__header">
            <span>Transcript</span>
            <Sparkle weight="duotone" />
          </div>
          <p>
            {transcriptionText || "Nenhuma transcricao disponivel ainda. Execute um arquivo para validar o retorno do STT."}
          </p>
        </article>

        <article className="voice-result-card voice-result-card--accent" data-testid="voice-assistant-card">
          <div className="voice-result-card__header">
            <span>Assistant reply</span>
            <Waveform weight="duotone" />
          </div>
          <p>
            {assistantText || "A resposta textual aparecera aqui apos a execucao completa do fluxo no backend."}
          </p>

          {audioUrl ? (
            <div className="voice-audio-player" data-testid="voice-audio-player">
              <audio
                ref={audioRef}
                src={audioUrl}
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onError={() => setAudioError(true)}
              />
              {audioError ? (
                <div className="voice-audio-player__unavailable" data-testid="voice-audio-unavailable">
                  <SpeakerSlash weight="duotone" />
                  <span>Audio indisponivel</span>
                </div>
              ) : (
                <button
                  className="voice-audio-player__btn"
                  type="button"
                  onClick={togglePlay}
                  data-testid="voice-audio-play-btn"
                  aria-label={isPlaying ? "Pausar resposta de audio" : "Reproduzir resposta de audio da Sara"}
                >
                  {isPlaying ? <Pause weight="fill" /> : <Play weight="fill" />}
                  <span>{isPlaying ? "Pausar" : "Reproduzir resposta"}</span>
                </button>
              )}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}

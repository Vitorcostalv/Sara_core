import type { ChangeEvent, RefObject } from "react";
import { UploadSimple, WarningCircle } from "@phosphor-icons/react";
import type { VoiceInteractionResponse } from "../../services/api/voice";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  LoadingBlock,
  StatusPill
} from "../../components/ui";
import {
  acceptedAudioTypes,
  formatBytes,
  maxAudioUploadBytes,
  type VoiceInputSource,
  type VoiceRequestStatus
} from "./voice-audio";

interface VoiceUploadSectionProps {
  canSendSelectedFile: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  hasAttemptState: boolean;
  language: string;
  lastInputSource: VoiceInputSource | null;
  requestStatus: VoiceRequestStatus;
  selectedAudioFile: File | null;
  statusLabel: string;
  statusTone: "neutral" | "warning" | "info";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teste por arquivo</CardTitle>
        <CardDescription>
          Use arquivos reais para validar o STT sem depender de microfone.
        </CardDescription>
      </CardHeader>
      <CardContent className="voice-mvp">
        <div className="voice-mvp__controls">
          <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
          <span className="voice-mvp__support-copy">
            Aceita webm, ogg, wav, mp3, mp4, m4a e aac ate {formatBytes(maxAudioUploadBytes)}.
          </span>
        </div>

        <div className="voice-mvp__file-toolbar">
          <input
            ref={fileInputRef as RefObject<HTMLInputElement>}
            className="voice-mvp__file-input"
            type="file"
            accept={acceptedAudioTypes}
            onChange={onAudioFileSelected}
          />

          <Button
            variant="secondary"
            onClick={onOpenFilePicker}
            disabled={requestStatus === "uploading"}
          >
            <UploadSimple weight="duotone" />
            Importar audio
          </Button>

          <Button onClick={onSendSelectedAudioFile} disabled={!canSendSelectedFile}>
            <UploadSimple weight="duotone" />
            {voiceResult && selectedAudioFile ? "Enviar novamente" : "Enviar arquivo"}
          </Button>

          <Button
            variant="ghost"
            onClick={onClearCurrentAttempt}
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
            onChange={(event) => onLanguageChange(event.target.value)}
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
  );
}

import { Microphone, StopCircle, WarningCircle } from "@phosphor-icons/react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../components/ui";
import type { VoiceRequestStatus } from "./voice-audio";

interface VoiceRecorderSectionProps {
  availabilityMessage: string | null;
  canStartRecording: boolean;
  requestStatus: VoiceRequestStatus;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function VoiceRecorderSection({
  availabilityMessage,
  canStartRecording,
  requestStatus,
  onStartRecording,
  onStopRecording
}: VoiceRecorderSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Captura opcional</CardTitle>
        <CardDescription>
          Use apenas quando houver microfone disponivel e voce quiser comparar com o upload de arquivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="voice-mvp">
        <div className="voice-mvp__actions">
          <Button onClick={onStartRecording} disabled={!canStartRecording}>
            <Microphone weight="duotone" />
            Iniciar gravacao
          </Button>
          <Button
            variant="secondary"
            onClick={onStopRecording}
            disabled={requestStatus !== "recording"}
          >
            <StopCircle weight="duotone" />
            Parar e enviar
          </Button>
        </div>

        {availabilityMessage ? (
          <div className="voice-mvp__notice" role="status">
            <WarningCircle weight="duotone" />
            <span>{availabilityMessage}</span>
          </div>
        ) : (
          <small className="voice-mvp__hint">
            Se o navegador permitir, a gravacao sera enviada para o mesmo endpoint usado no upload.
          </small>
        )}
      </CardContent>
    </Card>
  );
}

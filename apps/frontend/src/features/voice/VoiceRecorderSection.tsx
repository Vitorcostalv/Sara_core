import { Microphone, StopCircle, WarningCircle } from "@phosphor-icons/react";
import { Button, StatusPill } from "../../components/ui";
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
    <section className="signal-panel signal-panel--secondary">
      <div className="signal-panel__header">
        <div>
          <span className="signal-panel__eyebrow">Secondary capture</span>
          <h3>Microfone rapido</h3>
          <p>Use quando quiser comparar um trecho curto com o fluxo principal por arquivo.</p>
        </div>
        <StatusPill tone={availabilityMessage ? "warning" : "success"}>
          {availabilityMessage ? "Indisponivel" : "Disponivel"}
        </StatusPill>
      </div>

      <div className="recorder-stack">
        <div className="recorder-stack__actions">
          <Button onClick={onStartRecording} disabled={!canStartRecording}>
            <Microphone weight="duotone" />
            Iniciar gravacao
          </Button>
          <Button variant="secondary" onClick={onStopRecording} disabled={requestStatus !== "recording"}>
            <StopCircle weight="duotone" />
            Parar e enviar
          </Button>
        </div>

        {availabilityMessage ? (
          <div className="signal-message signal-message--warning" role="status">
            <WarningCircle weight="duotone" />
            <div>
              <strong>Captura indisponivel</strong>
              <span>{availabilityMessage}</span>
            </div>
          </div>
        ) : (
          <div className="recorder-stack__hint">
            O navegador enviara a gravacao para o mesmo endpoint usado no upload, mantendo o comportamento comparavel.
          </div>
        )}
      </div>
    </section>
  );
}

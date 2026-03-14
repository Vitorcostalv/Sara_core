import { ClockCounterClockwise, Microphone, StopCircle, UploadSimple, Waveform, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader, Section, StatusPill } from "../components/ui";
import { sendVoiceInteraction, VoiceApiError, type VoiceInteractionResponse } from "../services/api/voice";

type VoiceCaptureStatus = "idle" | "recording" | "uploading";

const preferredMimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];

function getSupportedRecorderMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
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

export function ConversationsPage() {
  const [captureStatus, setCaptureStatus] = useState<VoiceCaptureStatus>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceResult, setVoiceResult] = useState<VoiceInteractionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }

      const stream = mediaStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (captureStatus !== "recording") {
      return;
    }

    const timerId = window.setInterval(() => {
      setRecordingSeconds((currentValue) => currentValue + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [captureStatus]);

  const stopCurrentStream = () => {
    const stream = mediaStreamRef.current;

    if (!stream) {
      return;
    }

    stream.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const uploadAudio = async () => {
    setCaptureStatus("uploading");

    const recorder = mediaRecorderRef.current;
    const blobType = recorder?.mimeType && recorder.mimeType.length > 0 ? recorder.mimeType : "audio/webm";
    const audioBlob = new Blob(chunksRef.current, { type: blobType });

    chunksRef.current = [];
    mediaRecorderRef.current = null;
    stopCurrentStream();

    if (audioBlob.size === 0) {
      if (isMountedRef.current) {
        setErrorMessage("Nenhum áudio foi capturado. Tente gravar novamente.");
        setCaptureStatus("idle");
      }
      return;
    }

    try {
      const response = await sendVoiceInteraction({ audioBlob });

      if (isMountedRef.current) {
        setVoiceResult(response);
        setErrorMessage(null);
      }
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      if (error instanceof VoiceApiError && error.status === 404) {
        setErrorMessage(
          "Endpoint de voz ainda não encontrado no backend (esperado: POST /voice/interactions)."
        );
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Falha ao enviar o áudio para o backend.");
      }
    } finally {
      if (isMountedRef.current) {
        setCaptureStatus("idle");
      }
    }
  };

  const startRecording = async () => {
    if (captureStatus !== "idle") {
      return;
    }

    if (!hasVoiceCaptureSupport()) {
      setErrorMessage("Este navegador não oferece suporte a gravação com MediaRecorder.");
      return;
    }

    try {
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

      recorder.onstop = () => {
        void uploadAudio();
      };

      recorder.start();

      setRecordingSeconds(0);
      setCaptureStatus("recording");
      setErrorMessage(null);
    } catch {
      stopCurrentStream();
      setErrorMessage("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state !== "recording") {
      return;
    }

    setCaptureStatus("uploading");
    recorder.stop();
  };

  const voiceStatusTone =
    captureStatus === "recording" ? "warning" : captureStatus === "uploading" ? "info" : "neutral";

  const voiceStatusLabel =
    captureStatus === "recording"
      ? `Gravando (${recordingSeconds}s)`
      : captureStatus === "uploading"
        ? "Enviando áudio..."
        : "Parado";

  const canStartRecording = captureStatus === "idle";
  const canStopRecording = captureStatus === "recording";

  return (
    <div className="page-stack">
      <PageHeader
        title="Conversations"
        description="MVP de interação por voz com captura local, envio ao backend e retorno de transcrição/resposta."
        icon={<ClockCounterClockwise weight="duotone" />}
      />

      <Section
        title="Voice Interaction (MVP)"
        subtitle="Sem wake word nesta fase. Fluxo incremental para evoluir depois com TTS e ativação por palavra-chave."
      >
        <Card>
          <CardHeader>
            <CardTitle>Microfone</CardTitle>
            <CardDescription>Capture sua voz, envie o áudio e receba transcrição/resposta do backend.</CardDescription>
          </CardHeader>
          <CardContent className="voice-mvp">
            <div className="voice-mvp__controls">
              <StatusPill tone={voiceStatusTone}>{voiceStatusLabel}</StatusPill>
              <div className="voice-mvp__actions">
                <Button onClick={startRecording} disabled={!canStartRecording}>
                  <Microphone weight="duotone" />
                  Iniciar gravação
                </Button>
                <Button variant="secondary" onClick={stopRecording} disabled={!canStopRecording}>
                  {captureStatus === "uploading" ? <UploadSimple weight="duotone" /> : <StopCircle weight="duotone" />}
                  {captureStatus === "uploading" ? "Enviando..." : "Parar e enviar"}
                </Button>
              </div>
            </div>

            {errorMessage ? (
              <div className="voice-mvp__error" role="alert">
                <WarningCircle weight="duotone" />
                <span>{errorMessage}</span>
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
                  <small>TTS preparado: backend retornou áudio em {voiceResult.audioReplyUrl}</small>
                ) : null}
              </div>
            ) : (
              <div className="voice-mvp__placeholder">
                <Waveform weight="duotone" />
                <p>Nenhuma interação enviada ainda. Grave e envie seu primeiro áudio.</p>
              </div>
            )}

            <small className="voice-mvp__hint">
              Contrato esperado neste MVP: <code>POST /voice/interactions</code> com{" "}
              <code>multipart/form-data</code> (`audio` + `language`).
            </small>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}

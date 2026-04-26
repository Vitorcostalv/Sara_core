import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMicrophoneAccessErrorMessage,
  getMicrophoneFileName,
  getSupportedRecorderMimeType,
  getVoiceCaptureAvailabilityMessage
} from "./voice-audio";

interface UseVoiceRecorderOptions {
  onAudioReady: (audioFile: File) => void | Promise<void>;
  onError: (message: string) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

interface UseVoiceRecorderResult {
  availabilityMessage: string | null;
  isRecording: boolean;
  recordingSeconds: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export function useVoiceRecorder({
  onAudioReady,
  onError,
  onRecordingStateChange
}: UseVoiceRecorderOptions): UseVoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isMountedRef = useRef(true);

  const stopCurrentStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const resetCaptureResources = useCallback(
    (stopRecorder = false) => {
      const recorder = mediaRecorderRef.current;

      if (recorder) {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        recorder.onerror = null;

        if (stopRecorder && recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch {
            // Ignore shutdown errors while cleaning up recorder resources.
          }
        }
      }

      chunksRef.current = [];
      mediaRecorderRef.current = null;
      stopCurrentStream();
    },
    [stopCurrentStream]
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      resetCaptureResources(true);
    };
  }, [resetCaptureResources]);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRecordingSeconds((currentSeconds) => currentSeconds + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRecording]);

  const availabilityMessage = getVoiceCaptureAvailabilityMessage();

  const startRecording = useCallback(async () => {
    if (availabilityMessage) {
      onError(availabilityMessage);
      return;
    }

    try {
      resetCaptureResources(true);

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

        setIsRecording(false);
        setRecordingSeconds(0);
        onRecordingStateChange?.(false);
        onError("Falha durante a gravacao de audio. Tente novamente.");
      };

      recorder.onstop = () => {
        const recordedMimeType =
          recorder.mimeType && recorder.mimeType.length > 0 ? recorder.mimeType : "audio/webm";
        const recordedBlob = new Blob(chunksRef.current, { type: recordedMimeType });

        resetCaptureResources();

        if (!isMountedRef.current) {
          return;
        }

        setIsRecording(false);
        setRecordingSeconds(0);

        if (recordedBlob.size === 0) {
          onRecordingStateChange?.(false);
          onError("Nenhum audio foi capturado. Tente gravar novamente.");
          return;
        }

        const recordedFile = new File([recordedBlob], getMicrophoneFileName(recordedMimeType), {
          type: recordedMimeType
        });

        void onAudioReady(recordedFile);
      };

      recorder.start();
      setRecordingSeconds(0);
      setIsRecording(true);
      onRecordingStateChange?.(true);
    } catch (error) {
      resetCaptureResources(true);
      setIsRecording(false);
      setRecordingSeconds(0);
      onRecordingStateChange?.(false);
      onError(getMicrophoneAccessErrorMessage(error));
    }
  }, [availabilityMessage, onAudioReady, onError, onRecordingStateChange, resetCaptureResources]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state !== "recording") {
      return;
    }

    try {
      recorder.stop();
    } catch {
      resetCaptureResources();

      if (!isMountedRef.current) {
        return;
      }

      setIsRecording(false);
      setRecordingSeconds(0);
      onRecordingStateChange?.(false);
      onError("Nao foi possivel finalizar a gravacao. Tente novamente.");
    }
  }, [onError, onRecordingStateChange, resetCaptureResources]);

  return {
    availabilityMessage,
    isRecording,
    recordingSeconds,
    startRecording,
    stopRecording
  };
}

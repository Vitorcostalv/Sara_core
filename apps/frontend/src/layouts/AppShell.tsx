import { useEffect, useState, type PropsWithChildren } from "react";
import { DownloadSimple, Info, Leaf, PresentationChart, X } from "@phosphor-icons/react";
import { useUiStore } from "../state/ui.store";
import { useAndroidBackButton, useCloseOnAndroidBack } from "../pwa/androidBack";

export function AppShell({ children }: PropsWithChildren) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [updateReady, setUpdateReady] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const presentationMode = useUiStore((state) => state.presentationMode);
  const setPresentationMode = useUiStore((state) => state.setPresentationMode);

  // Android hardware/gesture back button: register once at the frame root, then let the topmost
  // dismissible surface claim the press (info dialog first, then presentation mode).
  useAndroidBackButton();
  useCloseOnAndroidBack(infoOpen, () => setInfoOpen(false));
  useCloseOnAndroidBack(!infoOpen && presentationMode, () => setPresentationMode(false));

  useEffect(() => {
    const syncOnline = () => setOnline(navigator.onLine);
    const onUpdateReady = () => setUpdateReady(true);
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("sara:network-change", syncOnline);
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    window.addEventListener("sara:pwa-update-ready", onUpdateReady);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.removeEventListener("sara:network-change", syncOnline);
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
      window.removeEventListener("sara:pwa-update-ready", onUpdateReady);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    const prompt = installPrompt as (Event & { prompt?: () => Promise<void> }) | null;
    await prompt?.prompt?.();
    setInstallPrompt(null);
  };

  return (
    <div className={`app-shell${presentationMode ? " is-presentation" : ""}`}>
      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__crest">
            <Leaf weight="duotone" />
          </div>
          <div className="app-header__titles">
            <strong>Sara Core</strong>
            <span>Simulação ecológica assistida por IA e validada por regras determinísticas</span>
          </div>
        </div>

        <div className="app-header__status" aria-label="Ações do sistema">
          <span
            className={`status-chip status-chip--quiet status-chip--network${online ? "" : " status-chip--offline"}`}
          >
            {online ? "Online" : "Offline"}
          </span>
          {installPrompt ? (
            <button
              type="button"
              className="status-chip status-chip--button status-chip--quiet"
              onClick={() => void installApp()}
            >
              <DownloadSimple weight="duotone" />
              Instalar
            </button>
          ) : null}
          {updateReady ? (
            <button type="button" className="status-chip status-chip--button" onClick={() => window.location.reload()}>
              Atualizar app
            </button>
          ) : null}
          <button
            type="button"
            className="status-chip status-chip--button status-chip--quiet"
            onClick={() => setInfoOpen(true)}
            title="Como o Sara Core funciona"
          >
            <Info weight="duotone" />
            Como funciona
          </button>
          <button
            type="button"
            className="status-chip status-chip--button status-chip--primary"
            onClick={() => setPresentationMode(!presentationMode)}
          >
            <PresentationChart weight="duotone" />
            {presentationMode ? "Sair da apresentação" : "Iniciar apresentação"}
          </button>
        </div>
      </header>

      <main className="app-content">
        <div className="app-content__container">{children}</div>
      </main>

      {infoOpen ? (
        <div className="app-dialog" role="dialog" aria-modal="true" aria-label="Como o Sara Core funciona">
          <section className="app-dialog__panel">
            <button
              type="button"
              className="app-dialog__close"
              onClick={() => setInfoOpen(false)}
              aria-label="Fechar"
            >
              <X weight="bold" />
            </button>
            <h2>Como o Sara Core funciona</h2>
            <ol>
              <li>A IA interpreta o pedido em linguagem natural.</li>
              <li>Dados curados fundamentam o contexto e limitam a explicação.</li>
              <li>Serviços determinísticos validam clima, recursos, fauna e rede trófica no backend.</li>
              <li>A visualização 3D representa o resultado gerado.</li>
              <li>Os scores são heurísticos e educacionais, não previsões ecológicas formais.</li>
            </ol>
          </section>
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useState, type PropsWithChildren } from "react";
import { DeviceMobile, DownloadSimple, Info, Leaf, PresentationChart, X } from "@phosphor-icons/react";
import { useUiStore } from "../state/ui.store";
import { getLanInfo } from "../pwa/lan";
import { useAndroidBackButton, useCloseOnAndroidBack } from "../pwa/androidBack";

export function AppShell({ children }: PropsWithChildren) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const lanInfo = getLanInfo();
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [updateReady, setUpdateReady] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const presentationMode = useUiStore((state) => state.presentationMode);
  const setPresentationMode = useUiStore((state) => state.setPresentationMode);

  // Android hardware/gesture back button: register once at the frame root, then let the topmost
  // dismissible surface claim the press (info dialog first, then presentation mode).
  useAndroidBackButton();
  useCloseOnAndroidBack(infoOpen, () => setInfoOpen(false));
  useCloseOnAndroidBack(phoneOpen, () => setPhoneOpen(false));
  useCloseOnAndroidBack(!infoOpen && !phoneOpen && presentationMode, () => setPresentationMode(false));

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
          {lanInfo ? (
            <button
              type="button"
              className="status-chip status-chip--button status-chip--quiet"
              onClick={() => setPhoneOpen(true)}
              title="Mostrar QR code para abrir no celular"
            >
              <DeviceMobile weight="duotone" />
              Abrir no celular
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

      {phoneOpen && lanInfo ? (
        <div className="app-dialog" role="dialog" aria-modal="true" aria-label="Abrir no celular">
          <section className="app-dialog__panel app-dialog__panel--phone">
            <button
              type="button"
              className="app-dialog__close"
              onClick={() => setPhoneOpen(false)}
              aria-label="Fechar"
            >
              <X weight="bold" />
            </button>
            <h2>Abrir no celular</h2>
            {lanInfo.wifi ? (
              <>
                <p className="phone-qr__step">
                  <b>1</b> Conecte no Wi-Fi do PC
                </p>
                <div className="phone-qr" dangerouslySetInnerHTML={{ __html: lanInfo.wifi.qrSvg }} />
                <p>
                  Rede <code>{lanInfo.wifi.ssid}</code> · senha <code>{lanInfo.wifi.passphrase}</code>
                </p>
                <p className="phone-qr__step">
                  <b>2</b> Abra o app
                </p>
              </>
            ) : (
              <p>Aponte a câmera do celular para o código. Ele precisa estar no mesmo Wi-Fi que o PC.</p>
            )}
            {/* SVGs gerados localmente pelo serve-lan.mjs a partir do IP do próprio PC. */}
            <div className="phone-qr" dangerouslySetInnerHTML={{ __html: lanInfo.qrSvg }} />
            <code className="phone-qr__url">{lanInfo.url}</code>
            {lanInfo.urls.length > 1 ? (
              <details className="phone-qr__alternatives">
                <summary>Não abriu? Tente outro endereço</summary>
                <ul>
                  {lanInfo.urls.slice(1).map((item) => (
                    <li key={item.url}>
                      <code>{item.url}</code> <small>({item.name})</small>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

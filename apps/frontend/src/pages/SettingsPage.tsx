import { SectionHeader } from "../components/SectionHeader";
import { useUiStore } from "../state/ui.store";

export function SettingsPage() {
  const { apiBaseUrl, setApiBaseUrl } = useUiStore();

  return (
    <section className="page-grid">
      <SectionHeader
        title="Settings"
        description="Configuracoes locais para desenvolvimento e integracao futura."
      />
      <div className="panel">
        <label className="field">
          API Base URL
          <input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} />
        </label>
      </div>
    </section>
  );
}

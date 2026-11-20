import { useState } from "react";
import { syntheticForecastExample, type EcologicalForecastInput, type EcologicalForecastResult } from "@sara/shared-types";
import { Button, StatusPill } from "../../components/ui";
import { ecologyApi } from "../../services/api/ecology";
import { getApiErrorMessage } from "../../services/api/client";

export function EcologyForecastSection() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<EcologicalForecastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const edit = (value: string) => { setText(value); setResult(null); setError(null); };
  const submit = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const payload: EcologicalForecastInput = JSON.parse(text);
      setResult((await ecologyApi.forecast(payload)).data);
    } catch (failure) { setError(getApiErrorMessage(failure)); }
    finally { setLoading(false); }
  };
  const download = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "sara-previsao-experimental.json"; anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <details className="signal-panel" data-testid="forecast-panel">
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>Previsão com observações</summary>
      <p>Informe pelo menos 12 observações datadas, com o mesmo protocolo de amostragem. O modelo reserva as mais recentes para medir o erro antes de prever os próximos dias.</p>
      <p>A simulação de invasão acima é hipotética. Esta previsão estima tendências de abundância observada e não comprova o efeito de introduzir ou remover predadores.</p>
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.8rem" }}>
        <Button variant="secondary" disabled={loading} onClick={() => edit(JSON.stringify(syntheticForecastExample(), null, 2))}>Carregar exemplo sintético</Button>
        <label>
          Importar observações JSON
          <input type="file" accept=".json,application/json" disabled={loading} onChange={async (event) => {
            const file = event.currentTarget.files?.[0];
            if (!file) return;
            if (file.size > 180_000) { setError("O arquivo deve ter até 180 KB."); return; }
            try { edit(await file.text()); } catch { setError("Não foi possível ler o arquivo."); }
          }} />
        </label>
      </div>
      <label htmlFor="forecast-observations">Observações, unidades e origem dos dados</label>
      <textarea id="forecast-observations" className="ui-input" rows={12} value={text} disabled={loading}
        style={{ width: "100%", fontFamily: "monospace", margin: "0.4rem 0 0.8rem" }}
        onChange={(event) => edit(event.target.value)} spellCheck={false} />
      <Button variant="primary" disabled={loading || !text.trim()} onClick={() => void submit()}>{loading ? "Ajustando e avaliando..." : "Gerar previsão experimental"}</Button>
      {error ? <p role="alert">{error}</p> : null}
      {result ? (
        <div aria-live="polite" style={{ marginTop: "1rem" }}>
          <div className="signal-panel__header">
            <div><h3>Previsão experimental</h3><p>{result.observationCount} observações · horizonte de {result.horizonDays} dias · {result.unit}</p></div>
            <StatusPill tone={result.status === "experimental" ? "info" : "warning"}>{result.source.kind === "synthetic" ? "Dados sintéticos" : result.status === "experimental" ? "Ajustado a observações" : "Evidência insuficiente"}</StatusPill>
          </div>
          {result.species.map((species) => {
            const maximum = Math.max(1, ...species.forecast.map((point) => point.upper));
            const coordinates = species.forecast.map((point, i) => `${20 + i * 560 / Math.max(1, species.forecast.length - 1)},${145 - point.estimate / maximum * 120}`).join(" ");
            return <div key={species.id} className="answer-card">
              <strong>{species.commonName}</strong>
              <p>Erro médio no teste: {species.validation.modelMae.toFixed(3)} · manter a última observação: {species.validation.persistenceMae.toFixed(3)}. {species.validation.beatsPersistence ? "O modelo superou a referência nesse período." : "O modelo não superou a referência nesse período."}</p>
              <svg viewBox="0 0 600 165" role="img" aria-label={`Tendência prevista de ${species.commonName}`} style={{ width: "100%", maxHeight: "200px" }}>
                <line x1="20" y1="145" x2="580" y2="145" stroke="currentColor" opacity="0.25" />
                {species.forecast.map((point, i) => <line key={point.date} x1={20 + i * 560 / Math.max(1, species.forecast.length - 1)} x2={20 + i * 560 / Math.max(1, species.forecast.length - 1)} y1={145 - point.lower / maximum * 120} y2={145 - point.upper / maximum * 120} stroke="var(--color-brand-primary, #2f6b4f)" opacity="0.3" />)}
                <polyline points={coordinates} fill="none" stroke="var(--color-brand-primary, #2f6b4f)" strokeWidth="3" />
              </svg>
              <p>Faixas condicionais de 95% do modelo; cobertura ecológica ainda não validada.</p>
              <div style={{ overflowX: "auto" }}><table className="invasive-table"><thead><tr><th>Data</th><th>Estimativa</th><th>Faixa inferior</th><th>Faixa superior</th></tr></thead><tbody>
                {species.forecast.map((point) => <tr key={point.date}><td>{point.date.slice(0, 10)}</td><td>{point.estimate.toFixed(2)}</td><td>{point.lower.toFixed(2)}</td><td>{point.upper.toFixed(2)}</td></tr>)}
              </tbody></table></div>
            </div>;
          })}
          {result.warnings.map((warning) => <p key={warning}>{warning}</p>)}
          <Button variant="secondary" onClick={download}>Exportar previsão e avaliação</Button>
          <p><small>Modelo: {result.modelVersion} · dados: {result.datasetSha256.slice(0, 12)}</small></p>
        </div>
      ) : null}
    </details>
  );
}

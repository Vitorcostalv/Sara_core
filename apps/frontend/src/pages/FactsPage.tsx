import { SectionHeader } from "../components/SectionHeader";

export function FactsPage() {
  return (
    <section className="page-grid">
      <SectionHeader
        title="Facts"
        description="Area para memoria de fatos do usuario. Apenas estrutura inicial nesta entrega."
      />
      <div className="panel">
        <p>Placeholder para fatos persistidos e filtros por categoria.</p>
      </div>
    </section>
  );
}

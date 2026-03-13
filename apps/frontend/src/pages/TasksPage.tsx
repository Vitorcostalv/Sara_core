import { SectionHeader } from "../components/SectionHeader";

export function TasksPage() {
  return (
    <section className="page-grid">
      <SectionHeader
        title="Tasks"
        description="Area para gerenciamento de tarefas do usuario. Integracao com API sera adicionada depois."
      />
      <div className="panel">
        <p>Placeholder para lista de tarefas, filtros e criacao de tarefas.</p>
      </div>
    </section>
  );
}

import { SectionHeader } from "../components/SectionHeader";
import { StatCard } from "../components/StatCard";

export function DashboardPage() {
  return (
    <section className="page-grid">
      <SectionHeader
        title="Dashboard"
        description="Visao geral da base local da Sara. Esta tela e somente estrutural nesta fase."
      />

      <div className="cards-grid">
        <StatCard label="Perfil" value="1" hint="Registro de user_profile" />
        <StatCard label="Facts" value="0" hint="Memoria semantica inicial" />
        <StatCard label="Tasks" value="0" hint="Itens pendentes" />
        <StatCard label="Conversas" value="0" hint="Historico de turns" />
      </div>
    </section>
  );
}

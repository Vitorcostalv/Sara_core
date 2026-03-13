import { SectionHeader } from "../components/SectionHeader";

export function ConversationsPage() {
  return (
    <section className="page-grid">
      <SectionHeader
        title="Conversations"
        description="Area para historico de conversas e auditoria de turnos."
      />
      <div className="panel">
        <p>Placeholder para timeline de conversation_turns e tool_calls.</p>
      </div>
    </section>
  );
}

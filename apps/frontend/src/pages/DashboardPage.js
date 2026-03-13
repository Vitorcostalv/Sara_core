import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SectionHeader } from "../components/SectionHeader";
import { StatCard } from "../components/StatCard";
export function DashboardPage() {
    return (_jsxs("section", { className: "page-grid", children: [_jsx(SectionHeader, { title: "Dashboard", description: "Visao geral da base local da Sara. Esta tela e somente estrutural nesta fase." }), _jsxs("div", { className: "cards-grid", children: [_jsx(StatCard, { label: "Perfil", value: "1", hint: "Registro de user_profile" }), _jsx(StatCard, { label: "Facts", value: "0", hint: "Memoria semantica inicial" }), _jsx(StatCard, { label: "Tasks", value: "0", hint: "Itens pendentes" }), _jsx(StatCard, { label: "Conversas", value: "0", hint: "Historico de turns" })] })] }));
}

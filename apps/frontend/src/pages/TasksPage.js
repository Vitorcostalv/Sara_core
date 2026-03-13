import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SectionHeader } from "../components/SectionHeader";
export function TasksPage() {
    return (_jsxs("section", { className: "page-grid", children: [_jsx(SectionHeader, { title: "Tasks", description: "Area para gerenciamento de tarefas do usuario. Integracao com API sera adicionada depois." }), _jsx("div", { className: "panel", children: _jsx("p", { children: "Placeholder para lista de tarefas, filtros e criacao de tarefas." }) })] }));
}

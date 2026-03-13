import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SectionHeader } from "../components/SectionHeader";
import { useUiStore } from "../state/ui.store";
export function SettingsPage() {
    const { apiBaseUrl, setApiBaseUrl } = useUiStore();
    return (_jsxs("section", { className: "page-grid", children: [_jsx(SectionHeader, { title: "Settings", description: "Configuracoes locais para desenvolvimento e integracao futura." }), _jsx("div", { className: "panel", children: _jsxs("label", { className: "field", children: ["API Base URL", _jsx("input", { value: apiBaseUrl, onChange: (event) => setApiBaseUrl(event.target.value) })] }) })] }));
}

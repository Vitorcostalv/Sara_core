import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function StatCard({ label, value, hint, icon }) {
    return (_jsxs("article", { className: "stat-card", children: [_jsxs("div", { className: "stat-card-top", children: [_jsx("span", { children: label }), icon ? _jsx("span", { children: icon }) : null] }), _jsx("strong", { children: value }), _jsx("small", { children: hint })] }));
}

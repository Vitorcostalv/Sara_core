import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from "react-router-dom";
const navItems = [
    { to: "/", label: "Dashboard", end: true },
    { to: "/tasks", label: "Tasks" },
    { to: "/facts", label: "Facts" },
    { to: "/conversations", label: "Conversations" },
    { to: "/settings", label: "Settings" }
];
export function AppShell({ children }) {
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("aside", { className: "sidebar", children: [_jsx("h1", { children: "Sara Core" }), _jsx("p", { children: "Local Assistant Control Panel" }), _jsx("nav", { children: navItems.map((item) => (_jsx(NavLink, { to: item.to, end: item.end, className: ({ isActive }) => (isActive ? "active" : ""), children: item.label }, item.to))) })] }), _jsx("main", { className: "content", children: children })] }));
}

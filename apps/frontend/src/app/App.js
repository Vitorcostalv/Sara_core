import { jsx as _jsx } from "react/jsx-runtime";
import { Outlet } from "react-router-dom";
import { AppShell } from "../layouts/AppShell";
export function App() {
    return (_jsx(AppShell, { children: _jsx(Outlet, {}) }));
}

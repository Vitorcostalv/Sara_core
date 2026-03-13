import { jsx as _jsx } from "react/jsx-runtime";
import { createBrowserRouter } from "react-router-dom";
import { App } from "../app/App";
import { ConversationsPage } from "../pages/ConversationsPage";
import { DashboardPage } from "../pages/DashboardPage";
import { FactsPage } from "../pages/FactsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { TasksPage } from "../pages/TasksPage";
export const appRouter = createBrowserRouter([
    {
        path: "/",
        element: _jsx(App, {}),
        children: [
            { index: true, element: _jsx(DashboardPage, {}) },
            { path: "tasks", element: _jsx(TasksPage, {}) },
            { path: "facts", element: _jsx(FactsPage, {}) },
            { path: "conversations", element: _jsx(ConversationsPage, {}) },
            { path: "settings", element: _jsx(SettingsPage, {}) }
        ]
    }
]);

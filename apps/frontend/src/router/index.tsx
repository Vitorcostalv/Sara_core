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
    element: <App />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "facts", element: <FactsPage /> },
      { path: "conversations", element: <ConversationsPage /> },
      { path: "settings", element: <SettingsPage /> }
    ]
  }
]);

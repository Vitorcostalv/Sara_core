import { Navigate, createBrowserRouter } from "react-router-dom";
import { App } from "../app/App";
import { ConversationsPage } from "../pages/ConversationsPage";
import { ToolCallsPage } from "../pages/ToolCallsPage";

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/conversations" replace /> },
      { path: "conversations", element: <ConversationsPage /> },
      { path: "tool-calls", element: <ToolCallsPage /> }
    ]
  }
]);

import { Navigate, createBrowserRouter } from "react-router-dom";
import { App } from "../app/App";
import { ConversationsPage } from "../pages/ConversationsPage";
import { EcologyPage } from "../pages/EcologyPage";
import { LlmPage } from "../pages/LlmPage";
import { ToolCallsPage } from "../pages/ToolCallsPage";

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/voice" replace /> },
      { path: "voice", element: <ConversationsPage /> },
      { path: "conversations", element: <Navigate to="/voice" replace /> },
      { path: "llm", element: <LlmPage /> },
      { path: "tool-calls", element: <ToolCallsPage /> },
      { path: "ecology", element: <EcologyPage /> },
    ]
  }
]);

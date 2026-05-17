import { Navigate, createBrowserRouter } from "react-router-dom";
import { App } from "../app/App";
import { ConversationsPage } from "../pages/ConversationsPage";
import { EcologyPage } from "../pages/EcologyPage";

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/voice" replace /> },
      { path: "voice", element: <ConversationsPage /> },
      { path: "conversations", element: <Navigate to="/voice" replace /> },
      { path: "ecology", element: <EcologyPage /> },
    ]
  }
]);

import { Navigate, createBrowserRouter } from "react-router-dom";
import { App } from "../app/App";
import { EcologyPage } from "../pages/EcologyPage";

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/ecology" replace /> },
      { path: "ecology", element: <EcologyPage /> },
    ]
  }
]);

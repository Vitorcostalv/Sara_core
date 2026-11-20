import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { AppShell } from "../layouts/AppShell";
import { startApiKeepAlive } from "../services/api/keep-alive";

export function App() {
  useEffect(startApiKeepAlive, []);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

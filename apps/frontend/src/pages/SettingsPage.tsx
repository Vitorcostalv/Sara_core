import { Gear, Warning } from "@phosphor-icons/react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, PageHeader, Section, StatusPill } from "../components/ui";
import { useUiStore } from "../state/ui.store";

export function SettingsPage() {
  const { apiBaseUrl, setApiBaseUrl } = useUiStore();

  return (
    <div className="page-stack">
      <PageHeader
        title="Settings"
        description="Local configuration layer for development and environment control."
        icon={<Gear weight="duotone" />}
      />

      <Section title="Connection Defaults" subtitle="These values control frontend-to-backend communication.">
        <Card>
          <CardHeader>
            <CardTitle>API Connection</CardTitle>
          </CardHeader>
          <CardContent className="stack-sm">
            <Input
              label="API Base URL"
              name="apiBaseUrl"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              placeholder="http://localhost:3333/api/v1"
              hint="Use local endpoint only in this phase."
            />
            <div className="inline-row">
              <StatusPill tone="warning">
                <Warning weight="duotone" />
                Offline services not integrated yet
              </StatusPill>
              <Button variant="secondary">Save defaults</Button>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}

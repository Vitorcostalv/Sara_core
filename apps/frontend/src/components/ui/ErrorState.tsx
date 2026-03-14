import { WarningCircle } from "@phosphor-icons/react";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Failed to load data", message, onRetry }: ErrorStateProps) {
  return (
    <div className="ui-error-state" role="alert">
      <div className="ui-error-state__icon">
        <WarningCircle weight="duotone" />
      </div>
      <div className="ui-error-state__content">
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

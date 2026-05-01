import { SpinnerGap } from "@phosphor-icons/react";

interface LoadingBlockProps {
  label?: string;
}

export function LoadingBlock({ label = "Carregando..." }: LoadingBlockProps) {
  return (
    <div className="ui-loading-block" role="status" aria-live="polite">
      <SpinnerGap className="ui-loading-block__icon" weight="duotone" />
      <span>{label}</span>
    </div>
  );
}

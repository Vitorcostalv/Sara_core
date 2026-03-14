import type { ReactNode } from "react";

interface ProfileFieldProps {
  label: string;
  value: ReactNode;
}

export function ProfileField({ label, value }: ProfileFieldProps) {
  return (
    <div className="ui-profile-field">
      <span className="ui-profile-field__label">{label}</span>
      <strong className="ui-profile-field__value">{value || "-"}</strong>
    </div>
  );
}

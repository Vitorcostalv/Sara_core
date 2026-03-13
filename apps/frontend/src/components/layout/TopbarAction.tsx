import type { Icon } from "@phosphor-icons/react";
import { IconButton } from "../ui";

interface TopbarActionProps {
  icon: Icon;
  label: string;
}

export function TopbarAction({ icon: IconComponent, label }: TopbarActionProps) {
  return <IconButton icon={<IconComponent weight="duotone" />} label={label} />;
}

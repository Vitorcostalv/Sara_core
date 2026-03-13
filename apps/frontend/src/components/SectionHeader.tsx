import { PageHeader } from "./ui";

interface SectionHeaderProps {
  title: string;
  description: string;
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return <PageHeader title={title} description={description} />;
}

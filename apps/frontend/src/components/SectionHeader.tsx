interface SectionHeaderProps {
  title: string;
  description: string;
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <header className="section-header">
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  );
}

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
}

export default function StatsCard({ title, value, subtitle }: StatsCardProps) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <p className="text-sm font-medium text-secondary">{title}</p>
      <p className="mt-2 text-3xl font-bold text-primary">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
    </div>
  );
}

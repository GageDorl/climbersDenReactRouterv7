export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-semibold badge-primary">
      {count > 99 ? '99+' : count}
    </span>
  );
}

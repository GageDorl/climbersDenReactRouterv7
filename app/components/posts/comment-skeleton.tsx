export function CommentSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex gap-3">
        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    </div>
  );
}

export function CommentThreadSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <CommentSkeleton />
      <CommentSkeleton />
      <CommentSkeleton />
    </div>
  );
}

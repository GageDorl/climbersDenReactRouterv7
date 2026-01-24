interface PostMetricsProps {
  likeCount: number;
  commentCount: number;
  shareCount?: number;
}

export function PostMetrics({ likeCount, commentCount, shareCount = 0 }: PostMetricsProps) {
  return (
    <div className="mt-2 flex flex-wrap gap-3 text-xs text-secondary">
      <div className="flex items-center gap-1">
        <span className="font-semibold text-primary">{likeCount}</span>
        <span>likes</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-semibold text-primary">{commentCount}</span>
        <span>comments</span>
      </div>
      <div className="flex items-center gap-1">
        {/* share count intentionally hidden — shares aren't tracked */}
        <span>shares</span>
      </div>
    </div>
  );
}

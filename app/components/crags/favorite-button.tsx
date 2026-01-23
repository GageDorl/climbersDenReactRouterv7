import { useFetcher } from 'react-router';
import { Button } from '~/components/ui/button';

interface FavoriteButtonProps {
  cragId: string;
  isFavorited: boolean;
}

export function FavoriteButton({ cragId, isFavorited }: FavoriteButtonProps) {
  const fetcher = useFetcher();

  const optimisticFavorited =
    fetcher.formData?.get('intent') === 'favorite'
      ? true
      : fetcher.formData?.get('intent') === 'unfavorite'
      ? false
      : isFavorited;

  const isLoading = fetcher.state !== 'idle';

  return (
    <fetcher.Form
      method="post"
      action={`/api/crags/${cragId}/favorite`}
      className="inline-block"
    >
      <input
        type="hidden"
        name="intent"
        value={optimisticFavorited ? 'unfavorite' : 'favorite'}
      />
      <Button
        type="submit"
        variant={optimisticFavorited ? 'default' : 'outline'}
        size="sm"
        disabled={isLoading}
        className="flex items-center gap-2"
      >
        <svg
          className={`h-4 w-4 ${optimisticFavorited ? 'fill-current' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        {optimisticFavorited ? 'Favorited' : 'Add to Favorites'}
      </Button>
    </fetcher.Form>
  );
}

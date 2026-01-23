import { useFetcher } from 'react-router';
import { useState } from 'react';

interface RouteRatingProps {
  routeId: string;
  initialRating?: number;
}

export default function RouteRating({ routeId, initialRating = 0 }: RouteRatingProps) {
  const fetcher = useFetcher();
  const [rating, setRating] = useState<number>(initialRating);
  const [hoveredRating, setHoveredRating] = useState<number>(0);

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);

    // Submit the rating
    const formData = new FormData();
    formData.append('routeId', routeId);
    formData.append('starRating', newRating.toString());

    fetcher.submit(formData, {
      method: 'POST',
      action: `/api/routes/${routeId}/rating`,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRatingChange(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="transition-transform hover:scale-110"
          >
            <svg
              className={`h-6 w-6 ${
                star <= (hoveredRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
      {rating > 0 && (
        <span className="text-sm font-medium text-gray-700">
          {rating} out of 5 stars
        </span>
      )}
    </div>
  );
}

import { Link } from 'react-router';
import { MapPin } from 'lucide-react';
import { useState } from 'react';

interface NearbyUser {
  id: string;
  displayName: string;
  profilePhotoUrl: string | null;
  climbingStyles: string[];
  experienceLevel: string;
  distance: number;
  locationCity: string | null;
}

interface NearbyUsersCardProps {
  user: NearbyUser;
}

/**
 * Card component displaying a nearby climber
 * Shows profile photo, name, climbing info, and distance
 */
export function NearbyUsersCard({ user }: NearbyUsersCardProps) {
  const [imageError, setImageError] = useState(false);

  // Get climbing style badges
  const climbingStyleLabels: Record<string, string> = {
    bouldering: 'Boulder',
    sport: 'Sport',
    trad: 'Trad',
    mixed: 'Mixed',
  };

  const experienceLevelLabels: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    expert: 'Expert',
  };

  return (
    <Link
      to={`/users/${user.displayName}`}
      className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden hover:shadow-lg dark:hover:shadow-lg hover:shadow-gray-300/50 dark:hover:shadow-gray-900/50 transition-all"
    >
      <div className="p-4">
        {/* Profile Photo */}
        <div className="mb-4 flex justify-center">
          {!imageError && user.profilePhotoUrl ? (
            <img
              src={user.profilePhotoUrl}
              alt={user.displayName}
              onError={() => setImageError(true)}
              className="w-20 h-20 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700 group-hover:ring-blue-500 transition-all"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center ring-2 ring-gray-200 dark:ring-gray-700 group-hover:ring-blue-500 transition-all">
              <span className="text-xl font-bold text-white">
                {user.displayName[0].toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Name */}
        <h3 className="font-semibold text-center text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {user.displayName}
        </h3>

        {/* Location */}
        <div className="flex items-center justify-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-3">
          <MapPin className="h-3 w-3" />
          <span>
            {user.distance.toFixed(1)} mi away
          </span>
        </div>

        {user.locationCity && (
          <p className="text-xs text-gray-500 dark:text-gray-500 text-center mb-3">
            {user.locationCity}
          </p>
        )}

        {/* Experience Level */}
        <div className="mb-3">
          <span className="inline-block px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-medium">
            {experienceLevelLabels[user.experienceLevel] || user.experienceLevel}
          </span>
        </div>

        {/* Climbing Styles */}
        {user.climbingStyles && user.climbingStyles.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mb-4">
            {user.climbingStyles.slice(0, 3).map((style) => (
              <span
                key={style}
                className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {climbingStyleLabels[style] || style}
              </span>
            ))}
            {user.climbingStyles.length > 3 && (
              <span className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400">
                +{user.climbingStyles.length - 3}
              </span>
            )}
          </div>
        )}

        {/* View Profile Link */}
        <div className="text-center text-xs text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
          View Profile →
        </div>
      </div>
    </Link>
  );
}

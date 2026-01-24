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
      className="group rounded-lg border border-default bg-surface overflow-hidden hover:shadow-lg transition-all"
    >
      <div className="p-4">
        {/* Profile Photo */}
        <div className="mb-4 flex justify-center">
          {!imageError && user.profilePhotoUrl ? (
            <img
              src={user.profilePhotoUrl}
              alt={user.displayName}
              onError={() => setImageError(true)}
              className="w-20 h-20 rounded-full object-cover ring-2 ring-default transition-all"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center ring-2 ring-default transition-all">
              <span className="text-xl font-bold text-surface">
                {user.displayName[0].toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Name */}
        <h3 className="font-semibold text-center text-primary mb-1 transition-colors">
          {user.displayName}
        </h3>

        {/* Location */}
        <div className="flex items-center justify-center gap-1 text-xs text-secondary mb-3">
          <MapPin className="h-3 w-3" />
          <span>
            {user.distance.toFixed(1)} mi away
          </span>
        </div>

        {user.locationCity && (
          <p className="text-xs text-muted text-center mb-3">
            {user.locationCity}
          </p>
        )}

        {/* Experience Level */}
        <div className="mb-3">
          <span className="inline-block px-2 py-1 rounded-full badge-accent text-xs font-medium">
            {experienceLevelLabels[user.experienceLevel] || user.experienceLevel}
          </span>
        </div>

        {/* Climbing Styles */}
        {user.climbingStyles && user.climbingStyles.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mb-4">
            {user.climbingStyles.slice(0, 3).map((style) => (
              <span
                key={style}
                className="text-xs px-2 py-1 rounded-full badge-secondary"
              >
                {climbingStyleLabels[style] || style}
              </span>
            ))}
            {user.climbingStyles.length > 3 && (
              <span className="text-xs px-2 py-1 text-muted">
                +{user.climbingStyles.length - 3}
              </span>
            )}
          </div>
        )}

        {/* View Profile Link */}
        <div className="text-center text-xs link-primary font-medium group-hover:underline">
          View Profile →
        </div>
      </div>
    </Link>
  );
}

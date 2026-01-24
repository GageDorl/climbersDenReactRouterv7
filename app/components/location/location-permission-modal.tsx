import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { MapPin } from 'lucide-react';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
  onAskLater?: () => void;
}

/**
 * Modal requesting user permission to access location
 * Explains why location is needed and provides opt-out option
 */
export function LocationPermissionModal({
  isOpen,
  onAllow,
  onDeny,
  onAskLater,
}: LocationPermissionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAllow = async () => {
    setIsSubmitting(true);
    try {
      onAllow();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeny = () => {
    onDeny();
  };

  const handleAskLater = () => {
    onAskLater?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {/* Prevent manual close, only via buttons */}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Enable Location
          </DialogTitle>
          <DialogDescription>
            Share your location to unlock features like:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Discover climbers near you</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>View crags on an interactive map</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Get personalized route recommendations</span>
            </li>
          </ul>

          {/* Privacy Notice */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-900 dark:text-blue-200">
              <span className="font-semibold">Privacy:</span> Your exact location is never shared publicly. Other climbers only see your approximate city. You can disable location sharing anytime in your profile settings.
            </p>
          </div>

          {/* Accuracy Note */}
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            Note: Location updates work best on mobile devices with GPS enabled.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 mt-6">
            {/* Primary: Allow */}
            <Button
              onClick={handleAllow}
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Enabling...' : 'Allow Location Access'}
            </Button>

            {/* Secondary: Ask Later */}
            {onAskLater && (
              <Button
                onClick={handleAskLater}
                disabled={isSubmitting}
                variant="outline"
                className="w-full"
              >
                Ask Later
              </Button>
            )}

            {/* Tertiary: Never / Deny */}
            <Button
              onClick={handleDeny}
              disabled={isSubmitting}
              variant="ghost"
              className="w-full text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Don't Share Location
            </Button>
          </div>

          {/* Additional Info */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Your browser may also ask for permission. You can change this setting anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

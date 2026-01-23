import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllow: (latitude: number, longitude: number) => void;
  onDeny: () => void;
}

export function LocationPermissionModal({
  isOpen,
  onClose,
  onAllow,
  onDeny,
}: LocationPermissionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAllow = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser");
        setIsLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          onAllow(position.coords.latitude, position.coords.longitude);
          setIsLoading(false);
          onClose();
        },
        (error) => {
          console.error("Geolocation error:", error);
          setError(
            error.code === 1
              ? "Location permission denied. You can enable it in your browser settings."
              : "Failed to get your location. Please try again."
          );
          setIsLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } catch (error) {
      console.error("Location error:", error);
      setError("An error occurred while getting your location");
      setIsLoading(false);
    }
  };

  const handleDeny = () => {
    onDeny();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Your Location</DialogTitle>
          <DialogDescription>
            climbersDen would like to access your location to help you discover
            nearby climbers and crags. You can change this setting anytime.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="text-green-600">✓</span>
            <p>Find climbers near you</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-green-600">✓</span>
            <p>Discover local crags and routes</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-green-600">✓</span>
            <p>Get weather updates for nearby climbing areas</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-gray-400">🔒</span>
            <p className="text-xs">
              Your exact location is never shared publicly. Only your city is
              visible to others.
            </p>
          </div>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleDeny}
            disabled={isLoading}
            className="flex-1"
          >
            Not Now
          </Button>
          <Button
            onClick={handleAllow}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? "Getting location..." : "Allow Location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

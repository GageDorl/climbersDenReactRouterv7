import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { Progress } from '~/components/ui/progress';

export interface UploadProgressItem {
  id: string;
  filename: string;
  progress: number; // 0-100
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface UploadProgressProps {
  items: UploadProgressItem[];
  onRetry?: (id: string) => void;
  onDismiss?: (id: string) => void;
  show?: boolean;
}

export function UploadProgress({
  items,
  onRetry,
  onDismiss,
  show = true,
}: UploadProgressProps) {
  if (!show || items.length === 0) {
    return null;
  }

  const totalProgress = items.length > 0
    ? Math.round(items.reduce((sum, item) => sum + item.progress, 0) / items.length)
    : 0;

  const uploadingCount = items.filter((item) => item.status === 'uploading').length;
  const successCount = items.filter((item) => item.status === 'success').length;
  const errorCount = items.filter((item) => item.status === 'error').length;

  return (
    <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">Uploading Media</h3>
            <p className="text-xs text-gray-500 mt-1">
              {successCount} succeeded
              {errorCount > 0 && ` • ${errorCount} failed`}
              {uploadingCount > 0 && ` • ${uploadingCount} uploading`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{totalProgress}%</div>
          </div>
        </div>
        <Progress value={totalProgress} className="h-2" />
      </div>

      {/* Individual Items */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-3 border border-gray-100 dark:border-gray-800 rounded-md bg-gray-50 dark:bg-gray-800/50"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                {/* Status Icon */}
                <div className="shrink-0 mt-0.5">
                  {item.status === 'uploading' && (
                    <Loader className="w-4 h-4 text-blue-500 animate-spin" />
                  )}
                  {item.status === 'success' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>

                {/* Filename */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
                    {item.filename}
                  </p>
                  {item.error && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {item.error}
                    </p>
                  )}
                </div>
              </div>

              {/* Progress or Status */}
              {item.status === 'uploading' && (
                <div className="text-xs text-gray-500 font-medium ml-2">
                  {item.progress}%
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {item.status === 'uploading' && (
              <Progress value={item.progress} className="h-1" />
            )}

            {/* Actions */}
            {item.status === 'error' && (onRetry || onDismiss) && (
              <div className="flex gap-2 mt-2">
                {onRetry && (
                  <button
                    type="button"
                    onClick={() => onRetry(item.id)}
                    className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded transition-colors"
                  >
                    Retry
                  </button>
                )}
                {onDismiss && (
                  <button
                    type="button"
                    onClick={() => onDismiss(item.id)}
                    className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      {uploadingCount === 0 && (
        <div className="text-xs text-center text-gray-500">
          {errorCount > 0
            ? `${successCount} file${successCount !== 1 ? 's' : ''} uploaded, ${errorCount} failed`
            : `All ${successCount} file${successCount !== 1 ? 's' : ''} uploaded successfully`}
        </div>
      )}
    </div>
  );
}

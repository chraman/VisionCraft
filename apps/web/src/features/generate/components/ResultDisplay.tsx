import { Button } from '@ai-platform/ui';
import { API_ROUTES } from '@ai-platform/config';
import { useJobStatus } from '../hooks/useJobStatus';
import { useImageActions } from '../../gallery/hooks/useImageActions';

interface ResultDisplayProps {
  jobId: string | null;
}

export function ResultDisplay({ jobId }: ResultDisplayProps) {
  const { data: job } = useJobStatus(jobId);
  const { saveMutation } = useImageActions();

  if (!job || job.status !== 'COMPLETED' || !job.imageId) return null;

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-700">Result</h3>
      <div className="overflow-hidden rounded-lg">
        <img
          src={API_ROUTES.IMAGES.BY_ID(job.imageId)}
          alt={job.prompt}
          className="h-auto w-full rounded-lg object-contain"
        />
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          onClick={() => saveMutation.mutate(job.imageId!)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save image'}
        </Button>
      </div>
    </div>
  );
}

import { Spinner } from '@ai-platform/ui';
import { useJobStatus } from '../hooks/useJobStatus';

interface GenerationProgressProps {
  jobId: string | null;
}

const statusMessages: Record<string, string> = {
  PENDING: 'Queued…',
  PROCESSING: 'Generating your image…',
  COMPLETED: 'Done!',
  FAILED: 'Generation failed',
};

export function GenerationProgress({ jobId }: GenerationProgressProps) {
  const { data: job } = useJobStatus(jobId);

  if (!jobId || !job) return null;

  const isActive = job.status === 'PENDING' || job.status === 'PROCESSING';

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        {isActive && <Spinner size="sm" />}
        <span
          className={`text-sm font-medium ${
            job.status === 'FAILED' ? 'text-red-600' : 'text-gray-700'
          }`}
        >
          {statusMessages[job.status] ?? job.status}
        </span>
      </div>
      {job.status === 'FAILED' && job.errorMessage && (
        <p className="mt-2 text-xs text-red-500">{job.errorMessage}</p>
      )}
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { GenerationJob } from '@ai-platform/types';
import { getJobStatus } from '../../../services/image.service';
import { track } from '../../../lib/analytics';
import { useAuthStore } from '@ai-platform/store';

export function useJobStatus(jobId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const sseErrorRef = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Polling fallback — only used if SSE fails
  const query = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => (jobId ? getJobStatus(jobId) : null),
    staleTime: 0,
    refetchInterval: sseErrorRef.current ? 2000 : false,
    enabled: Boolean(jobId) && sseErrorRef.current,
  });

  useEffect(() => {
    if (!jobId) return;

    sseErrorRef.current = false;
    const es = new EventSource(`/api/v1/images/jobs/${jobId}/events`, {
      withCredentials: true,
    });
    eventSourceRef.current = es;

    es.onmessage = (event: MessageEvent<string>) => {
      try {
        const job = JSON.parse(event.data) as GenerationJob;
        queryClient.setQueryData(['job', jobId], job);

        if (job.status === 'COMPLETED') {
          track({
            event: 'generation_completed',
            jobId: job.id,
            provider: job.model,
            model: job.model,
            durationMs: job.completedAt
              ? new Date(job.completedAt).getTime() -
                (job.startedAt ? new Date(job.startedAt).getTime() : Date.now())
              : 0,
            promptLength: job.prompt.length,
            success: true,
            userId: user?.id,
          });
          void queryClient.invalidateQueries({ queryKey: ['savedImages'] });
          es.close();
        }
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      sseErrorRef.current = true;
      es.close();
      // Trigger polling fallback by refetching
      void queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    };

    return () => {
      es.close();
    };
  }, [jobId, queryClient, user?.id]);

  return query;
}

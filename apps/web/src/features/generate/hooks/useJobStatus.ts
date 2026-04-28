import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { GenerationJob } from '@ai-platform/types';
import { API_ROUTES } from '@ai-platform/config';
import { getAccessToken } from '@ai-platform/api-client';
import { getJobStatus } from '../../../services/image.service';
import { track } from '../../../lib/analytics';
import { useAuthStore } from '@ai-platform/store';

const TERMINAL = new Set(['COMPLETED', 'FAILED']);

export function useJobStatus(jobId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  // true when SSE errored *without* a terminal status (use polling fallback)
  const sseErrorRef = useRef(false);
  // true once we received a COMPLETED or FAILED message over SSE
  const terminalRef = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Polling fallback — enabled only when SSE fails before a terminal state
  const query = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => (jobId ? getJobStatus(jobId) : null),
    staleTime: 0,
    enabled: Boolean(jobId) && sseErrorRef.current,
    refetchInterval: (q) => {
      // Stop polling once we have a terminal status in the cache
      const data = q.state.data as GenerationJob | null | undefined;
      if (!sseErrorRef.current) return false;
      if (data && TERMINAL.has(data.status)) return false;
      return 2000;
    },
  });

  useEffect(() => {
    if (!jobId) return;

    sseErrorRef.current = false;
    terminalRef.current = false;

    // EventSource cannot send Authorization headers — pass token as query param
    const token = getAccessToken();
    const sseUrl = `${API_ROUTES.IMAGES.JOB_EVENTS(jobId)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const es = new EventSource(sseUrl, { withCredentials: true });
    eventSourceRef.current = es;

    es.onmessage = (event: MessageEvent<string>) => {
      try {
        const job = JSON.parse(event.data) as GenerationJob;
        queryClient.setQueryData(['job', jobId], job);

        if (TERMINAL.has(job.status)) {
          terminalRef.current = true;
          es.close();

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
          }
        }
      } catch {
        // ignore parse errors — malformed heartbeat comment etc.
      }
    };

    es.onerror = () => {
      es.close();
      // Only fall back to polling if we haven't received a terminal status over SSE
      if (!terminalRef.current) {
        sseErrorRef.current = true;
        void queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      }
    };

    return () => {
      es.close();
    };
  }, [jobId, queryClient, user?.id]);

  return query;
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { DEFAULT_ORG_ID } from '../../lib/propertyConfig';
import type { ComplianceJob, UpdateComplianceJobPayload } from './types';

type ComplianceJobResponse = Omit<ComplianceJob, 'id'> & { taskId: number };

function unpackData<T>(payload: any): T {
  return (payload?.data ?? payload) as T;
}

function normalizeJob(job: ComplianceJobResponse): ComplianceJob {
  return {
    ...job,
    id: job.taskId,
    checklist: job.checklist ?? [],
  };
}

export async function getComplianceJob(
  taskId: number,
  hotelCode: string,
  orgId = DEFAULT_ORG_ID,
) {
  const response = await api.get<any>(
    `/api/v1/orgs/${orgId}/hotels/${hotelCode}/compliance/jobs/${taskId}`,
  );
  return normalizeJob(unpackData<ComplianceJobResponse>(response.data));
}

export async function updateComplianceJob(
  taskId: number,
  hotelCode: string,
  payload: UpdateComplianceJobPayload,
  orgId = DEFAULT_ORG_ID,
) {
  const response = await api.patch<any>(
    `/api/v1/orgs/${orgId}/hotels/${hotelCode}/compliance/jobs/${taskId}`,
    payload,
  );
  return normalizeJob(unpackData<ComplianceJobResponse>(response.data));
}

export function useComplianceJob(
  taskId: number | undefined,
  hotelCode: string | undefined,
  orgId = DEFAULT_ORG_ID,
) {
  return useQuery({
    queryKey: ['compliance-job', orgId, hotelCode, taskId],
    queryFn: () => getComplianceJob(taskId as number, hotelCode as string, orgId),
    enabled: taskId != null && !!hotelCode && !!orgId,
  });
}

export function useUpdateComplianceJob(hotelCode: string | undefined, orgId = DEFAULT_ORG_ID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: number; payload: UpdateComplianceJobPayload }) =>
      updateComplianceJob(taskId, hotelCode as string, payload, orgId),
    onSuccess: (job) => {
      queryClient.setQueryData(['compliance-job', orgId, hotelCode, job.id], job);
      queryClient.invalidateQueries({ queryKey: ['tasks', orgId] });
    },
  });
}

import customFetch from '@/utils/customFetch'
import type { Job } from '@/utils/types'
import { useQuery } from '@tanstack/react-query'

export function useOpenShifts() {
  return useQuery({
    queryKey: ['open-shifts'],
    queryFn: async () => {
      const { data } = await customFetch.get<{ jobs: Job[] }>('/workers/open-shifts')
      return data.jobs
    },
  })
}

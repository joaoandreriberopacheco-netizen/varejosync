import { QueryClient } from '@tanstack/react-query';
import { P38_GC_TIME, P38_STALE_TIME } from '@/lib/p38QueryConfig';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: P38_STALE_TIME,
			gcTime: P38_GC_TIME,
		},
	},
});
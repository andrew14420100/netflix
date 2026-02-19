import { useQuery } from '@tanstack/react-query';

interface SectionConfig {
  name: string;
  apiString: string;
  mediaType: string;
  order: number;
}

const API_URL = import.meta.env.VITE_BACKEND_URL || "";

/**
 * ✅ OPTIMIZED: Custom hook for sections with caching
 * - Caches sections data for 10 minutes
 * - Returns cached data instantly on navigation back
 */
export function useSectionsData() {
  return useQuery<SectionConfig[]>({
    queryKey: ['sections'],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_URL}/api/public/sections`);
        if (response.ok) {
          const data = await response.json();
          return data.items || [];
        }
        return [];
      } catch (e) {
        console.log("Using default sections");
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

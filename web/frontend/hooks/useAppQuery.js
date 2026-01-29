/**
 * @fileoverview React Query Hook for Shopify App
 *
 * A custom hook that wraps TanStack Query's useQuery to provide authenticated
 * data fetching within the Shopify App Bridge context.
 *
 * Features:
 * - Automatically acquires session token
 * - Attaches Bearer token to requests
 * - Manages loading and error states
 * - Caches results via React Query
 *
 * @module hooks/useAppQuery
 * @requires @shopify/app-bridge-utils
 * @requires @shopify/app-bridge-react
 * @requires @tanstack/react-query
 */

import { getSessionToken } from "@shopify/app-bridge-utils";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useQuery } from "@tanstack/react-query";
 
/**
 * Custom hook for authenticated data fetching
 *
 * @function useAppQuery
 * @param {Object} params - Hook parameters
 * @param {string} params.url - API endpoint URL to fetch
 * @param {Object} [params.reactQueryOptions] - Additional options for useQuery
 * @returns {Object} Query result object (data, isLoading, error, etc.)
 *
 * @example
 * const { data, isLoading } = useAppQuery({
 *   url: '/api/products',
 *   reactQueryOptions: { enabled: true }
 * });
 */
export function useAppQuery({ url, reactQueryOptions = {} }) {
  const app = useAppBridge();
 
  return useQuery({
    queryKey: [url],
    queryFn: async () => {
      if (!app) throw new Error("AppBridge not ready");
      const token = await getSessionToken(app);
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
 
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!app, 
    ...reactQueryOptions,
  });
}
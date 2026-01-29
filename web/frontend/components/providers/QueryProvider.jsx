/**
 * @fileoverview React Query Provider
 *
 * Configures the TanStack Query client for data fetching and state management.
 * Sets up the query cache and mutation cache for the application.
 *
 * @module providers/QueryProvider
 * @requires @tanstack/react-query
 */

import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";

/**
 * Query Provider Component
 *
 * Initializes a new QueryClient instance and provides it to the component tree.
 * This enables the use of useQuery and useMutation hooks throughout the app.
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} QueryClientProvider wrapping children
 *
 * @see https://tanstack.com/query/latest/docs/react/reference/QueryClientProvider
 */
export function QueryProvider({ children }) {
  const client = new QueryClient({
    queryCache: new QueryCache(),
    mutationCache: new MutationCache(),
  });

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
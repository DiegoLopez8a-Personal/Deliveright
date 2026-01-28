import { getSessionToken } from "@shopify/app-bridge-utils";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useQuery } from "@tanstack/react-query";
 
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
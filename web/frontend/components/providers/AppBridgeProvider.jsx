import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Provider } from "@shopify/app-bridge-react";
 
export function AppBridgeProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
 
  const host = window.__SHOPIFY_HOST__;
  const apiKey = window.__SHOPIFY_API_KEY__;
 
  if (!host) return null;
 
  const history = useMemo(
    () => ({
      replace: (path) => {
        navigate(path, { replace: true });
      },
    }),
    [navigate]
  );
 
  const routerConfig = useMemo(() => ({ history, location }), [history, location]);
 
  const [appBridgeConfig] = useState(() => ({
    host,
    apiKey,
    forceRedirect: true,
  }));
 
  return (
<Provider config={appBridgeConfig} router={routerConfig}>
      {children}
</Provider>
  );
}
/**
 * @fileoverview Shopify App Bridge Provider
 *
 * Initializes the Shopify App Bridge context, which enables communication
 * between the embedded app and the Shopify Admin interface. It also synchronizes
 * client-side routing (React Router) with App Bridge history.
 *
 * Key Functions:
 * - Initializes App Bridge with API key and host
 * - Syncs navigation history
 * - Handles force redirects
 *
 * @module providers/AppBridgeProvider
 * @requires @shopify/app-bridge-react
 * @requires react-router-dom
 */

import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Provider } from "@shopify/app-bridge-react";
 
/**
 * App Bridge Provider Component
 *
 * Wraps the application to provide App Bridge context.
 * Must be placed inside BrowserRouter to access location and navigate.
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element|null} App Bridge Provider or null if host missing
 */
export function AppBridgeProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
 
  // Retrieve configuration injected by server
  const host = window.__SHOPIFY_HOST__;
  const apiKey = window.__SHOPIFY_API_KEY__;
 
  if (!host) return null;
 
  // Configure history adapter for App Bridge
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
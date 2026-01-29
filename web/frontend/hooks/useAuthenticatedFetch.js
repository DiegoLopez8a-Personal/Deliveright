/**
 * @fileoverview Authenticated Fetch Hook
 *
 * A custom hook that provides a fetch function pre-configured with Shopify
 * App Bridge authentication. It handles the addition of the session token
 * to requests and intercepts responses to handle re-authorization flows.
 *
 * Features:
 * - Wraps Shopify's authenticatedFetch
 * - Handles re-authorization headers automatically
 * - Redirects to auth flow if session expires
 *
 * @module hooks/useAuthenticatedFetch
 * @requires @shopify/app-bridge-utils
 * @requires @shopify/app-bridge-react
 * @requires @shopify/app-bridge/actions
 */

import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";

/**
 * Custom hook returning an authenticated fetch function
 *
 * @function useAuthenticatedFetch
 * @returns {Function} Authenticated fetch function
 *
 * @example
 * const fetch = useAuthenticatedFetch();
 * const response = await fetch('/api/data');
 */
export function useAuthenticatedFetch() {
  const app = useAppBridge();
  const fetchFunction = authenticatedFetch(app);

  return async (uri, options) => {
    console.log("opts", uri, options);
    const response = await fetchFunction(uri, options);
    console.log("response", response);
    checkHeadersForReauthorization(response.headers, app);
    return response;
  };
}

/**
 * Check response headers for re-authorization signals
 *
 * Inspects response headers for Shopify-specific flags indicating that
 * the current session is invalid or expired. If found, redirects the
 * user to the authentication flow.
 *
 * @function checkHeadersForReauthorization
 * @param {Headers} headers - Response headers
 * @param {Object} app - App Bridge instance
 */
function checkHeadersForReauthorization(headers, app) {
  console.log("headers", headers);
  if (headers.get("X-Shopify-API-Request-Failure-Reauthorize") === "1") {
    const authUrlHeader =
      headers.get("X-Shopify-API-Request-Failure-Reauthorize-Url") ||
      `/api/auth`;

    console.log("url", authUrlHeader);

    const redirect = Redirect.create(app);
    redirect.dispatch(
      Redirect.Action.REMOTE,
      authUrlHeader.startsWith("/")
        ? `https://${window.location.host}${authUrlHeader}`
        : authUrlHeader
    );
  }
}
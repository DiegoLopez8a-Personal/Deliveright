/**
 * @fileoverview Exit Iframe Page
 *
 * A utility page used to break out of the Shopify Admin iframe context.
 * This is often needed during authentication flows or when redirecting
 * to external URLs that cannot be framed.
 *
 * @module pages/ExitIframe
 * @requires @shopify/app-bridge-react
 * @requires react-router-dom
 */

import { Redirect } from "@shopify/app-bridge/actions";
import { useAppBridge, Loading } from "@shopify/app-bridge-react";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Exit Iframe Component
 *
 * Uses App Bridge Redirect action to navigate the parent window
 * to the specified redirectUri.
 *
 * @component
 * @returns {JSX.Element} Loading indicator while redirecting
 */
export default function ExitIframe() {
  const app = useAppBridge();
  const { search } = useLocation();

  useEffect(() => {
    if (!!app && !!search) {
      const params = new URLSearchParams(search);
      const redirectUri = params.get("redirectUri");
      const url = new URL(decodeURIComponent(redirectUri));

      if (url.hostname === location.hostname) {
        const redirect = Redirect.create(app);
        redirect.dispatch(
          Redirect.Action.REMOTE,
          decodeURIComponent(redirectUri)
        );
      }
    }
  }, [app, search]);

  return <Loading />;
}

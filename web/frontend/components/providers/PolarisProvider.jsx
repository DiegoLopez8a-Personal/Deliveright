/**
 * @fileoverview Polaris Design System Provider
 *
 * Configures the Shopify Polaris design system for the application.
 * It wraps the app with the Polaris AppProvider and injects a custom
 * Link component to handle navigation correctly within the embedded app context.
 *
 * @module providers/PolarisProvider
 * @requires react
 * @requires @shopify/polaris
 */

import { useCallback } from "react";
import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";

/**
 * Custom Link Component for Polaris
 *
 * Adapts Polaris navigation to work within the Shopify App Bridge environment.
 * Handles both internal routing and external links.
 *
 * Logic:
 * - External links: Open in new tab
 * - Internal links: Handled via window.open (or App Bridge navigation in future)
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.url - Destination URL
 * @param {React.ReactNode} props.children - Link content
 * @param {boolean} [props.external] - Force external link behavior
 * @returns {JSX.Element} Rendered link
 */
function AppBridgeLink({ url, children, external, ...rest }) {
  const handleClick = useCallback(() => window.open(url), [url]);

  const IS_EXTERNAL_LINK_REGEX = /^(?:[a-z][a-z\d+.-]*:|\/\/)/;

  if (external || IS_EXTERNAL_LINK_REGEX.test(url)) {
    return (
      <a {...rest} href={url} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return (
    <a {...rest} onClick={handleClick}>
      {children}
    </a>
  );
}

/**
 * Polaris Provider Component
 *
 * Wraps the application to provide Polaris context and styles.
 * Configures the custom link component for all Polaris components that use links.
 *
 * Usage:
 * Wrap the root application component with PolarisProvider.
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} App wrapped in Polaris Provider
 *
 * @example
 * <PolarisProvider>
 *   <App />
 * </PolarisProvider>
 */
export function PolarisProvider({ children }) {

  return (
    <AppProvider linkComponent={AppBridgeLink}>
      {children}
    </AppProvider>
  );
}
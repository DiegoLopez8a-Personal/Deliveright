/**
 * @fileoverview Main Application Component
 *
 * The root component of the React frontend application. It sets up the
 * necessary providers for Shopify App Bridge, Polaris UI, and React Query,
 * and initializes the client-side router.
 *
 * Providers Chain:
 * 1. PolarisProvider - Shopify's design system
 * 2. BrowserRouter - Client-side routing
 * 3. AppBridgeProvider - Communication with Shopify Admin
 * 4. QueryProvider - Data fetching and caching
 *
 * @module frontend/App
 * @requires react-router-dom
 * @requires ./Routes
 * @requires ./components
 */

import { BrowserRouter } from "react-router-dom";
import Routes from "./Routes";

import {
  AppBridgeProvider,
  QueryProvider,
  PolarisProvider,
} from "./components";
import "./assets/style.css"

/**
 * Root App Component
 *
 * Automatically loads all page components from the ./pages directory
 * and passes them to the Routes component for dynamic routing.
 *
 * @component
 * @returns {JSX.Element} The rendered application
 */
export default function App() {
  // Any .tsx or .jsx files in /pages will become a route
  // See documentation for <Routes /> for more info
  const pages = import.meta.globEager("./pages/**/!(*.test.[jt]sx)*.([jt]sx)");

  return (
    <PolarisProvider>
      <BrowserRouter>
        <AppBridgeProvider>
          <QueryProvider>
            <Routes pages={pages} />
          </QueryProvider>
        </AppBridgeProvider>
      </BrowserRouter>
    </PolarisProvider>
  );
}

/**
 * @fileoverview File-based Routing System
 *
 * Implements a Next.js-style file-based routing system for React Router.
 * Automatically generates routes based on the file structure in the /pages directory.
 *
 * Routing Rules:
 * - `/pages/index.jsx` -> `/`
 * - `/pages/about.jsx` -> `/about`
 * - `/pages/blog/[id].jsx` -> `/blog/:id` (Dynamic parameters)
 * - `/pages/[...catchAll].jsx` -> `*` (Catch-all routes)
 *
 * @module frontend/Routes
 * @requires react-router-dom
 */

import { Routes as ReactRouterRoutes, Route } from "react-router-dom";

/**
 * Routes Component
 *
 * Renders the React Router switch with all dynamically generated routes.
 * Handles the special 'NotFound' route for 404 pages.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.pages - Object containing imported page modules (from import.meta.globEager)
 * @returns {JSX.Element} Configured Routes component
 */
export default function Routes({ pages }) {
  const routes = useRoutes(pages);
  const routeComponents = routes.map(({ path, component: Component }) => (
    <Route key={path} path={path} element={<Component />} />
  ));

  const NotFound = routes.find(({ path }) => path === "/notFound").component;

  return (
    <ReactRouterRoutes>
      {routeComponents}
      <Route path="*" element={<NotFound />} />
    </ReactRouterRoutes>
  );
}

/**
 * Custom hook to generate route configuration from file paths
 *
 * Parses file paths from the pages directory and converts them into
 * React Router compatible path strings.
 *
 * Transformations:
 * - Removes `./pages` prefix and file extensions
 * - Converts `index` to root `/`
 * - Lowercases first letter of path segments
 * - Converts `[param]` to `:param` syntax
 *
 * @function useRoutes
 * @param {Object} pages - Imported page modules
 * @returns {Array<Object>} List of route objects { path, component }
 */
function useRoutes(pages) {
  const routes = Object.keys(pages)
    .map((key) => {
      let path = key
        .replace("./pages", "")
        .replace(/\.(t|j)sx?$/, "")
        /**
         * Replace /index with /
         */
        .replace(/\/index$/i, "/")
        /**
         * Only lowercase the first letter. This allows the developer to use camelCase
         * dynamic paths while ensuring their standard routes are normalized to lowercase.
         */
        .replace(/\b[A-Z]/, (firstLetter) => firstLetter.toLowerCase())
        /**
         * Convert /[handle].jsx and /[...handle].jsx to /:handle.jsx for react-router-dom
         */
        .replace(/\[(?:[.]{3})?(\w+?)\]/g, (_match, param) => `:${param}`);

      if (path.endsWith("/") && path !== "/") {
        path = path.substring(0, path.length - 1);
      }

      if (!pages[key].default) {
        console.warn(`${key} doesn't export a default React component`);
      }

      return {
        path,
        component: pages[key].default,
      };
    })
    .filter((route) => route.component);

  return routes;
}

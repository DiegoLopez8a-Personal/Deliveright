/**
 * @fileoverview 404 Not Found Page
 *
 * Renders a friendly error page when the user navigates to a route that
 * does not exist within the application.
 *
 * @module pages/NotFound
 * @requires @shopify/polaris
 */

import { Card, EmptyState, Page } from "@shopify/polaris";
import { notFoundImage } from "../assets";

/**
 * Not Found Page Component
 *
 * Displays an empty state with an error message and suggested actions.
 *
 * @component
 * @returns {JSX.Element} 404 Page
 */
export default function NotFound() {
  return (
    <Page>
      <Card>
        <Card.Section>
          <EmptyState
            heading="There is no page at this address"
            image={notFoundImage}
          >
            <p>
              Check the URL and try again, or use the search bar to find what
              you need.
            </p>
          </EmptyState>
        </Card.Section>
      </Card>
    </Page>
  );
}

/**
 * @fileoverview Related Pages Links Component
 *
 * Displays a card containing a list of helpful external links to
 * Deliveright's documentation, policies, and support pages.
 *
 * Links Included:
 * - Service Levels
 * - Coverage Map
 * - Terms & Conditions
 * - Claims Policy
 * - Contact Us
 *
 * @module components/LinksCard
 * @requires @shopify/polaris
 */

import {Card, List} from "@shopify/polaris";

/**
 * Links Card Component
 *
 * Renders a Polaris Card with a list of external resource links.
 * All links open in a new tab.
 *
 * @component
 * @returns {JSX.Element} Card with links
 */
export default () => {
    return <div class="links_card">
        <Card title="Related Pages" sectioned>
            <List>
                <List.Item>
                    <a target="_blank" href="https://www.deliveright.com/services/">Service Levels</a>
                </List.Item>
                <List.Item>
                    <a target="_blank" href="https://www.deliveright.com/coverage/">Coverage</a>
                </List.Item>
                <List.Item>
                    <a target="_blank" href="https://www.deliveright.com/terms-conditions/">Terms and Conditions</a>
                </List.Item>
                <List.Item>
                    <a target="_blank" href="https://www.deliveright.com/claims-policy/">Claims Policy</a>
                </List.Item>
                <List.Item>
                    <a target="_blank" href="https://www.deliveright.com/contact-us/">Contact us</a>
                </List.Item>
            </List>
        </Card>
    </div>

}
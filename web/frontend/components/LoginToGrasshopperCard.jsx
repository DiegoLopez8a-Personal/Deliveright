/**
 * @fileoverview Grasshopper Login Card Component
 *
 * Provides a direct link for users to log in to the Deliveright (Grasshopper)
 * platform. Used on the dashboard to facilitate quick access to the external
 * management system.
 *
 * @module components/LoginToGrasshopperCard
 * @requires @shopify/polaris
 */

import {Button, Card} from "@shopify/polaris";

/**
 * Login Card Component
 *
 * Renders a card with information and a call-to-action button
 * pointing to the Deliveright secure login page.
 *
 * @component
 * @returns {JSX.Element} Login card
 */
export default () => {
    return <Card
        title="Login to Your Grasshopper Account"
        sectioned
    >
        Book, track, edit and manage all of your Deliveright orders on your Grasshopper shipping platform.
        <p>
            For any order inquiry, feel free to contact our customer service at <a
            href="mailto: orders@deliveright.com">orders@deliveright.com</a> or <a
            href="tel: 862-279-7332">862-279-7332</a>.
            <br/>
            You can also chat with us directly on<a target="_blank"
                                                    href="https://www.deliveright.com"> www.deliveright.com</a>.
            <br/>
        </p>
        <br/>
        <a target="_blank" href="https://secure.deliveright.com" style={{color: "transparent"}}>
            <Button>Login To Deliveright</Button>
        </a>
    </Card>
}
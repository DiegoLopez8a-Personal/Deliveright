/**
 * @fileoverview Carrier Service Activation Component
 *
 * Displays a warning banner and instructional modal when the Carrier Service
 * is not detected on the shop. Provides a guided walkthrough to enable
 * third-party carrier shipping (a Shopify requirement) and a button to
 * activate the integration.
 *
 * @module components/CarrierServiceError
 * @requires react
 * @requires @shopify/polaris
 * @requires ../hooks
 */

import React, {useState} from "react";
import {
    Modal,
    Banner,
    Heading
} from "@shopify/polaris";
import { activateSteps } from "../assets";
import { useAuthenticatedFetch } from "../hooks";

/**
 * Attempt to activate the carrier service via API
 *
 * @async
 * @function createCarrier
 * @param {Function} setToastProps - State setter for toast notifications
 * @param {Function} afterActivate - Callback to run on success
 * @param {Function} setLoading - State setter for loading status
 * @param {Function} fetch - Authenticated fetch instance
 */
const createCarrier = async (setToastProps, afterActivate, setLoading, fetch) => {
    setLoading(true)
    try {
        await fetch("/api/carrier/activate")
        setToastProps({
            content: "You have successfully added carrier service!",
            error: false,
        });
        afterActivate()
    }
    catch {
        setToastProps({
            content: "An error has occurred, make sure you followed the instructions to enable Shopify Carrier API",
            error: true,
        });
    }
}

/**
 * Carrier Service Error Component
 *
 * Renders a banner alerting the user that the carrier service is inactive.
 * Clicking the link opens a modal with step-by-step instructions.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.setToastProps - Toast notification setter
 * @param {Function} props.afterActivate - Success callback
 * @returns {JSX.Element} Banner and Modal components
 */
export default (props) => {
    const [carrierInstructionsModal, setCarrierInstructionsModal] = useState(false)
    const [loading, setLoading] = useState(false)

    const fetch = useAuthenticatedFetch()

    return (
        <>
            <Banner status="critical" title="Carrier service is not activated" >
                <p>Please follow the instructions <a href="#" onClick={() =>
                    setCarrierInstructionsModal(true)}>
                    to enable Custom Carrier Shipping API on your Shopify store.</a>
                </p>
            </Banner>


            <Modal
                open={carrierInstructionsModal}
                onClose={() => setCarrierInstructionsModal(false)}
                title="How to enable Shopify Carrier API"
                primaryAction={{
                    content: "I'm done with the instructions. Activate carrier now.",
                    onAction: () => createCarrier(props.setToastProps,
                        props.afterActivate, setLoading, fetch),
                    loading
                }}
                secondaryActions={[
                    {
                        content: 'Close without activating',
                        onAction: () => setCarrierInstructionsModal(false),
                        disabled: loading
                    },
                ]}
            >
                <Modal.Section>
                    <Heading>Click on your store `Settings`</Heading>
                    <img src={activateSteps[0]} width="100%" height={"100%"} />
                    <br />
                    <br />
                    <Heading>Click on Shipping and `Delivery`</Heading>
                    <img src={activateSteps[1]} width="100%" height={"100%"} />
                    <br />
                    <br />
                    <Heading>Scroll down and click on carrier integration:</Heading>
                    <img src={activateSteps[2]} width="100%" height={"100%"} />
                    <br />
                    <p>
                        To enable custom carrier API, you may need to upgrade your Shopify plan. Please contact <a
                        href="https://help.shopify.com/support" target="_blank">Shopify support</a> for more information.<br/></p>
                    <br />
                    <img src={activateSteps[3]} width="100%" height={"100%"} />

                    <br />
                    <br />
                    <Heading>Once your account has been enabled, you will see the integration option enabled.</Heading>
                    <img src={activateSteps[4]} width="100%" height={"100%"} />

                    <br />
                    <br />
                    <Heading>To confirm that your store is registered with our carrier API, please visit our app page</Heading>
                    <img src={activateSteps[5]} width="100%" height={"100%"} />

                    <br />
                    <br />
                    <Heading>And then click on the button below</Heading>

                    <br />
                    <br />
                    <Heading>You are all set!</Heading>
                    <p>Try to check out with your card, and you will see our quote populated on your checkout page:</p>
                    <img src={activateSteps[7]} width="100%" height={"100%"} />

                    <br />
                    <p>If you still encounter any issues, please contact us at <a href="mailto:support@grasshopperlabs.io">support@grasshopperlabs.io</a></p>
                </Modal.Section>
            </Modal>
            <br></br>
        </>
    )
}
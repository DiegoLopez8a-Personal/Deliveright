/**
 * @fileoverview Carrier Service Creation Utility
 *
 * This module handles the registration and configuration of the carrier service
 * in the Shopify store. It ensures that the app is properly registered as a
 * shipping rate provider so it can be called during checkout.
 *
 * Functionality:
 * 1. Checks if the carrier service already exists
 * 2. If present, skips creation to prevent duplicates
 * 3. If missing, creates new carrier service via Shopify API
 *
 * Configuration:
 * Uses settings from config.js (name, callback URL, discovery options)
 *
 * @module utils/createCarrier
 * @requires ../config
 * @requires ../shopify
 * @requires ./validateCarrier
 *
 * @author Deliveright Development Team
 * @version 1.0.0
 */

import config from "../config.js"
import shopify from "../shopify.js";
import validateCarrier from "./validateCarrier.js";

/**
 * Create or verify carrier service in Shopify
 *
 * Checks if the Deliveright carrier service is already registered in the shop.
 * If not, it creates a new carrier service configuration pointing to the
 * app's callback URL.
 *
 * The carrier service enables:
 * - Real-time shipping rate calculations
 * - Service level selection at checkout
 *
 * @async
 * @function createCarrier
 * @param {Object} session - Shopify session for API authentication
 * @param {string} session.shop - Shop domain
 * @param {string} session.accessToken - API access token
 * @returns {Promise<void>}
 */
export default async function (session) {
    console.log("createCarrier: Starting carrier service creation for shop", session.shop); // Logs start of carrier creation
    console.log(session)
    console.log("createCarrier: Validating existing carriers"); // Logs carrier validation
    let CarrierList = await validateCarrier(session)
    if (CarrierList) {
        console.log("createCarrier: Carrier list retrieved", CarrierList.length); // Logs retrieved carrier list
        if (CarrierList?.find?.((service) => service.name === config.carrierService.name)) {
            console.log(
                `Carrier service creation was triggered, but it is already configured for store: ${session.shop}`
            );
            console.log("createCarrier: Carrier already exists, skipping creation"); // Logs existing carrier case
            return;
        }
    }
    console.log("createCarrier: Creating new carrier service"); // Logs new carrier creation
    const carrier_service = new shopify.api.rest.CarrierService({session: session});
    carrier_service.name = config.carrierService.name
    carrier_service.callback_url = config.carrierService.callback_url
    carrier_service.service_discovery = config.carrierService.service_discovery
    carrier_service.active = config.carrierService.active
    console.log("createCarrier: Saving carrier service for shop", session.shop); // Logs carrier save
    await carrier_service.save({
        update: true,
    });
    console.log(
        `Carrier service created for store: ${session.shop} on ${config.carrierService.callback_url}`
    );
    console.log("createCarrier: Carrier service creation completed"); // Logs completion of carrier creation
};
console.log("createCarrier: Exporting carrier service creation function"); // Logs function export
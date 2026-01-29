/**
 * @fileoverview Carrier Service Validator
 *
 * This module retrieves the list of currently configured carrier services
 * for a shop. It is used to verify the state of shipping configurations
 * and debug potential issues with rate calculations.
 *
 * @module utils/validateCarrier
 * @requires ../config
 * @requires ../shopify
 *
 * @author Deliveright Development Team
 * @version 1.0.0
 */

import config from "../config.js"
import shopify from "../shopify.js";

/**
 * Retrieve all carrier services for a shop
 *
 * Fetches the full list of carrier services registered with Shopify.
 *
 * @async
 * @function validateCarrier
 * @param {Object} session - Shopify session
 * @returns {Promise<Array<Object>|undefined>} List of carrier services or undefined on error
 */
export default async function (session) {
    console.log("validateCarrier: Starting carrier validation for shop", session.shop); // Logs start of carrier validation
    try {
        console.log("validateCarrier: Fetching carrier services"); // Logs carrier fetch
        const carriers = (await shopify.api.rest.CarrierService.all({session}))?.data
        console.log("Carrier service name: ", config.carrierService.name)
        console.log("validateCarrier: Retrieved carriers", carriers?.length || 0); // Logs retrieved carriers
        return carriers
    } catch (error) {
        console.log(error)
        console.error("validateCarrier: Error validating carrier services", error.message); // Logs error in carrier validation
    }
};
console.log("validateCarrier: Exporting carrier validation function"); // Logs function export
/**
 * @fileoverview Carrier Configuration Status Utility
 *
 * This module provides functionality to verify if the Deliveright carrier service
 * is properly configured and active in the Shopify store.
 *
 * Usage:
 * Used by the frontend to display status indicators and during app initialization
 * to determine if setup steps are required.
 *
 * @module utils/isCarrierConfigured
 * @requires ../config
 * @requires ../shopify
 *
 * @author Deliveright Development Team
 * @version 1.0.0
 */

import config from "../config.js"
import shopify from "../shopify.js";

/**
 * Check if the Deliveright carrier service is active
 *
 * Queries the Shopify Admin API for all registered carrier services and
 * checks if one matches the configured name in config.js.
 *
 * @async
 * @function isCarrierConfigured
 * @param {Object} session - Shopify session for API authentication
 * @returns {Promise<Object|undefined>} The carrier service object if found, undefined otherwise
 */
export default async function (session) {
    console.log("isCarrierConfigured: Checking carrier configuration for shop", session.shop); // Logs start of carrier check
    try {
        console.log("isCarrierConfigured: Fetching carrier services"); // Logs carrier fetch
        const carriers = (await shopify.api.rest.CarrierService.all({session}))?.data
        console.log("Carrier service name: ", config.carrierService.name)
        console.log("isCarrierConfigured: Retrieved carriers", carriers?.length || 0); // Logs retrieved carriers
        console.log("isCarrierConfigured: Checking for carrier", config.carrierService.name); // Logs carrier name check
        console.log("isCarrierConfigured: Carrier found", carriers); // Logs whether carrier was found
        return carriers?.find?.((service) => service.name === config.carrierService.name);
    } catch (error) {
        console.log(error)
        console.error("isCarrierConfigured: Error checking carrier configuration", error.message); // Logs error in carrier check
    }
};
console.log("isCarrierConfigured: Exporting carrier configuration check function"); // Logs function export
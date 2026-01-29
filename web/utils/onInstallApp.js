/**
 * @fileoverview App Installation and Configuration Handler
 *
 * This module orchestrates the initial setup process when the app is installed
 * or re-authenticated. It synchronizes the Shopify store with the Deliveright
 * system and sets up necessary components like the carrier service.
 *
 * Workflow:
 * 1. Verify store existence in Deliveright
 * 2. Update Deliveright with new Shopify access token
 * 3. Initialize carrier service for shipping rates
 *
 * @module utils/onInstallApp
 * @requires ../classes/deliveright
 * @requires ./createCarrier
 *
 * @author Deliveright Development Team
 * @version 1.0.0
 */

import deliveright from "../classes/deliveright.js"
import createCarrier from "./createCarrier.js"

/**
 * Perform post-installation setup tasks
 *
 * Called after OAuth completion to ensure the app is fully configured.
 *
 * Key Actions:
 * - Syncs authentication tokens: Updates Deliveright with the new Shopify access token
 * - Creates carrier service: Ensures shipping rates can be calculated
 *
 * Pre-conditions:
 * - Valid Shopify session
 * - Store must already exist in Deliveright (created via /api/store)
 *
 * @async
 * @function onInstallApp
 * @param {Object} session - Shopify session
 * @param {string} session.shop - Shop domain
 * @param {string} session.accessToken - API access token
 * @returns {Promise<void>}
 */
export default async function onInstallApp(session) {
    console.log("onInstallApp: Starting app installation for shop", session.shop); // Logs start of app installation
    const {shop, accessToken} = session

    // Check if the store exists in deliveright
    // If not, the user needs to first fill out the form
    console.log("onInstallApp: Checking store existence in Deliveright"); // Logs store check
    let retailer = undefined;
    try {
        retailer = await deliveright.getStore(shop);
        console.log("onInstallApp: Store retrieved for shop", shop); // Logs successful store retrieval
    } catch (err) {
        console.error("Error getting store", err);
        console.error("onInstallApp: Error getting store", err.message); // Logs error in store retrieval
    }
    if (retailer) {
        console.log("onInstallApp: Updating store with access token for shop", shop); // Logs store update
        await deliveright.updateStore(shop, {auth: {access_token: accessToken}})
        console.log("onInstallApp: Store updated, creating carrier"); // Logs successful store update
        await createCarrier(session)
        console.log("onInstallApp: Carrier creation completed for shop", shop); // Logs carrier creation completion
    } else {
        console.warn("onInstallApp: No retailer found, skipping store update and carrier creation"); // Logs missing retailer case
    }
}
console.log("onInstallApp: Exporting app installation function"); // Logs function export
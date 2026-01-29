/**
 * @fileoverview Shopify App Configuration and Initialization
 *
 * This module configures and initializes the Shopify App instance using the
 * shopify-app-express library. It sets up the API client, authentication,
 * webhooks, and session storage.
 *
 * Key Components:
 * - API Configuration: API keys, scopes, versioning
 * - Authentication: OAuth paths
 * - Webhooks: Webhook processing path
 * - Session Storage: SQLite database for storing session data
 * - Billing: Configuration for app charges (currently disabled)
 *
 * @requires @shopify/shopify-api
 * @requires @shopify/shopify-app-express
 * @requires @shopify/shopify-app-session-storage-sqlite
 *
 * @author Deliveright Development Team
 * @version 1.0.0
 */

import { BillingInterval, LATEST_API_VERSION } from "@shopify/shopify-api";
import { shopifyApp } from "@shopify/shopify-app-express";
import { SQLiteSessionStorage } from "@shopify/shopify-app-session-storage-sqlite";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-10";

/**
 * Database path for session storage
 * Points to database.sqlite in the project root
 *
 * @constant {string}
 */
const DB_PATH = `${process.cwd()}/database.sqlite`;
console.log("Shopify Config: Setting database path", DB_PATH); // Logs database path setup

/**
 * Billing configuration object
 * Defines the charging model for the app
 *
 * Note: The transactions with Shopify will always be marked as test transactions,
 * unless NODE_ENV is production.
 *
 * @constant {Object}
 * @property {Object} "My Shopify One-Time Charge" - Example charge configuration
 * @property {number} amount - Charge amount (e.g., 5.0)
 * @property {string} currencyCode - Currency code (e.g., 'USD')
 * @property {string} interval - Billing interval (OneTime, Every30Days, etc.)
 */
const billingConfig = {
  "My Shopify One-Time Charge": {
    // This is an example configuration that would do a one-time charge for $5 (only USD is currently supported)
    amount: 5.0,
    currencyCode: "USD",
    interval: BillingInterval.OneTime,
  },
};
console.log("Shopify Config: Billing configuration initialized"); // Logs billing config setup

/**
 * Shopify App instance
 *
 * Configured with:
 * - API credentials from environment variables
 * - REST resources for Admin API access
 * - SQLite session storage
 * - Authentication and webhook paths
 *
 * Future flags enabled:
 * - customerAddressDefaultFix: Fixes customer address handling
 * - lineItemBilling: Enables improved billing for line items
 * - unstable_managedPricingSupport: Experimental pricing support
 *
 * @type {Object}
 */
const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SCOPES.split(","),
    hostName: process.env.HOST.replace(/https?:\/\//, ""),
    apiVersion: LATEST_API_VERSION,
    restResources,
    future: {
      customerAddressDefaultFix: true,
      lineItemBilling: true,
      unstable_managedPricingSupport: true,
    },
    billing: undefined, // or replace with billingConfig above to enable example billing
  },
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  sessionStorage: new SQLiteSessionStorage(DB_PATH),
});
console.log("Shopify Config: Shopify app instance created with API key", process.env.SHOPIFY_API_KEY); // Logs Shopify app instance creation

/**
 * Export the configured Shopify app instance
 *
 * @exports shopify
 */
export default shopify;
console.log("Shopify Config: Exporting Shopify app instance"); // Logs export of Shopify instance
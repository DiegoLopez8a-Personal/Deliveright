/**
 * @fileoverview GDPR Webhook Handlers
 *
 * This module defines the mandatory webhook handlers required by Shopify for GDPR compliance.
 * These webhooks handle requests for customer data access, customer data deletion (redaction),
 * and shop data deletion.
 *
 * Compliance Requirement:
 * Shopify requires all apps to implement these three webhooks to be listed in the App Store.
 * They allow merchants and customers to exercise their data rights under GDPR and CCPA.
 *
 * Handlers:
 * - CUSTOMERS_DATA_REQUEST: Provide all data stored for a customer
 * - CUSTOMERS_REDACT: Delete all data stored for a customer
 * - SHOP_REDACT: Delete all data stored for a shop (after uninstall)
 *
 * @module webhook_handlers/gdpr
 * @requires @shopify/shopify-api
 * @see https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
 *
 * @author Deliveright Development Team
 * @version 1.0.0
 */

import { DeliveryMethod } from "@shopify/shopify-api";

export default {
  /**
   * Customer Data Request Webhook Handler
   *
   * Invoked when a customer requests their data from a store owner.
   * The app should return all data it holds about the specified customer.
   *
   * Triggered via: Shopify Admin > Customers > Request Data
   *
   * @property {Object} CUSTOMERS_DATA_REQUEST
   * @property {string} CUSTOMERS_DATA_REQUEST.deliveryMethod - HTTP delivery
   * @property {string} CUSTOMERS_DATA_REQUEST.callbackUrl - /api/webhooks
   * @property {Function} CUSTOMERS_DATA_REQUEST.callback - Async handler function
   *
   * @see https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#customers-data_request
   */
  CUSTOMERS_DATA_REQUEST: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      console.log("CUSTOMERS_DATA_REQUEST: Processing data request for shop", shop); // Logs data request processing
      const payload = JSON.parse(body);
      console.log("CUSTOMERS_DATA_REQUEST: Parsed payload for customer ID", payload.customer?.id); // Logs payload parsing
      // Payload has the following shape:
      // {
      //   "shop_id": 954889,
      //   "shop_domain": "{shop}.myshopify.com",
      //   "orders_requested": [
      //     299938,
      //     280263,
      //     220458
      //   ],
      //   "customer": {
      //     "id": 191167,
      //     "email": "john@example.com",
      //     "phone": "555-625-1199"
      //   },
      //   "data_request": {
      //     "id": 9999
      //   }
      // }
    },
  },

  /**
   * Customer Data Redaction Webhook Handler
   *
   * Invoked when a store owner requests deletion of a customer's data.
   * The app must remove all personal data associated with the customer ID.
   *
   * Triggered via: Shopify Admin > Customers > Erase Personal Data
   *
   * @property {Object} CUSTOMERS_REDACT
   * @property {string} CUSTOMERS_REDACT.deliveryMethod - HTTP delivery
   * @property {string} CUSTOMERS_REDACT.callbackUrl - /api/webhooks
   * @property {Function} CUSTOMERS_REDACT.callback - Async handler function
   *
   * @see https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#customers-redact
   */
  CUSTOMERS_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      console.log("CUSTOMERS_REDACT: Processing redaction request for shop", shop); // Logs redaction request processing
      const payload = JSON.parse(body);
      console.log("CUSTOMERS_REDACT: Parsed payload for customer ID", payload.customer?.id); // Logs payload parsing
      // Payload has the following shape:
      // {
      //   "shop_id": 954889,
      //   "shop_domain": "{shop}.myshopify.com",
      //   "customer": {
      //     "id": 191167,
      //     "email": "john@example.com",
      //     "phone": "555-625-1199"
      //   },
      //   "orders_to_redact": [
      //     299938,
      //     280263,
      //     220458
      //   ]
      // }
    },
  },

  /**
   * Shop Data Redaction Webhook Handler
   *
   * Invoked 48 hours after a store owner uninstalls the app.
   * The app should remove all data associated with the shop.
   *
   * Triggered via: App Uninstallation
   *
   * @property {Object} SHOP_REDACT
   * @property {string} SHOP_REDACT.deliveryMethod - HTTP delivery
   * @property {string} SHOP_REDACT.callbackUrl - /api/webhooks
   * @property {Function} SHOP_REDACT.callback - Async handler function
   *
   * @see https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#shop-redact
   */
  SHOP_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      console.log("SHOP_REDACT: Processing shop redaction for shop", shop); // Logs shop redaction processing
      const payload = JSON.parse(body);
      console.log("SHOP_REDACT: Parsed payload for shop ID", payload.shop_id); // Logs payload parsing
      // Payload has the following shape:
      // {
      //   "shop_id": 954889,
      //   "shop_domain": "{shop}.myshopify.com"
      // }
    },
  },
};
console.log("GDPR Webhooks: Exporting GDPR webhook handlers"); // Logs GDPR webhook handlers export
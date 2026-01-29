/**
 * @fileoverview Order Webhook Handlers
 *
 * This module handles order-related webhooks from Shopify, specifically the
 * ORDERS_FULFILLED event. It serves as the bridge between Shopify orders and
 * the Deliveright fulfillment system.
 *
 * Main Workflow:
 * 1. Receive ORDERS_FULFILLED webhook
 * 2. Verify order contains Deliveright service level
 * 3. Update line item locations using GraphQL
 * 4. Filter products eligible for Deliveright
 * 5. Create corresponding order in Deliveright system via API
 *
 * Key Features:
 * - Location Sync: Updates origin location for line items based on fulfillment location
 * - Deduplication: Prevents double-processing of orders using `processedOrders` utility
 * - Validation: Checks if shipping code matches a configured Deliveright service level
 *
 * @module webhook_handlers/order
 * @requires @shopify/shopify-api
 * @requires ../classes/deliveright
 * @requires ../shopify
 *
 * @author Deliveright Development Team
 * @version 1.0.0
 */

import { DeliveryMethod } from "@shopify/shopify-api";
import deliveright from "../classes/deliveright.js";
import shopify from "../shopify.js";
import config from "../config.js";
import filterDeliverightProducts from "../utils/filterDeliverightProducts.js";
import { markIfNew } from "../utils/processedOrders.js";

/**
 * Update origin locations for line items in an order
 *
 * Fetches the actual fulfillment location from Shopify via GraphQL and updates
 * the origin_location property of each line item in the payload. This is crucial
 * for correct routing and shipping calculations in Deliveright.
 *
 * Process:
 * 1. Iterate through successful fulfillments
 * 2. Query Shopify GraphQL API for location details by location_id
 * 3. Match fulfillment line items to payload line items
 * 4. Update origin_location with address details
 *
 * @async
 * @function update_line_items_location
 * @param {Object} session - Shopify session for API authentication
 * @param {Object} payload - Order webhook payload
 * @param {string} payload.id - Order ID
 * @param {Array<Object>} payload.fulfillments - List of fulfillments
 * @param {Array<Object>} payload.line_items - List of line items to update
 * @returns {Promise<Array>} Results of location update operations
 */
const update_line_items_location = async (session, payload) => {
  console.log("update_line_items_location: Starting location update for order", payload.id);
  console.log("update_line_items_location: Payload: ", payload);
  console.log("update_line_items_location: Payload fulfillments", JSON.stringify(payload.fulfillments, null, 2));

  const client = new shopify.api.clients.Graphql({ session });

  return await Promise.all(
    payload.fulfillments
      .filter((f) => f.status === "success")
      .map(async (fulfillment) => {
        try {
          console.log("update_line_items_location: Fetching location for fulfillment ID", fulfillment.id);
          console.log("update_line_items_location: Location ID", fulfillment.location_id);

          // Validar location_id
          if (!fulfillment.location_id) {
            console.warn(
              `update_line_items_location: No location_id provided for fulfillment ID ${fulfillment.id}`
            );
            return;
          }

          // Consulta GraphQL
          const query = `
            query GetFulfillmentLocation($id: ID!) {
              location(id: $id) {
                id
                name
                address {
                  address1
                  city
                  provinceCode
                  zip
                }
              }
            }
          `;

          const response = await client.query({
            data: {
              query,
              variables: { id: `gid://shopify/Location/${fulfillment.location_id}` },
            },
          });

          const origin = response.body.data.location;

          if (origin) {
            console.log("update_line_items_location: Processing line items for location", origin.name);
            fulfillment.line_items.forEach((lineItem) => {
              const lineItemIndex = payload.line_items.findIndex((li) => li.id === lineItem.id);

              if (lineItemIndex !== -1) {
                payload.line_items[lineItemIndex].origin_location = origin;
                console.log(
                  `update_line_items_location: Updated location for line item ${lineItem.id} to ${origin.name}`
                );
              } else {
                console.warn(
                  `update_line_items_location: No matching line item found for ID ${lineItem.id}`
                );
              }
            });
          } else {
            console.warn(
              `update_line_items_location: No origin location found for location_id ${fulfillment.location_id}`
            );
          }
        } catch (error) {
          console.error(
            `update_line_items_location: Error fetching location for fulfillment ID ${fulfillment.id} with location_id ${fulfillment.location_id}`,
            error.message
          );
          console.error("Error details:", error.response?.errors || error);
        }
      })
  );
};
/**
 * ORDERS_FULFILLED webhook callback handler
 *
 * Processes completed orders and submits them to Deliveright if eligible.
 *
 * Execution Flow:
 * 1. Parse webhook payload
 * 2. Fetch store configuration from Deliveright
 * 3. Check if shipping method matches a Deliveright service code
 * 4. If match:
 *    a. Update line item locations
 *    b. Filter for Deliveright-eligible products
 *    c. Check for duplicate processing
 *    d. Submit order to Deliveright API
 * 5. If no match: Log and skip
 *
 * @async
 * @function orders_fulfilled_callback
 * @param {string} topic - Webhook topic (ORDERS_FULFILLED)
 * @param {string} shop - Shop domain
 * @param {string} body - Raw webhook body (JSON string)
 * @param {string} webhookId - Unique webhook ID
 * @returns {Promise<void>}
 */
const orders_fulfilled_callback = async (topic, shop, body, webhookId) => {
  console.log("orders_fulfilled_callback: Processing ORDERS_FULFILLED webhook for shop", shop); // Logs webhook processing start
  let payload = JSON.parse(body);
  console.log("orders_fulfilled_callback: Parsed payload for order", payload.id); // Logs payload parsing
  try {
    console.log("orders_fulfilled_callback: Fetching store for shop", shop); // Logs store fetch
    const store = await deliveright.getStore(shop);
    console.log("orders_fulfilled_callback: Store retrieved for shop", shop); // Logs successful store fetch
    const session = {
      shop,
      accessToken: store.settings.auth.access_token,
    };
    const customerCarrierCode = payload.shipping_lines?.[0]?.code;
    let isDeliverightOrder = !!config.serviceLevels[customerCarrierCode];

    if (isDeliverightOrder) {
      console.log("orders_fulfilled_callback: Accepted Deliveright order", payload.id); // Logs Deliveright order acceptance
      try {
        console.log("orders_fulfilled_callback: Updating line item locations"); // Logs location update start
        await update_line_items_location(session, payload);

        payload.customer_address = payload.shipping_address || payload.customer?.default_address;
        console.log("orders_fulfilled_callback: Filtering products for order", payload.id); // Logs product filtering
        let filtered_items = await filterDeliverightProducts(shopify, session, payload.line_items);
        payload = { ...payload, line_items: filtered_items };
        console.log("orders_fulfilled_callback: Products filtered, creating new order"); // Logs filtered products
      } catch (e) {
        console.error("orders_fulfilled_callback: Error updating locations", e.message); // Logs error in location update
      }

        const isNew = await markIfNew(shop, payload.id);
        if (!isNew) {
          console.log(
            `orders_fulfilled_callback: Order ${payload.id} already processed for shop ${shop}`
          );
          return;
        }

        console.log("orders_fulfilled_callback: Sending order to Deliveright for shop", shop); // Logs order creation start
        console.log("information before calling  newORder, payload: ", payload,"-----------store: ",store,"....................shop: ",shop)
        await deliveright.newOrder(payload, store, shop);
      console.log("orders_fulfilled_callback: Order sent to Deliveright successfully"); // Logs successful order creation
    } else {
      console.log("orders_fulfilled_callback: Rejected non-Deliveright order", payload.id); // Logs non-Deliveright order rejection
    }
  } catch (e) {
    console.error("orders_fulfilled_callback: Error processing order", e.message); // Logs general error
    console.error("orders_fulfilled_callback: Payload on error", payload.id); // Logs payload ID on error
    console.error("orders_fulfilled_callback: Webhook ID", webhookId); // Logs webhook ID on error
  }
};

export default {
  /**
   * Order Fulfilled Webhook Configuration
   *
   * Triggers when an order is marked as fulfilled in Shopify.
   * This is the signal to send the order to Deliveright for processing.
   *
   * @property {Object} ORDERS_FULFILLED
   * @property {string} ORDERS_FULFILLED.deliveryMethod - HTTP delivery
   * @property {string} ORDERS_FULFILLED.callbackUrl - /api/webhooks
   * @property {Function} ORDERS_FULFILLED.callback - Handler function
   */
  ORDERS_FULFILLED: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: orders_fulfilled_callback,
  },
};
console.log("Order Webhook: Exporting ORDERS_FULFILLED webhook handler"); // Logs webhook handler export
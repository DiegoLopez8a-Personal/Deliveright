import { DeliveryMethod } from "@shopify/shopify-api";
import deliveright from "../classes/deliveright.js";
import shopify from "../shopify.js";
import config from "../config.js";
import filterDeliverightProducts from "../utils/filterDeliverightProducts.js";
import { markIfNew } from "../utils/processedOrders.js";

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
  ORDERS_FULFILLED: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: orders_fulfilled_callback,
  },
};
console.log("Order Webhook: Exporting ORDERS_FULFILLED webhook handler"); // Logs webhook handler export
import axios from "axios";
import config from "../config.js";
import _ from "lodash";
import shopify from "../shopify.js";
const LBS = 453.592;

class DeliverightApi {
  constructor(DELIVERIGHT_ID, DELIVERIGHT_SECRET) {
    console.log("DeliverightApi: Initializing with credentials");
    this.url = `${config.deliverightApi}/api/shopify/store?client_id=${DELIVERIGHT_ID}&client_secret=${DELIVERIGHT_SECRET}`;
    this.shippingUrl = `${config.deliverightApi}/api/shipping?client_id=${DELIVERIGHT_ID}&client_secret=${DELIVERIGHT_SECRET}`;
    this.newOrderUrl = `${config.deliverightApi}/api/shopify/order?client_id=${DELIVERIGHT_ID}&client_secret=${DELIVERIGHT_SECRET}`;
  }

  createStore(data) {    
    console.log("createStore: Creating store with data", data);
    console.log("createStore: Creating store with data", data.store_id);
    return new Promise((resolve, reject) => {
      let config = {
        method: "post",
        url: this.url,
        headers: { "Content-Type": "application/json" },
        data,
      };
      axios(config)
        .then((res) => {
          console.log("createStore: Store created successfully", res.status);
          if (res.data) {
            resolve({
              name: res.data.data.first_name + " " + res.data.data.last_name,
              first_name: res.data.data.first_name,
              last_name: res.data.data.last_name,
              address: res.data.data.address,
              company: res.data.data.company,
              status: 200,
            });
          } else {
            console.warn("createStore: No data in response");
            reject({ error: true });
          }
        })
        .catch((err) => {
          console.error("createStore: Error creating store", err.message);
          try {
            reject(err.response.data);
          } catch {
            reject({ error: true });
          }
        });
    });
  }

  getStore(id) {
    console.log("getStore: Fetching store info for ID", id);
    return new Promise((resolve, reject) => {
      const fullUrl = this.url + `&identifier=${id}`;
      const config = {
        method: "get",
        url: fullUrl,
        headers: {
          "Content-Type": "application/json",
        },
      };

      axios(config)
        .then((res) => {
          console.log("getStore: Store info retrieved, status:", res.status);
          if (res.data?.data) {
            console.log("getStore: Processing store data for ID", id);
            console.log("getStore: Processing store data:", res.data.data);
            resolve({
              name: res.data.data.first_name + " " + res.data.data.last_name,
              company: res.data.data.company,
              first_name: res.data.data.first_name,
              last_name: res.data.data.last_name,
              email: res.data.data.label_recipients?.[0]?.contact ?? null,
              address: res.data.data.address,
              status: 200,
              settings: res.data.data.shopify_settings,
              pricing_type: res.data.data.default_pricing_set_type,
            });
          } else {
            console.warn("getStore: No store data found for ID", id);
            reject({
              message: "Store doesn't exist",
              status: 400,
            });
          }
        })
        .catch((err) => {
          console.error("getStore: Error fetching store", err.message);
          if (err.response) {
            console.error("getStore: Error status:", err.response.status);
            reject(err.response.data);
          } else {
            reject({ error: true, message: err.message });
          }
        });
    });
  }

  async updateStore(id, data = {}) {
    console.log("updateStore: Updating store for ID", id);
    data.store_id = id;
    let config = {
      method: "patch",
      url: this.url,
      headers: { "Content-Type": "application/json" },
      data,
    };
    const res = await axios(config);
    console.log("updateStore: Store updated successfully", res.status);
    return res;
  }

  calculateShippingRate(IDENTIFIER, data, serviceLevel, retailer) {
    console.log("calculateShippingRate: Calculating rate for ID", IDENTIFIER, "Service:", serviceLevel);
    return new Promise((resolve, reject) => {
      const DESTINATION = data.rate.destination;
      const ORIGIN = data.rate.origin;
      const PRICING_TYPE = retailer.pricing_type || "1";
      let WEIGHT = 0;
      let WEIGHT_PER_ITEM = "";

      for (let product of data.rate.items) {
        WEIGHT += product.grams * product.quantity;
        WEIGHT_PER_ITEM += `&item_weight=${(product.grams * product.quantity) / LBS}`;
      }
      WEIGHT = WEIGHT / LBS;
      var config = {
        method: "get",
        url: `${this.shippingUrl}&steps=1&retailer_identifier=${IDENTIFIER}&zip=${DESTINATION.postal_code}&weight=${WEIGHT}&pickup_region=${ORIGIN.postal_code}&service_level=${serviceLevel}&pricing_type=${PRICING_TYPE}${WEIGHT_PER_ITEM}`,
        headers: {
          "Content-Type": "application/json",
        },
      };

      console.log("calculateShippingRate: Sending rate request", config.url);
      axios(config)
        .then((res) => {
          console.log("calculateShippingRate: Rate response received", res.status);
          if (!res.data.data.errorCode) {
            let shippingResult = res.data.data;
            if (!shippingResult || !shippingResult.cost) {
              console.warn("calculateShippingRate: No cost in response");
              return reject("Calculator was not able to calculate cost");
            }
            const price = this.formatPrice(
              this.getPriceByPaymentType(this.sumAccessorials(shippingResult), retailer.settings),
              retailer.settings
            );
            console.log("calculateShippingRate: Calculated price", price);
            resolve(price);
          } else {
            console.warn("calculateShippingRate: Error in response", res.data.data);
            reject(res.data.data);
          }
        })
        .catch((error) => {
          console.error("calculateShippingRate: Error fetching rate", error.message);
          reject(error);
        });
    });
  }

  async newOrder(data, store, store_id) {
    console.log("newOrder: Creating new order for store ID", store_id);
    let order = await this.createDeliverightOrder(data, store, store_id);
    console.log("newOrder: Order data prepared for store ID", store_id);
    console.log("newOrder: Order data", JSON.stringify(order, null, 2));

    const config = {
      method: "post",
      url: this.newOrderUrl,
      headers: { "Content-Type": "application/json" },
      data: order,
    };
    try {
      const res = await axios(config);
      console.log("newOrder: Order sent successfully", res.status);
      console.log("newOrder: Response data", res.data);
      return res.data;
    } catch (e) {
      console.error("newOrder: Error sending order", e.message);
      console.error("Error details:", JSON.stringify(e.response?.data, null, 2));
      throw e;
    }
  }

  async createDeliverightOrder(data, retailer, store_id) {
    console.log("createDeliverightOrder: Preparing order for store ID", store_id);
    console.log("Webhook data:", JSON.stringify({
      customer: data.customer,
      customer_address: data.customer_address,
      shipping_address: data.shipping_address,
      fulfillments: data.fulfillments,
      line_items: data.line_items?.map(li => ({
        id: li.id,
        origin_location: li.origin_location,
        fulfillment: data.fulfillments?.find(f => f.line_items?.some(fli => fli.id === li.id))
      }))
    }, null, 2));

    const LAST_MILE_ONLY = 1;
    let is_fob = retailer.settings.delivery_type === LAST_MILE_ONLY;

    const client = new shopify.api.clients.Graphql({
      session: {
        shop: store_id,
        accessToken: retailer.settings.auth.access_token,
      },
    });

    let line_items = [];
    for (let line_item of data.line_items || []) {
      let origin_location = line_item.origin_location || {};

      const hasValidOrigin =
        origin_location &&
        origin_location.address1 &&
        origin_location.city &&
        origin_location.province_code &&
        origin_location.zip &&
        origin_location.name &&
        origin_location.phone;

      if (!hasValidOrigin) {
        console.warn(
          `createDeliverightOrder: origin_location is empty or incomplete for line_item ID ${line_item?.id || 'unknown'}`
        );

        let location = null;
        const fulfillment = data.fulfillments?.find((f) =>
          f.line_items?.some((li) => li.id === line_item?.id)
        );

        if (fulfillment && fulfillment.location_id) {
          console.log(
            `createDeliverightOrder: Fetching location for fulfillment ID ${fulfillment.id} with location_id ${fulfillment.location_id}`
          );

          try {
            const query = `
              query GetLocation($id: ID!) {
                location(id: $id) {
                  id
                  name
                  address {
                    address1
                    address2
                    city
                    provinceCode
                    zip
                    phone
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

            location = response.body.data?.location;
            if (location) {
              console.log(
                `createDeliverightOrder: Location found for location_id ${fulfillment.location_id}: ${location.name}`,
                JSON.stringify(location, null, 2)
              );
              origin_location = {
                address1: location.address.address1,
                address2: location.address.address2 || "",
                city: location.address.city,
                province_code: location.address.provinceCode,
                zip: location.address.zip,
                name: location.name,
                phone: location.address.phone,
              };
              // Validar que la ubicación tenga datos completos
              if (!origin_location.address1 || !origin_location.city || !origin_location.province_code || !origin_location.zip || !origin_location.phone) {
                console.warn(
                  `createDeliverightOrder: Location ID ${fulfillment.location_id} has incomplete data:`,
                  JSON.stringify(origin_location, null, 2)
                );
                location = null;
              }
            } else {
              console.warn(
                `createDeliverightOrder: No location found for location_id ${fulfillment.location_id}`
              );
            }
          } catch (error) {
            console.error(
              `createDeliverightOrder: Error fetching location for location_id ${fulfillment.location_id}`,
              error.message
            );
            console.error("Error details:", JSON.stringify(error.response?.body || error, null, 2));
          }
        } else {
          console.warn(
            `createDeliverightOrder: No fulfillment or location_id found for line_item ID ${line_item?.id || 'unknown'}`
          );
        }

        // Si no hay ubicación válida, intentar obtener la ubicación predeterminada
        if (!location) {
          console.log("createDeliverightOrder: Fetching default location from Shopify");
          try {
            const query = `
              query GetLocations {
                locations(first: 10) {
                  edges {
                    node {
                      id
                      name
                      address {
                        address1
                        address2
                        city
                        provinceCode
                        zip
                        phone
                      }
                    }
                  }
                }
              }
            `;
            const response = await client.query({ data: { query } });
            const locations = response.body.data?.locations?.edges?.map(edge => edge.node) || [];
            const defaultLocation = locations.find(loc => loc.address?.address1 && loc.address?.city && loc.address?.zip && loc.address?.phone) || locations[0];
            if (defaultLocation) {
              console.log(
                `createDeliverightOrder: Using default location: ${defaultLocation.name}`,
                JSON.stringify(defaultLocation, null, 2)
              );
              origin_location = {
                address1: defaultLocation.address.address1 || "",
                address2: defaultLocation.address.address2 || "",
                city: defaultLocation.address.city || " ",
                province_code: defaultLocation.address.provinceCode || "",
                zip: defaultLocation.address.zip || "",
                name: defaultLocation.name || "",
                phone: defaultLocation.address.phone || "",
              };
            } else {
              console.warn("createDeliverightOrder: No valid locations found in Shopify");

            }
          } catch (error) {
            console.error("createDeliverightOrder: Error fetching default location", error.message);

          }
        }
      }

      let drl_item = {
        sku: line_item.sku || line_item.product_id?.toString(),
        name: line_item.title,
        quantity: line_item.quantity,
        retail_value: line_item.price,
        weight: line_item.grams ? Number((line_item.grams / 453.592).toFixed(2)) :0,
        vendor: line_item.vendor,
        freight_info: {
          is_fob,
          vendor_info: {
            first_name: "",
            last_name: "",
            address: {
              address1: origin_location.address1 ,
              address2: origin_location.address2 || "",
              city: origin_location.city ,
              state: origin_location.province_code ,
              zip: origin_location.zip ,
            },
            company: origin_location.name ,
            phone: origin_location.phone || "",
            email: "",
            receiving_hours: "",
          },
        },
      };
      line_items.push(drl_item);
    }

    console.log("LINE ITEMS: ", JSON.stringify(line_items, null, 2));

    const customerAddress = data.shipping_address || data.customer_address || {};
    const customer = {
      first_name: data.customer?.first_name,
      last_name: data.customer?.last_name,
      address: {
        address1: customerAddress.address1,
        address2: customerAddress.address2 || "",
        city: customerAddress.city,
        state: customerAddress.province_code,
        zip: customerAddress.zip,
      },
      company: "",
      phone1: {
        number: customerAddress.phone || data.customer?.phone || "",
      },
      email: data.customer?.email || "",
    };

    if (!customerAddress.phone && !data.customer?.phone) {
      console.warn("createDeliverightOrder: Customer phone is missing in customer_address and customer");
    }

    let order = {
      order: {
        source: "shopify",
        sales_order_number: data.name || "",
        ref_order_number: data.id?.toString() || "",
        payload: {
          shopify_order_number: data.order_number || null,
          shopify_raw: {
            id: data.id || null,
            name: data.name || "",
            line_items: (data.line_items || []).map((li) => ({
              id: li.id ,
              title: li.title ,
              quantity: li.quantity ,
              price: li.price ,
              grams: li.grams,
              vendor: li.vendor ,
              product_id: li.product_id ,
            })),
          },
        },
        customer,
        line_items,
        retailer: {
          identifier: store_id,
        },
        service_level: data.shipping_lines?.[0]?.code || "STANDARD",
        send_retailer_confirmation: false,
        note: "",
        label_recipients: [],
      },
      options: {
        send_retailer_confirmation: true,
        send_labels_to_manufacturer: true,
      },
    };

    console.log("createDeliverightOrder: Validating order data");

    if (order.order.customer.phone1.number === "415-555-1234") {
      console.warn("createDeliverightOrder: Using fallback for customer.phone1.number");
    } else {
      console.log(
        "createDeliverightOrder: customer.phone1.number",
        order.order.customer.phone1.number
      );
    }

    const addressFields = ["address1", "city", "state", "zip"];
    const missingAddressFields = addressFields.filter(
      (field) => !order.order.customer.address[field]
    );
    if (missingAddressFields.length > 0) {
      console.warn(
        "createDeliverightOrder: customer.address is missing fields:",
        missingAddressFields
      );
    }
    console.log(
      "createDeliverightOrder: customer.address",
      JSON.stringify(order.order.customer.address, null, 2)
    );

    if (!order.order.line_items || order.order.line_items.length === 0) {
      console.warn("createDeliverightOrder: line_items is empty");
    } else {
      order.order.line_items.forEach((item, index) => {
        const hasValidVendorAddress =
          item.freight_info?.vendor_info?.address?.address1 &&
          item.freight_info?.vendor_info?.address?.city &&
          item.freight_info?.vendor_info?.address?.state &&
          item.freight_info?.vendor_info?.address?.zip &&
          item.freight_info?.vendor_info?.phone;
        if (!hasValidVendorAddress || item.freight_info.vendor_info.address.address1 === "123 Main St") {
          console.warn(
            `createDeliverightOrder: line_items[${index}].freight_info.vendor_info.address is incomplete or using fallback`
          );
        }
        console.log(
          `createDeliverightOrder: line_items[${index}].freight_info.vendor_info`,
          JSON.stringify(item.freight_info.vendor_info, null, 2)
        );
      });
    }

    if (!order.order.payload.shopify_raw || Object.keys(order.order.payload.shopify_raw).length === 0) {
      console.warn("createDeliverightOrder: payload.shopify_raw is empty");

    } else {
      const shopifyRawFields = ["id", "name", "line_items"];
      const missingShopifyRawFields = shopifyRawFields.filter(
        (field) => order.order.payload.shopify_raw[field] === undefined
      );
      if (missingShopifyRawFields.length > 0) {
        console.warn(
          "createDeliverightOrder: payload.shopify_raw is missing fields:",
          missingShopifyRawFields
        );
      }
      console.log(
        "createDeliverightOrder: payload.shopify_raw",
        JSON.stringify(
          {
            id: order.order.payload.shopify_raw.id,
            name: order.order.payload.shopify_raw.name,
            line_items: order.order.payload.shopify_raw.line_items?.map((li) => ({
              id: li.id,
              title: li.title,
              quantity: li.quantity,
              price: li.price,
              grams: li.grams,
              vendor: li.vendor,
              product_id: li.product_id,
            })),
          },
          null,
          2
        )
      );
    }

    console.log("createDeliverightOrder: Order prepared for store ID", store_id);
    return order;
  }

  getPriceByPaymentType(price, settings) {
    console.log("getPriceByPaymentType: Adjusting price based on payment type", settings.payment.type);
    const type = settings.payment.type;
    switch (type) {
      case config.paymentStrategies.PAID_BY_CUSTOMER:
        return price;
      case config.paymentStrategies.PAID_BY_SHIPPER:
        return 0;
      case config.paymentStrategies.SPLIT:
        return (price / 100) * (100 - settings.payment.split_ratio);
      case config.paymentStrategies.FIXED:
        let fixedInCents = settings.payment.fixed * 100;
        return price - fixedInCents;
      case config.paymentStrategies.ROUND_NEAREST_NUMBER:
        let diff = 100000;
        let p;
        settings.payment.round_nearest.map((num) => {
          if (num > price && num - price < diff) {
            p = num;
            diff = num - price;
          }
        });
        if (!p) p = price;
        return p;
    }
  }

  sumAccessorials(shippingResult) {
    console.log("sumAccessorials: Summing shipping costs and fees");
    let price = shippingResult.cost + _.sumBy(_.toArray(shippingResult.accessorial_fees), "cost");
    console.log("sumAccessorials: Total price calculated", price);
    return price;
  }

  formatPrice(price, settings) {
    console.log("formatPrice: Formatting price with limits");
    if (settings.payment.limit.active && settings.payment.limit.amount)
      price = _.min([price, settings.payment.limit.amount]);
    const formattedPrice = price * 100;
    console.log("formatPrice: Formatted price in cents", formattedPrice);
    return formattedPrice;
  }
}

const { DELIVERIGHT_ID, DELIVERIGHT_SECRET } = process.env;
console.log("DeliverightApi: Exporting instance with credentials", DELIVERIGHT_ID);
export default new DeliverightApi(DELIVERIGHT_ID, DELIVERIGHT_SECRET);
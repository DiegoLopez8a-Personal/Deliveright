import dotenv from "dotenv";

dotenv.config({ path: "../.env" });
console.log("Config: Loading environment variables from .env"); // Logs environment variable loading

let config = {};
const { HOST, DELIVERIGHT_HOST } = process.env;
console.log("Config: Setting host variables", { HOST, DELIVERIGHT_HOST }); // Logs host variable assignment

config.deliverightApi = DELIVERIGHT_HOST;
config.host = HOST;
console.log("Config: Initialized API and host settings"); // Logs API and host config initialization

// Shopify app scopes
config.shopifyAppScopes = [
  "read_products",
  "write_shipping",
  "read_shipping",
  "read_fulfillments",
  "write_fulfillments",
  "read_orders",
  "write_orders",
];
console.log("Config: Defined Shopify app scopes", config.shopifyAppScopes.length, "scopes"); // Logs Shopify scopes setup

// Shopify carrier service settings
config.carrierService = {
  active: true,
  name: "Deliveright - White Glove Delivery",
  callback_url: `https://deliveright-598053309572.us-central1.run.app/carrier`,
  service_discovery: true,
};
console.log("Config: Initialized carrier service settings", config.carrierService.name); // Logs carrier service setup

config.serviceLevels = {
  prcl: {
    service_name: "Parcel",
    description: "Parcel delivery service. No appointment or signature is required.",
    service_code: "prcl",
    currency: "USD",
  },
  willcall: {
    service_name: "Will Call",
    description: "Customer picks up from the local distribution warehouse.",
    service_code: "willcall",
    currency: "USD",
  },
  unattended: {
    service_name: "Unattended",
    description: "Unattended delivery to the customer's front door in the original packaging. No appointment scheduling or product setup.",
    service_code: "unattended",
    currency: "USD",
  },
  rocpa: {
    service_name: "Room of choice with Assembly",
    description: "Delivery of the products in the original packaging and assembly at the customer's home, including debris removal.",
    service_code: "rocpa",
    currency: "USD",
  },
  wg: {
    service_name: "White Glove Service",
    description: "White-Glove delivery and assembly at the customer home, including debris removal (assembly does not include wall mounting, electric hookups or burner element to the internal line, propane or gas lines)",
    service_code: "wg",
    currency: "USD",
  },
  thr: {
    service_name: "Threshold Service",
    description: "Delivering to the threshold of the customer's home (garage, front entrance etc.) or to the first dry area. Customer is responsible for unpacking and assembling",
    service_code: "thr",
    currency: "USD",
  },
  blnk: {
    service_name: "Blanket Wrap",
    description: "This service is the same as White Glove, but for items that are not packaged or crated. We will blanket wrap the item before shipping it to our terminal. We open the order in our terminal, inspect it, and apply minor touchups if needed. We then blanket wrap and shrink-wrap the order and load it onto one of our home delivery trucks. We call the customer 30 minutes before our arrival. Upon arrival, we perform a walk-through to assess where the product(s) needs to be placed. We then bring the order to the room of choice and unpack the product(s). We will set up the order according to the customer's wishes, including 30 minutes of light assembly (excluding KDs). We always clean the area upon leaving so the customer can enjoy their new purchase right away!",
    service_code: "blnk",
    currency: "USD",
  },
  rocp: {
    service_name: "Room of Choice +",
    description: "We call the customer 30 minutes before our arrival. Upon arrival, we perform a walk-through to assess where the product(s) needs to be placed. We then bring the order to the room of choice and unpack the product(s). We always clean the area upon leaving so the customer can enjoy their new purchase right away! *The customer is responsible for assembling the order.",
    service_code: "rocp",
    currency: "USD",
  },
  roc: {
    service_name: "Room of Choice",
    description: "We call the customer 30 minutes before our arrival. Upon arrival, we perform a walk-through to assess where the product(s) needs to be placed. We then bring the order to the room of choice so when we leave the residence, your customer can unpack the product(s) and finish any setup or assembly (if needed). *The customer is responsible for unpacking and assembling the order.",
    service_code: "roc",
    currency: "USD",
  },
  b2b: {
    service_name: "Business to Business",
    description: "Delivering to the threshold of the customer's home (garage, front entrance etc.) or to the first dry area. Customer is responsible for unpacking and assembling",
    service_code: "b2b",
    currency: "USD",
  },
  curb: {
    service_name: "Curbside",
    description: "We call the customer 30 minutes before our arrival. We will leave the order outside the customer's home or apartment building. It is the customer's responsibility to bring the order inside the home. *The customer is responsible for unpacking and assembling the order",
    service_code: "curb",
    currency: "USD",
  },
  pick_consolidate: {
    service_name: "Pick & Consolidate",
    description: "Pickup from vendor for local consolidation",
    service_code: "pick_consolidate",
    currency: "USD",
  },
};
console.log("Config: Defined service levels", Object.keys(config.serviceLevels).length, "levels"); // Logs service levels setup

config.paymentStrategies = {
  PAID_BY_CUSTOMER: 0,
  PAID_BY_SHIPPER: 1,
  SPLIT: 2,
  FIXED: 3,
  ROUND_NEAREST_NUMBER: 4,
};
console.log("Config: Defined payment strategies", Object.keys(config.paymentStrategies).length, "strategies"); // Logs payment strategies setup

export default config;
console.log("Config: Exporting configuration object"); // Logs export of config object
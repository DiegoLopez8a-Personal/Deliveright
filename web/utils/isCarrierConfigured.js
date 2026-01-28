import config from "../config.js"
import shopify from "../shopify.js";

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
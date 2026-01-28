import config from "../config.js"
import shopify from "../shopify.js";

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
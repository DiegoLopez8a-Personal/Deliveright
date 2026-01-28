import deliveright from "../classes/deliveright.js"
import createCarrier from "./createCarrier.js"

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
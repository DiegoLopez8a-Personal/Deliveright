// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import GDPRWebhookHandlers from "./webhook_handlers/gdpr.js";
import OrderWebhookHandlers from "./webhook_handlers/order.js";

import deliveright from "./classes/deliveright.js";
import onInstallApp from "./utils/onInstallApp.js";
import createCarrier from "./utils/createCarrier.js";
import config from "./config.js";
import * as util from "util";
import isCarrierConfigured from "./utils/isCarrierConfigured.js";
import filterDeliverightProducts from "./utils/filterDeliverightProducts.js";
import dotenv from "dotenv";

dotenv.config({ path: "./../.env" });

const PORT = process.env.BACKEND_PORT || process.env.PORT || "3000";

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

const onInstallAppMiddleware = async (_req, res, next) => {
  const session = res.locals.shopify.session;
  console.log("onInstallAppMiddleware: Starting app installation for shop", session.shop); // Logs start of app install process
  try {
    await onInstallApp(session);
    console.log("onInstallAppMiddleware: App installed successfully for shop", session.shop); // Logs successful app installation
    next();
  } catch (e) {
    console.error("onInstallAppMiddleware: Error during app installation", e); // Logs error in app installation
    res.status(400).send({ error: { message: "An error has occurred, please try again." } });
  }
};

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  onInstallAppMiddleware,
  async (req, res) => {
    const session = res.locals.shopify.session;
    const host = req.query.host;
    const shop = session?.shop;

    console.log("Auth Callback: Processing Shopify auth callback for shop", shop); // Logs start of auth callback
    if (!host || !shop) {
      console.error("Auth Callback: Missing host or shop in redirect"); // Logs missing parameters
      return res.status(400).send("Missing host or shop in redirect.");
    }

    console.log("Auth Callback: Redirecting to frontend for shop", shop); // Logs successful redirect
    return res.redirect(`/?shop=${shop}&host=${host}`);
  }
);

app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({
    webhookHandlers: { ...GDPRWebhookHandlers, ...OrderWebhookHandlers },
  })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());

app.get("/api/check", async (req, res) => {
  console.log("API Check: Checking Shopify app installation status"); // Logs start of installation check
  try {
    const installed = shopify.ensureInstalledOnShop();
    console.log("API Check: Installation status checked", installed); // Logs installation status
    res.status(200).json({ installed });
  } catch (err) {
    console.error("API Check: Error checking installation", err); // Logs error in checking installation
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.post("/api/store", async (_req, res) => {
  const session = res.locals.shopify.session;
  const shop_data = { ..._req.body, store_id: session.shop };
  console.log("API Store POST: Creating store for shop", session.shop); // Logs start of store creation
  try {
    let createRes = await deliveright.createStore(shop_data);
    if (createRes) {
      console.log("API Store POST: Store created, running onInstallApp for shop", session.shop); // Logs successful store creation
      await onInstallApp(session);
      res.status(200).send(createRes);
    }
  } catch (err) {
    console.error("API Store POST: Error creating store", err); // Logs error in store creation
    try {
      res.status(parseInt(err.status)).send(err);
    } catch {
      res.status(400).send({ error: { message: "An error has occurred, please try again." } });
    }
  }
});

app.get("/api/store", async (_req, res) => {
  let status = 200;
  let response = {};
  let session = res.locals.shopify.session;
  const { shop } = session;
  console.log("API Store GET: Fetching store info for shop", shop); // Logs start of store info fetch
  try {
    let result = await deliveright.getStore(shop);
    console.log("API Store GET: Store info retrieved for shop", shop); // Logs successful store info retrieval
    if (result) {
      let carrier = await isCarrierConfigured(session);
      console.log("API Store GET: Carrier configuration checked", carrier); // Logs carrier configuration check
      result.carrier = !!carrier;
      response = result;
    } else {
      console.log("API Store GET: Store not found in Grasshopper"); // Logs store not found
      status = 400;
      response.error = "Retailer not found in Grasshopper";
    }
  } catch (err) {
    console.error("API Store GET: Error fetching store info", err); // Logs error in fetching store info
    if (err.response) {
      status = err.response.status;
      response.error = JSON.stringify(err.response.statusText);
    } else {
      response.error = JSON.stringify(err);
      status = 400;
    }
  }
  console.log("API Store GET: Responding with status", status); // Logs final response
  res.status(status).send(response);
});

app.post("/carrier", async (_req, res) => {
  try {
    let rates = [];
    const IDENTIFIER = _req.headers["x-shopify-shop-domain"];
    console.log("Carrier POST: Fetching retailer for shop", IDENTIFIER); // Logs start of retailer fetch
    const retailer = await deliveright.getStore(IDENTIFIER);
    let session = {
      shop: IDENTIFIER,
      accessToken: retailer.settings.auth.access_token,
    };

    try {
      const offlineId = shopify.api.session.getOfflineId(IDENTIFIER);
      const storedSession = await shopify.config.sessionStorage.loadSession(offlineId);
      if (storedSession?.accessToken) {
        console.log("Carrier POST: Using offline token for shop", IDENTIFIER);
        session.accessToken = storedSession.accessToken;

        if (retailer.settings.auth.access_token !== storedSession.accessToken) {
          console.log("Carrier POST: Updating Deliveright token for shop", IDENTIFIER);
          await deliveright.updateStore(IDENTIFIER, { auth: { access_token: storedSession.accessToken } });
        }
      } else {
        console.warn("Carrier POST: No offline session found for shop", IDENTIFIER);
      }
    } catch (error) {
      console.error("Carrier POST: Error loading offline session", error);
    }
    const LAST_MILE_ONLY = 1;
    if (retailer.settings.delivery_type == LAST_MILE_ONLY)
      _req.body.rate.origin.postal_code = "fob";

    console.log("Carrier POST: Filtering products for shop", IDENTIFIER); // Logs product filtering
    let filtered_items = await filterDeliverightProducts(shopify, session, _req.body.rate.items);
    let filtered_request = { rate: { ..._req.body.rate, items: filtered_items } };
    if (filtered_request.rate.items.length > 0) {
      let all_tags = filtered_request.rate.items.flatMap((i) => i.tags);
      const service_levels = [...new Set(all_tags)];

      for (let s of service_levels) {
        console.log("Carrier POST: Processing shipping rate for service level", s); // Logs shipping rate calculation
        if (!config.serviceLevels[s]) {
          console.log("Carrier POST: Service level not supported", s); // Logs unsupported service level
          continue;
        }

        let totalPrice = null;
        try {
          totalPrice = await deliveright.calculateShippingRate(IDENTIFIER, filtered_request, s, retailer);
          console.log("Carrier POST: Shipping rate calculated", totalPrice); // Logs successful rate calculation
        } catch (err) {
          console.error("Carrier POST: Error calculating shipping rate", err); // Logs error in rate calculation
        }
        config.serviceLevels[s].total_price = totalPrice;
        rates.push(config.serviceLevels[s]);
      }
    }
    console.log("Carrier POST: Responding with shipping rates"); // Logs final response
    res.status(200).send({ rates });
  } catch (err) {
    console.error("Carrier POST: Error processing request", err); // Logs general error
    res.status(400).send();
  }
});

app.get("/health", async (_req, res) => {
  console.log("Health Check: Responding to health check"); // Logs health check request
  res.status(200).send("ok");
});

app.get("/api/carrier/activate", async (_req, res) => {
  try {
    console.log("API Carrier Activate: Activating carrier for shop"); // Logs start of carrier activation
    const session = res.locals.shopify.session;
    await createCarrier(session);
    console.log("API Carrier Activate: Carrier activated successfully"); // Logs successful carrier activation
    res.status(200).send();
  } catch (error) {
    console.error("API Carrier Activate: Error activating carrier", error); // Logs error in carrier activation
    res.status(400).send(error);
  }
});

app.use(shopify.cspHeaders());

app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  console.log("Fallback Route: Serving frontend index.html"); // Logs serving of frontend
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

app.listen(PORT);
console.log("Server: Starting on port", PORT); // Logs server startup
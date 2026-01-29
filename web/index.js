/**
 * @fileoverview Shopify App Backend Server - Deliveright Integration
 * 
 * This Express.js application serves as the backend for a Shopify app that integrates
 * with Deliveright's delivery service API. It handles Shopify authentication, webhook
 * processing, carrier service rate calculations, and store management operations.
 * 
 * Main Features:
 * - Shopify OAuth authentication and session management
 * - GDPR and order webhook handling
 * - Carrier service integration for custom shipping rates
 * - Store creation and configuration via Deliveright API
 * - Offline access token management
 * - Health monitoring endpoint
 * 
 * Architecture:
 * - Framework: Express.js
 * - Authentication: Shopify OAuth
 * - Session Storage: Configured via Shopify library
 * - External API: Deliveright (Grasshopper)
 * 
 * @requires express
 * @requires path
 * @requires fs
 * @requires serve-static
 * @requires dotenv
 * 
 * @author Deliveright Development Team
 * @version 1.0.0
 */

// @ts-check

// ============================================================================
// IMPORTS - External Dependencies
// ============================================================================

import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

// ============================================================================
// IMPORTS - Shopify Integration
// ============================================================================

import shopify from "./shopify.js";
import GDPRWebhookHandlers from "./webhook_handlers/gdpr.js";
import OrderWebhookHandlers from "./webhook_handlers/order.js";

// ============================================================================
// IMPORTS - Internal Modules
// ============================================================================

import deliveright from "./classes/deliveright.js";
import onInstallApp from "./utils/onInstallApp.js";
import createCarrier from "./utils/createCarrier.js";
import config from "./config.js";
import * as util from "util";
import isCarrierConfigured from "./utils/isCarrierConfigured.js";
import filterDeliverightProducts from "./utils/filterDeliverightProducts.js";
import dotenv from "dotenv";

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

/**
 * Load environment variables from .env file located in parent directory
 * This configuration must be loaded before accessing process.env variables
 */
dotenv.config({ path: "./../.env" });

// ============================================================================
// SERVER CONFIGURATION CONSTANTS
// ============================================================================

/**
 * Server port configuration
 * Priority order: BACKEND_PORT > PORT > default 3000
 * @constant {string}
 */
const PORT = process.env.BACKEND_PORT || process.env.PORT || "3000";

/**
 * Static file path for frontend assets
 * In production: serves from built dist folder
 * In development: serves from source frontend folder
 * @constant {string}
 */
const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

// ============================================================================
// EXPRESS APPLICATION INITIALIZATION
// ============================================================================

/**
 * Express application instance
 * Configured with Shopify middleware, authentication, and API routes
 * @constant {express.Application}
 */
const app = express();

// ============================================================================
// MIDDLEWARE - App Installation Handler
// ============================================================================

/**
 * Middleware to handle app installation and initial setup
 * 
 * This middleware executes during the OAuth callback flow after a merchant
 * installs the app. It performs initial configuration tasks such as:
 * - Creating carrier service
 * - Setting up webhooks
 * - Initializing app configurations
 * 
 * @async
 * @function onInstallAppMiddleware
 * @param {express.Request} _req - Express request object (unused)
 * @param {express.Response} res - Express response object with Shopify session
 * @param {express.NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 * 
 * @example
 * // Used in OAuth callback chain
 * app.get('/auth/callback', shopify.auth.callback(), onInstallAppMiddleware, ...);
 */
const onInstallAppMiddleware = async (_req, res, next) => {
  // Extract Shopify session from response locals (injected by Shopify middleware)
  const session = res.locals.shopify.session;
  
  // Log the start of the installation process for monitoring and debugging
  console.log("onInstallAppMiddleware: Starting app installation for shop", session.shop);
  
  try {
    // Execute app installation logic (carrier setup, webhooks, etc.)
    await onInstallApp(session);
    
    // Log successful installation
    console.log("onInstallAppMiddleware: App installed successfully for shop", session.shop);
    
    // Continue to next middleware in the chain
    next();
  } catch (e) {
    // Log installation error with full error object for debugging
    console.error("onInstallAppMiddleware: Error during app installation", e);
    
    // Return user-friendly error message to prevent exposure of internal details
    res.status(400).send({ error: { message: "An error has occurred, please try again." } });
  }
};

// ============================================================================
// ROUTES - Shopify Authentication
// ============================================================================

/**
 * OAuth flow initialization endpoint
 * Redirects merchant to Shopify's OAuth consent screen
 * 
 * Query Parameters:
 * @param {string} shop - The shop domain (e.g., 'example.myshopify.com')
 * 
 * @route GET /api/auth
 */
app.get(shopify.config.auth.path, shopify.auth.begin());

/**
 * OAuth callback endpoint
 * Handles the redirect from Shopify after merchant grants permissions
 * 
 * Flow:
 * 1. Shopify redirects here with auth code
 * 2. Shopify middleware exchanges code for access token
 * 3. onInstallAppMiddleware runs installation tasks
 * 4. Merchant is redirected to app frontend
 * 
 * @route GET /api/auth/callback
 * @param {express.Request} req - Request with query params (host, shop)
 * @param {express.Response} res - Response with Shopify session in locals
 * @returns {Promise<express.Response>} Redirect to frontend or error
 */
app.get(
  shopify.config.auth.callbackPath,
  // Middleware 1: Complete OAuth flow and create session
  shopify.auth.callback(),
  // Middleware 2: Run installation tasks
  onInstallAppMiddleware,
  // Final handler: Redirect to frontend
  async (req, res) => {
    // Extract session created by Shopify middleware
    const session = res.locals.shopify.session;
    
    // Extract required query parameters for frontend redirect
    const host = req.query.host; // Shopify app host parameter
    const shop = session?.shop;  // Shop domain from session
    
    // Log the start of callback processing
    console.log("Auth Callback: Processing Shopify auth callback for shop", shop);
    
    // Validate required parameters exist
    if (!host || !shop) {
      console.error("Auth Callback: Missing host or shop in redirect");
      return res.status(400).send("Missing host or shop in redirect.");
    }
    
    // Log successful authentication before redirect
    console.log("Auth Callback: Redirecting to frontend for shop", shop);
    
    // Redirect to frontend with shop and host parameters
    // Frontend will use these to initialize the Shopify App Bridge
    return res.redirect(`/?shop=${shop}&host=${host}`);
  }
);

// ============================================================================
// ROUTES - Webhook Processing
// ============================================================================

/**
 * Webhook endpoint for Shopify events
 * Processes GDPR and order-related webhooks
 * 
 * Security:
 * - Shopify HMAC signature verification handled by middleware
 * - Only processes webhooks from registered topics
 * 
 * Supported Webhooks:
 * - customers/data_request (GDPR)
 * - customers/redact (GDPR)
 * - shop/redact (GDPR)
 * - orders/create (Order processing)
 * - orders/updated (Order updates)
 * 
 * @route POST /api/webhooks
 */
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({
    webhookHandlers: { ...GDPRWebhookHandlers, ...OrderWebhookHandlers },
  })
);

// ============================================================================
// MIDDLEWARE - Authentication for API Routes
// ============================================================================

/**
 * Apply Shopify session authentication to all /api/* routes
 * 
 * This middleware ensures that:
 * - Request has valid Shopify session
 * - Session has not expired
 * - Shop is still installed
 * 
 * Note: Routes outside /api path need proxy rules in vite.config.js
 */
app.use("/api/*", shopify.validateAuthenticatedSession());

// ============================================================================
// MIDDLEWARE - JSON Body Parser
// ============================================================================

/**
 * Enable JSON body parsing for all routes
 * Required for POST/PUT requests with JSON payloads
 */
app.use(express.json());

// ============================================================================
// ROUTES - API Endpoints
// ============================================================================

/**
 * Installation status check endpoint
 * Verifies if the app is properly installed on the shop
 * 
 * @route GET /api/check
 * @returns {Object} Response object
 * @returns {boolean} response.installed - Installation status
 * 
 * @example
 * // Success Response
 * {
 *   "installed": true
 * }
 * 
 * @example
 * // Error Response
 * {
 *   "error": "Something went wrong"
 * }
 */
app.get("/api/check", async (req, res) => {
  console.log("API Check: Checking Shopify app installation status");
  
  try {
    // Verify app installation status via Shopify library
    const installed = shopify.ensureInstalledOnShop();
    
    console.log("API Check: Installation status checked", installed);
    
    // Return installation status
    res.status(200).json({ installed });
  } catch (err) {
    // Log error for debugging
    console.error("API Check: Error checking installation", err);
    
    // Return generic error message
    res.status(500).json({ error: "Something went wrong" });
  }
});

/**
 * Create store endpoint
 * Creates a new store record in Deliveright's system
 * 
 * This endpoint is called during initial app setup to register the Shopify
 * store with Deliveright's delivery service.
 * 
 * @route POST /api/store
 * @param {Object} req.body - Store configuration data
 * @param {string} req.body.store_name - Name of the store
 * @param {string} req.body.email - Store contact email
 * @param {string} req.body.phone - Store contact phone
 * @param {Object} req.body.address - Store address details
 * @param {number} req.body.delivery_type - Delivery type (1=last mile only)
 * @returns {Object} Created store data from Deliveright API
 * 
 * @example
 * // Request Body
 * {
 *   "store_name": "Example Store",
 *   "email": "store@example.com",
 *   "phone": "+1234567890",
 *   "address": {...},
 *   "delivery_type": 1
 * }
 */
app.post("/api/store", async (_req, res) => {
  // Extract Shopify session from response locals
  const session = res.locals.shopify.session;
  
  // Combine request body with store_id from session
  const shop_data = { ..._req.body, store_id: session.shop };
  
  console.log("API Store POST: Creating store for shop", session.shop);
  
  try {
    // Create store in Deliveright system
    let createRes = await deliveright.createStore(shop_data);
    
    // If store creation successful, run installation tasks
    if (createRes) {
      console.log("API Store POST: Store created, running onInstallApp for shop", session.shop);
      
      // Execute installation logic (carrier setup, webhooks, etc.)
      await onInstallApp(session);
      
      // Return created store data
      res.status(200).send(createRes);
    }
  } catch (err) {
    // Log error details
    console.error("API Store POST: Error creating store", err);
    
    try {
      // Attempt to extract status code from error
      res.status(parseInt(err.status)).send(err);
    } catch {
      // Fallback to generic error if status code extraction fails
      res.status(400).send({ error: { message: "An error has occurred, please try again." } });
    }
  }
});

/**
 * Get store information endpoint
 * Retrieves store configuration from Deliveright and carrier status
 * 
 * This endpoint fetches the store's Deliveright configuration and checks
 * if the carrier service is properly configured in Shopify.
 * 
 * @route GET /api/store
 * @returns {Object} Store data with carrier status
 * @returns {string} response.store_id - Shopify shop domain
 * @returns {string} response.store_name - Store name
 * @returns {Object} response.settings - Store settings from Deliveright
 * @returns {boolean} response.carrier - Carrier service configuration status
 * 
 * @example
 * // Success Response
 * {
 *   "store_id": "example.myshopify.com",
 *   "store_name": "Example Store",
 *   "settings": {...},
 *   "carrier": true
 * }
 * 
 * @example
 * // Error Response (Store not found)
 * {
 *   "error": "Retailer not found in Grasshopper"
 * }
 */
app.get("/api/store", async (_req, res) => {
  // Initialize response variables
  let status = 200;
  let response = {};
  
  // Extract session and shop domain
  let session = res.locals.shopify.session;
  const { shop } = session;
  
  console.log("API Store GET: Fetching store info for shop", shop);
  
  try {
    // Fetch store data from Deliveright API
    let result = await deliveright.getStore(shop);
    
    console.log("API Store GET: Store info retrieved for shop", shop);
    
    if (result) {
      // Check if carrier service is configured in Shopify
      let carrier = await isCarrierConfigured(session);
      
      console.log("API Store GET: Carrier configuration checked", carrier);
      
      // Add carrier status to result
      result.carrier = !!carrier; // Convert to boolean
      response = result;
    } else {
      // Store not found in Deliveright system
      console.log("API Store GET: Store not found in Grasshopper");
      status = 400;
      response.error = "Retailer not found in Grasshopper";
    }
  } catch (err) {
    // Handle errors from Deliveright API
    console.error("API Store GET: Error fetching store info", err);
    
    if (err.response) {
      // Extract status and message from API error response
      status = err.response.status;
      response.error = JSON.stringify(err.response.statusText);
    } else {
      // Generic error handling
      response.error = JSON.stringify(err);
      status = 400;
    }
  }
  
  console.log("API Store GET: Responding with status", status);
  res.status(status).send(response);
});

// ============================================================================
// ROUTES - Carrier Service (Shipping Rate Calculation)
// ============================================================================

/**
 * Carrier service callback endpoint
 * Shopify calls this endpoint to get shipping rates at checkout
 * 
 * This is a critical endpoint that handles real-time shipping rate calculations
 * for customer orders. It's called by Shopify's carrier service API during checkout.
 * 
 * Flow:
 * 1. Receive rate request from Shopify
 * 2. Authenticate using store's access token
 * 3. Filter items eligible for Deliveright shipping
 * 4. Calculate rates for each service level
 * 5. Return available shipping options to Shopify
 * 
 * @route POST /carrier
 * @param {Object} req.body.rate - Rate request from Shopify
 * @param {Object} req.body.rate.origin - Origin address (warehouse)
 * @param {Object} req.body.rate.destination - Customer delivery address
 * @param {Array<Object>} req.body.rate.items - Cart items
 * @param {string} req.body.rate.currency - Currency code (e.g., 'USD')
 * @param {string} req.headers['x-shopify-shop-domain'] - Shop domain
 * 
 * @returns {Object} Shipping rates response
 * @returns {Array<Object>} response.rates - Available shipping options
 * 
 * @example
 * // Request from Shopify
 * {
 *   "rate": {
 *     "origin": {
 *       "country": "US",
 *       "postal_code": "90210",
 *       "province": "CA",
 *       "city": "Beverly Hills",
 *       "address1": "123 Main St"
 *     },
 *     "destination": {
 *       "country": "US",
 *       "postal_code": "10001",
 *       "province": "NY",
 *       "city": "New York"
 *     },
 *     "items": [
 *       {
 *         "name": "Product Name",
 *         "sku": "SKU123",
 *         "quantity": 2,
 *         "grams": 1000,
 *         "price": 2999,
 *         "vendor": "Vendor Name",
 *         "requires_shipping": true,
 *         "taxable": true,
 *         "product_id": 123456789,
 *         "variant_id": 987654321,
 *         "tags": "deliveright-standard"
 *       }
 *     ],
 *     "currency": "USD"
 *   }
 * }
 * 
 * @example
 * // Response to Shopify
 * {
 *   "rates": [
 *     {
 *       "service_name": "Deliveright Standard Delivery",
 *       "service_code": "deliveright-standard",
 *       "total_price": "995",
 *       "description": "Standard delivery service",
 *       "currency": "USD"
 *     }
 *   ]
 * }
 */
app.post("/carrier", async (_req, res) => {
  try {
    // Initialize empty rates array
    let rates = [];
    
    // Extract shop domain from Shopify's custom header
    const IDENTIFIER = _req.headers["x-shopify-shop-domain"];
    
    console.log("Carrier POST: Fetching retailer for shop", IDENTIFIER);
    
    // Fetch store configuration from Deliveright
    const retailer = await deliveright.getStore(IDENTIFIER);
    
    // Initialize session with basic shop info and stored access token
    let session = {
      shop: IDENTIFIER,
      accessToken: retailer.settings.auth.access_token,
    };

    try {
      // Attempt to load offline session for most current access token
      // Offline sessions persist beyond user browser sessions
      const offlineId = shopify.api.session.getOfflineId(IDENTIFIER);
      const storedSession = await shopify.config.sessionStorage.loadSession(offlineId);
      
      if (storedSession?.accessToken) {
        console.log("Carrier POST: Using offline token for shop", IDENTIFIER);
        
        // Use the most recent access token from session storage
        session.accessToken = storedSession.accessToken;

        // Sync token with Deliveright if it has changed
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
    
    // Handle last-mile only delivery type
    // For last-mile, use 'fob' (free on board) as origin postal code
    const LAST_MILE_ONLY = 1;
    if (retailer.settings.delivery_type == LAST_MILE_ONLY)
      _req.body.rate.origin.postal_code = "fob";

    console.log("Carrier POST: Filtering products for shop", IDENTIFIER);
    
    // Filter items to only include products configured for Deliveright
    // This checks product tags and metafields to determine eligibility
    let filtered_items = await filterDeliverightProducts(shopify, session, _req.body.rate.items);
    
    // Create modified rate request with filtered items
    let filtered_request = { rate: { ..._req.body.rate, items: filtered_items } };
    
    // Only calculate rates if there are eligible items
    if (filtered_request.rate.items.length > 0) {
      // Extract all tags from all items
      let all_tags = filtered_request.rate.items.flatMap((i) => i.tags);
      
      // Get unique service levels from item tags
      // Service level tags format: 'deliveright-standard', 'deliveright-express', etc.
      const service_levels = [...new Set(all_tags)];

      // Calculate rates for each service level
      for (let s of service_levels) {
        console.log("Carrier POST: Processing shipping rate for service level", s);
        
        // Check if service level is configured
        if (!config.serviceLevels[s]) {
          console.log("Carrier POST: Service level not supported", s);
          continue; // Skip unsupported service levels
        }

        // Initialize price variable
        let totalPrice = null;
        
        try {
          // Call Deliveright API to calculate shipping rate
          totalPrice = await deliveright.calculateShippingRate(IDENTIFIER, filtered_request, s, retailer);
          console.log("Carrier POST: Shipping rate calculated", totalPrice);
        } catch (err) {
          // Log error but continue processing other service levels
          console.error("Carrier POST: Error calculating shipping rate", err);
        }
        
        // Add calculated price to service level configuration
        config.serviceLevels[s].total_price = totalPrice;
        
        // Add service level to rates array
        rates.push(config.serviceLevels[s]);
      }
    }

    /**
     * Custom Rate Transformation for Business Pleasure Co.
     * Target: business-pleasure-co.myshopify.com
     * Logic: Maps 'rocpa' and 'wg' to a unified "White Glove" branding 
     * while differentiating via tier descriptors.
     */
    if (IDENTIFIER === "business-pleasure-co.myshopify.com") {
      rates = rates.map((rate) => {
        
        // Tier 1: Room of Choice with Assembly (ROCPA)
        if (rate.service_code === "rocpa") {
          return {
            ...rate,
            service_name: "White Glove (Room of Choice)",
            description: "Premium delivery to your room of choice, including full assembly and debris removal.",
          };
        }

        // Tier 2: Standard White Glove (WG)
        if (rate.service_code === "wg") {
          return {
            ...rate,
            service_name: "White Glove (Standard)",
            // Note: Retains original technical constraints (no gas/electric hookups) 
            // to manage customer expectations accurately.
          };
        }

        return rate;
      });
    }
    
    console.log("Carrier POST: Responding with shipping rates");
    
    // Return rates to Shopify
    // Even if rates array is empty, return 200 to prevent checkout errors
    res.status(200).send({ rates });
  } catch (err) {
    // Log error and return 400 to Shopify
    console.error("Carrier POST: Error processing request", err);
    res.status(400).send();
  }
});

// ============================================================================
// ROUTES - Health Check
// ============================================================================

/**
 * Health check endpoint
 * Used by monitoring systems and load balancers to verify server status
 * 
 * @route GET /health
 * @returns {string} 'ok' - Server is healthy and responsive
 * 
 * @example
 * // Response
 * ok
 */
app.get("/health", async (_req, res) => {
  console.log("Health Check: Responding to health check");
  res.status(200).send("ok");
});

// ============================================================================
// ROUTES - Carrier Activation
// ============================================================================

/**
 * Carrier service activation endpoint
 * Creates and activates the carrier service in Shopify
 * 
 * This endpoint should be called after store configuration is complete.
 * It creates the carrier service in Shopify that will be used to calculate
 * shipping rates at checkout.
 * 
 * @route GET /api/carrier/activate
 * @returns {void} 200 on success, 400 on error
 * 
 * @example
 * // Success Response
 * Status: 200 OK
 * 
 * @example
 * // Error Response
 * Status: 400 Bad Request
 * {error details}
 */
app.get("/api/carrier/activate", async (_req, res) => {
  try {
    console.log("API Carrier Activate: Activating carrier for shop");
    
    // Extract session from response locals
    const session = res.locals.shopify.session;
    
    // Create carrier service in Shopify
    // This registers the /carrier endpoint as a shipping rate provider
    await createCarrier(session);
    
    console.log("API Carrier Activate: Carrier activated successfully");
    
    // Return success status
    res.status(200).send();
  } catch (error) {
    // Log error and return error response
    console.error("API Carrier Activate: Error activating carrier", error);
    res.status(400).send(error);
  }
});

// ============================================================================
// MIDDLEWARE - Security Headers
// ============================================================================

/**
 * Apply Content Security Policy (CSP) headers
 * Required for Shopify app security standards
 */
app.use(shopify.cspHeaders());

// ============================================================================
// MIDDLEWARE - Static File Serving
// ============================================================================

/**
 * Serve static files from frontend build directory
 * 
 * Configuration:
 * - index: false - Don't automatically serve index.html
 * - This prevents conflicts with the catch-all route below
 */
app.use(serveStatic(STATIC_PATH, { index: false }));

// ============================================================================
// ROUTES - Frontend Catch-All (SPA Support)
// ============================================================================

/**
 * Catch-all route for Single Page Application (SPA)
 * Serves the frontend index.html for all unmatched routes
 * 
 * This enables client-side routing in the React/Vue frontend.
 * All routes are handled by the frontend router except:
 * - /api/* routes (handled above)
 * - /health route (handled above)
 * - /carrier route (handled above)
 * 
 * The route also:
 * - Ensures app is installed before serving frontend
 * - Injects SHOPIFY_API_KEY into HTML for Shopify App Bridge
 * 
 * @route GET /*
 * @param {express.Request} _req - Request object (unused)
 * @param {express.Response} res - Response object
 * @param {express.NextFunction} _next - Next function (unused)
 * @returns {express.Response} HTML response with injected API key
 */
app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  console.log("Fallback Route: Serving frontend index.html");
  
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      // Read index.html from static path
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        // Replace placeholder with actual API key for Shopify App Bridge
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

/**
 * Start Express server on configured port
 * Server will listen for HTTP requests on all network interfaces
 */
app.listen(PORT);
console.log("Server: Starting on port", PORT);
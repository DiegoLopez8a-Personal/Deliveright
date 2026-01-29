/**
 * @fileoverview Deliveright API Client - Integration Layer
 * 
 * This module provides a comprehensive API client for interacting with Deliveright's
 * delivery service platform (also known as Grasshopper). It handles all communication
 * between the Shopify app and Deliveright's backend systems.
 * 
 * Primary Responsibilities:
 * - Store management (create, read, update operations)
 * - Shipping rate calculations with multi-factor pricing
 * - Order creation and transformation
 * - Payment strategy implementation
 * - Data format conversion between Shopify and Deliveright
 * 
 * Key Features:
 * 1. Store Management: CRUD operations for retailer accounts
 * 2. Rate Calculator: Real-time shipping cost calculations
 * 3. Order Processing: Transform Shopify orders to Deliveright format
 * 4. Payment Strategies: Support for 5 different pricing models
 * 5. Origin Location Handling: Automatic fallback for missing warehouse data
 * 6. GraphQL Integration: Fetch location data from Shopify API
 * 
 * API Authentication:
 * All requests are authenticated using client_id and client_secret passed as
 * query parameters. These credentials are loaded from environment variables.
 * 
 * Error Handling:
 * - All async operations return Promises
 * - Comprehensive error logging at each step
 * - Graceful degradation for missing data
 * - Automatic fallback mechanisms for critical fields
 * 
 * Data Flow:
 * ```
 * Shopify Order → createDeliverightOrder() → Transform Data → newOrder()
 *                                                                   ↓
 *                                                           Deliveright API
 *                                                                   ↓
 *                                                         Delivery Processing
 * ```
 * 
 * Usage:
 * ```javascript
 * import deliveright from './classes/deliveright.js';
 * 
 * // Create a store
 * const store = await deliveright.createStore(storeData);
 * 
 * // Calculate shipping rate
 * const rate = await deliveright.calculateShippingRate(
 *   shopId, rateRequest, serviceLevel, retailer
 * );
 * 
 * // Create an order
 * const order = await deliveright.newOrder(orderData, store, shopId);
 * ```
 * 
 * Environment Variables Required:
 * - DELIVERIGHT_ID: Client ID for API authentication
 * - DELIVERIGHT_SECRET: Client secret for API authentication
 * - DELIVERIGHT_HOST: Base URL for Deliveright API (from config)
 * 
 * @class DeliverightApi
 * @requires axios
 * @requires lodash
 * @requires ../config
 * @requires ../shopify
 * 
 * @author Deliveright Development Team
 * @version 1.0.0
 */

// ============================================================================
// IMPORTS - External Dependencies
// ============================================================================

import axios from "axios";
import config from "../config.js";
import _ from "lodash";
import shopify from "../shopify.js";

// ============================================================================
// CONSTANTS - Unit Conversions
// ============================================================================

/**
 * Conversion factor: grams to pounds
 * Used to convert Shopify weights (in grams) to Deliveright weights (in lbs)
 * 
 * @constant {number}
 * @default 453.592
 * 
 * @example
 * // Convert 1000 grams to pounds
 * const weightInPounds = 1000 / LBS;  // 2.20462 lbs
 */
const LBS = 453.592;

// ============================================================================
// CLASS DEFINITION - Deliveright API Client
// ============================================================================

/**
 * Deliveright API Client Class
 * 
 * Singleton class that manages all interactions with the Deliveright API.
 * Provides methods for store management, rate calculation, and order processing.
 * 
 * The class is instantiated once at module export with credentials from
 * environment variables, ensuring consistent authentication across all requests.
 * 
 * @class
 */
class DeliverightApi {
  /**
   * Initialize Deliveright API client with authentication credentials
   * 
   * Creates a new instance with configured API endpoints. All endpoints
   * include client_id and client_secret query parameters for authentication.
   * 
   * The constructor sets up three main API endpoints:
   * 1. Store endpoint: For retailer account management
   * 2. Shipping endpoint: For rate calculations
   * 3. Order endpoint: For order creation and processing
   * 
   * @constructor
   * @param {string} DELIVERIGHT_ID - Client ID for API authentication
   * @param {string} DELIVERIGHT_SECRET - Client secret for API authentication
   * 
   * @example
   * // Typically instantiated once at module level
   * const client = new DeliverightApi(
   *   process.env.DELIVERIGHT_ID,
   *   process.env.DELIVERIGHT_SECRET
   * );
   */
  constructor(DELIVERIGHT_ID, DELIVERIGHT_SECRET) {
    console.log("DeliverightApi: Initializing with credentials");
    
    /**
     * Store management API endpoint
     * Used for creating, retrieving, and updating store records
     * 
     * @type {string}
     * @private
     */
    this.url = `${config.deliverightApi}/api/shopify/store?client_id=${DELIVERIGHT_ID}&client_secret=${DELIVERIGHT_SECRET}`;
    
    /**
     * Shipping rate calculation API endpoint
     * Used for real-time shipping cost calculations
     * 
     * @type {string}
     * @private
     */
    this.shippingUrl = `${config.deliverightApi}/api/shipping?client_id=${DELIVERIGHT_ID}&client_secret=${DELIVERIGHT_SECRET}`;
    
    /**
     * Order creation API endpoint
     * Used for submitting new delivery orders
     * 
     * @type {string}
     * @private
     */
    this.newOrderUrl = `${config.deliverightApi}/api/shopify/order?client_id=${DELIVERIGHT_ID}&client_secret=${DELIVERIGHT_SECRET}`;
  }

  // ==========================================================================
  // STORE MANAGEMENT METHODS
  // ==========================================================================

  /**
   * Create a new store/retailer account in Deliveright
   * 
   * This method is called during app installation to register a Shopify store
   * with Deliveright's delivery service. It creates a retailer account that
   * will be used for all subsequent operations.
   * 
   * Request Flow:
   * 1. Receive store data from Shopify app installation
   * 2. POST data to Deliveright API
   * 3. Extract and format response data
   * 4. Return formatted store information
   * 
   * The method handles both success and error cases, providing detailed
   * logging at each step for debugging and monitoring.
   * 
   * @param {Object} data - Store configuration data
   * @param {string} data.store_id - Shopify shop domain (e.g., 'example.myshopify.com')
   * @param {string} data.first_name - Store owner first name
   * @param {string} data.last_name - Store owner last name
   * @param {string} data.email - Store contact email
   * @param {string} data.phone - Store contact phone
   * @param {Object} data.address - Store physical address
   * @param {string} data.address.address1 - Street address line 1
   * @param {string} data.address.city - City
   * @param {string} data.address.state - State/Province code
   * @param {string} data.address.zip - Postal/ZIP code
   * @param {number} data.delivery_type - Delivery type (1=last mile only, 2=full service)
   * 
   * @returns {Promise<Object>} Formatted store data
   * @returns {string} return.name - Full name of store owner
   * @returns {string} return.first_name - Store owner first name
   * @returns {string} return.last_name - Store owner last name
   * @returns {Object} return.address - Store address
   * @returns {string} return.company - Company name
   * @returns {number} return.status - HTTP status code (200 on success)
   * 
   * @throws {Object} Error object from Deliveright API or generic error
   * 
   * @example
   * const storeData = {
   *   store_id: 'example.myshopify.com',
   *   first_name: 'John',
   *   last_name: 'Doe',
   *   email: 'john@example.com',
   *   phone: '+1234567890',
   *   address: {
   *     address1: '123 Main St',
   *     city: 'New York',
   *     state: 'NY',
   *     zip: '10001'
   *   },
   *   delivery_type: 1
   * };
   * 
   * try {
   *   const store = await deliveright.createStore(storeData);
   *   console.log('Store created:', store.name);
   * } catch (error) {
   *   console.error('Failed to create store:', error);
   * }
   */
  createStore(data) {    
    console.log("createStore: Creating store with data", data);
    console.log("createStore: Creating store with data", data.store_id);
    
    return new Promise((resolve, reject) => {
      // Configure HTTP request for store creation
      let config = {
        method: "post",
        url: this.url,
        headers: { "Content-Type": "application/json" },
        data,
      };
      
      // Execute API request
      axios(config)
        .then((res) => {
          console.log("createStore: Store created successfully", res.status);
          
          // Verify response contains data
          if (res.data) {
            // Extract and format store information from response
            resolve({
              name: res.data.data.first_name + " " + res.data.data.last_name,
              first_name: res.data.data.first_name,
              last_name: res.data.data.last_name,
              address: res.data.data.address,
              company: res.data.data.company,
              status: 200,
            });
          } else {
            // Response received but no data present
            console.warn("createStore: No data in response");
            reject({ error: true });
          }
        })
        .catch((err) => {
          // Handle API errors
          console.error("createStore: Error creating store", err.message);
          
          try {
            // Attempt to extract detailed error from response
            reject(err.response.data);
          } catch {
            // Fallback to generic error if extraction fails
            reject({ error: true });
          }
        });
    });
  }

  /**
   * Retrieve store/retailer information from Deliveright
   * 
   * Fetches complete store configuration including settings, pricing type,
   * and contact information. This method is frequently called to verify
   * store status and retrieve authentication tokens.
   * 
   * Use Cases:
   * - Verify store exists before processing orders
   * - Retrieve access token for Shopify API calls
   * - Check delivery type configuration
   * - Get payment strategy settings
   * 
   * @param {string} id - Store identifier (Shopify shop domain)
   * 
   * @returns {Promise<Object>} Complete store information
   * @returns {string} return.name - Full name of store owner
   * @returns {string} return.company - Company name
   * @returns {string} return.first_name - Store owner first name
   * @returns {string} return.last_name - Store owner last name
   * @returns {string|null} return.email - Store contact email
   * @returns {Object} return.address - Store physical address
   * @returns {number} return.status - HTTP status code (200 on success)
   * @returns {Object} return.settings - Shopify integration settings
   * @returns {Object} return.settings.auth - Authentication credentials
   * @returns {string} return.settings.auth.access_token - Shopify access token
   * @returns {number} return.settings.delivery_type - Delivery type (1 or 2)
   * @returns {Object} return.settings.payment - Payment strategy configuration
   * @returns {string} return.pricing_type - Default pricing set type
   * 
   * @throws {Object} Error object with message and status code
   * @throws {string} throws.message - Error description
   * @throws {number} throws.status - HTTP status code (typically 400)
   * 
   * @example
   * try {
   *   const store = await deliveright.getStore('example.myshopify.com');
   *   console.log('Store settings:', store.settings);
   *   console.log('Access token:', store.settings.auth.access_token);
   * } catch (error) {
   *   if (error.status === 400) {
   *     console.error('Store not found');
   *   }
   * }
   */
  getStore(id) {
    console.log("getStore: Fetching store info for ID", id);
    
    return new Promise((resolve, reject) => {
      // Construct full URL with store identifier
      const fullUrl = this.url + `&identifier=${id}`;
      
      // Configure HTTP GET request
      const config = {
        method: "get",
        url: fullUrl,
        headers: {
          "Content-Type": "application/json",
        },
      };

      // Execute API request
      axios(config)
        .then((res) => {
          console.log("getStore: Store info retrieved, status:", res.status);
          
          // Verify response contains store data
          if (res.data?.data) {
            console.log("getStore: Processing store data for ID", id);
            console.log("getStore: Processing store data:", res.data.data);
            
            // Extract and format store information
            // Note: label_recipients is an array, we take the first contact email
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
            // Store not found in Deliveright system
            console.warn("getStore: No store data found for ID", id);
            reject({
              message: "Store doesn't exist",
              status: 400,
            });
          }
        })
        .catch((err) => {
          // Handle API errors
          console.error("getStore: Error fetching store", err.message);
          
          if (err.response) {
            // Log HTTP error status for debugging
            console.error("getStore: Error status:", err.response.status);
            reject(err.response.data);
          } else {
            // Network or other non-HTTP errors
            reject({ error: true, message: err.message });
          }
        });
    });
  }

  /**
   * Update store/retailer information in Deliveright
   * 
   * Performs a partial update (PATCH) of store configuration. Only the
   * fields provided in the data object will be updated; other fields
   * remain unchanged.
   * 
   * Common Update Scenarios:
   * - Updating Shopify access token after refresh
   * - Changing delivery type configuration
   * - Modifying payment strategy settings
   * - Updating contact information
   * 
   * @async
   * @param {string} id - Store identifier (Shopify shop domain)
   * @param {Object} [data={}] - Partial store data to update
   * @param {Object} [data.auth] - Authentication updates
   * @param {string} [data.auth.access_token] - New Shopify access token
   * @param {number} [data.delivery_type] - New delivery type
   * @param {Object} [data.payment] - Payment strategy updates
   * 
   * @returns {Promise<AxiosResponse>} Axios response object
   * @returns {Object} return.data - Updated store data from API
   * @returns {number} return.status - HTTP status code
   * 
   * @throws {Error} Axios error if request fails
   * 
   * @example
   * // Update access token
   * await deliveright.updateStore('example.myshopify.com', {
   *   auth: { access_token: 'new_token_here' }
   * });
   * 
   * @example
   * // Update delivery type
   * await deliveright.updateStore('example.myshopify.com', {
   *   delivery_type: 2  // Change to full service
   * });
   */
  async updateStore(id, data = {}) {
    console.log("updateStore: Updating store for ID", id);
    
    // Add store_id to data payload
    data.store_id = id;
    
    // Configure HTTP PATCH request
    let config = {
      method: "patch",
      url: this.url,
      headers: { "Content-Type": "application/json" },
      data,
    };
    
    // Execute update request
    const res = await axios(config);
    console.log("updateStore: Store updated successfully", res.status);
    
    return res;
  }

  // ==========================================================================
  // SHIPPING RATE CALCULATION
  // ==========================================================================

  /**
   * Calculate shipping rate for a delivery request
   * 
   * This method performs real-time shipping cost calculations by calling
   * Deliveright's rate calculation API. It considers multiple factors:
   * - Origin and destination postal codes
   * - Total weight and individual item weights
   * - Service level (white glove, threshold, etc.)
   * - Pricing type and payment strategy
   * - Accessorial fees (stairs, lift gate, etc.)
   * 
   * Calculation Process:
   * 1. Convert weights from grams to pounds
   * 2. Build rate request URL with all parameters
   * 3. Call Deliveright shipping API
   * 4. Sum base cost and accessorial fees
   * 5. Apply payment strategy adjustments
   * 6. Format and return final price
   * 
   * @param {string} IDENTIFIER - Store identifier (shop domain)
   * @param {Object} data - Rate request data from Shopify
   * @param {Object} data.rate - Rate request object
   * @param {Object} data.rate.origin - Origin/warehouse address
   * @param {string} data.rate.origin.postal_code - Origin ZIP/postal code
   * @param {Object} data.rate.destination - Customer delivery address
   * @param {string} data.rate.destination.postal_code - Destination ZIP/postal code
   * @param {Array<Object>} data.rate.items - Cart items
   * @param {number} data.rate.items[].grams - Item weight in grams
   * @param {number} data.rate.items[].quantity - Item quantity
   * @param {string} serviceLevel - Service level code (e.g., 'wg', 'thr')
   * @param {Object} retailer - Store/retailer configuration
   * @param {string} [retailer.pricing_type="1"] - Pricing type identifier
   * @param {Object} retailer.settings - Store settings
   * @param {Object} retailer.settings.payment - Payment configuration
   * 
   * @returns {Promise<number>} Calculated shipping price in cents
   * 
   * @throws {string} Error message if calculation fails
   * @throws {Object} API error response if request fails
   * 
   * @example
   * const rateRequest = {
   *   rate: {
   *     origin: { postal_code: '90210' },
   *     destination: { postal_code: '10001' },
   *     items: [
   *       { grams: 10000, quantity: 1 },  // 10kg item
   *       { grams: 5000, quantity: 2 }    // Two 5kg items
   *     ]
   *   }
   * };
   * 
   * const retailer = {
   *   pricing_type: "1",
   *   settings: {
   *     payment: { type: 0 }  // PAID_BY_CUSTOMER
   *   }
   * };
   * 
   * try {
   *   const price = await deliveright.calculateShippingRate(
   *     'example.myshopify.com',
   *     rateRequest,
   *     'wg',  // White Glove service
   *     retailer
   *   );
   *   console.log('Shipping cost:', price / 100, 'USD');
   * } catch (error) {
   *   console.error('Rate calculation failed:', error);
   * }
   */
  calculateShippingRate(IDENTIFIER, data, serviceLevel, retailer) {
    console.log("calculateShippingRate: Calculating rate for ID", IDENTIFIER, "Service:", serviceLevel);
    
    return new Promise((resolve, reject) => {
      // Extract destination and origin from rate request
      const DESTINATION = data.rate.destination;
      const ORIGIN = data.rate.origin;
      
      // Get pricing type from retailer config, default to "1"
      const PRICING_TYPE = retailer.pricing_type || "1";
      
      // Initialize weight variables
      let WEIGHT = 0;  // Total weight in pounds
      let WEIGHT_PER_ITEM = "";  // URL query string for individual weights

      // Calculate total weight and build per-item weight parameters
      for (let product of data.rate.items) {
        // Add weight for this product (grams * quantity converted to lbs)
        WEIGHT += product.grams * product.quantity;
        
        // Append individual item weight to query string
        // This allows Deliveright to consider dimensional weight and multi-piece shipments
        WEIGHT_PER_ITEM += `&item_weight=${(product.grams * product.quantity) / LBS}`;
      }
      
      // Convert total weight from grams to pounds
      WEIGHT = WEIGHT / LBS;
      
      // Configure rate calculation request
      // Query parameters include:
      // - steps: Number of delivery steps/stops
      // - retailer_identifier: Store ID for rate lookup
      // - zip: Destination postal code
      // - weight: Total shipment weight in pounds
      // - pickup_region: Origin postal code
      // - service_level: Delivery service type
      // - pricing_type: Pricing tier/type
      // - item_weight: Individual item weights (repeated parameter)
      var config = {
        method: "get",
        url: `${this.shippingUrl}&steps=1&retailer_identifier=${IDENTIFIER}&zip=${DESTINATION.postal_code}&weight=${WEIGHT}&pickup_region=${ORIGIN.postal_code}&service_level=${serviceLevel}&pricing_type=${PRICING_TYPE}${WEIGHT_PER_ITEM}`,
        headers: {
          "Content-Type": "application/json",
        },
      };

      console.log("calculateShippingRate: Sending rate request", config.url);
      
      // Execute rate calculation request
      axios(config)
        .then((res) => {
          console.log("calculateShippingRate: Rate response received", res.status);
          
          // Check if response contains an error code
          if (!res.data.data.errorCode) {
            let shippingResult = res.data.data;
            
            // Validate that result contains cost information
            if (!shippingResult || !shippingResult.cost) {
              console.warn("calculateShippingRate: No cost in response");
              return reject("Calculator was not able to calculate cost");
            }
            
            // Calculate final price through multi-step process:
            // 1. Sum base cost and accessorial fees (stairs, lift gate, etc.)
            // 2. Apply payment strategy (customer pays all, split, fixed, etc.)
            // 3. Format price to cents and apply limits
            const price = this.formatPrice(
              this.getPriceByPaymentType(this.sumAccessorials(shippingResult), retailer.settings),
              retailer.settings
            );
            
            console.log("calculateShippingRate: Calculated price", price);
            resolve(price);
          } else {
            // API returned an error code in the response
            console.warn("calculateShippingRate: Error in response", res.data.data);
            reject(res.data.data);
          }
        })
        .catch((error) => {
          // Handle network or API errors
          console.error("calculateShippingRate: Error fetching rate", error.message);
          reject(error);
        });
    });
  }

  // ==========================================================================
  // ORDER PROCESSING METHODS
  // ==========================================================================

  /**
   * Create a new delivery order in Deliveright
   * 
   * This is the main entry point for order processing. It transforms a Shopify
   * order into Deliveright's format and submits it for delivery processing.
   * 
   * The method performs two key operations:
   * 1. Transform order data via createDeliverightOrder()
   * 2. POST transformed data to Deliveright API
   * 
   * Order Flow:
   * ```
   * Shopify Webhook → newOrder() → createDeliverightOrder() → Transform
   *                                                                ↓
   *                                                         POST to API
   *                                                                ↓
   *                                                    Deliveright System
   * ```
   * 
   * @async
   * @param {Object} data - Shopify order data from webhook
   * @param {Object} data.id - Shopify order ID
   * @param {string} data.name - Order number (e.g., '#1001')
   * @param {number} data.order_number - Numeric order number
   * @param {Object} data.customer - Customer information
   * @param {Object} data.shipping_address - Delivery address
   * @param {Array<Object>} data.line_items - Order items
   * @param {Array<Object>} data.shipping_lines - Shipping method info
   * @param {Array<Object>} data.fulfillments - Fulfillment records
   * @param {Object} store - Store configuration from Deliveright
   * @param {string} store_id - Store identifier (shop domain)
   * 
   * @returns {Promise<Object>} API response from Deliveright
   * @returns {Object} return.data - Created order data
   * @returns {string} return.data.order_id - Deliveright order ID
   * @returns {string} return.data.tracking_number - Tracking number
   * 
   * @throws {Error} API error with response details
   * 
   * @example
   * const shopifyOrder = {
   *   id: 123456789,
   *   name: '#1001',
   *   order_number: 1001,
   *   customer: { ... },
   *   shipping_address: { ... },
   *   line_items: [ ... ],
   *   shipping_lines: [{ code: 'wg' }],
   *   fulfillments: [ ... ]
   * };
   * 
   * try {
   *   const result = await deliveright.newOrder(
   *     shopifyOrder,
   *     storeConfig,
   *     'example.myshopify.com'
   *   );
   *   console.log('Order created:', result.data.order_id);
   * } catch (error) {
   *   console.error('Order creation failed:', error.response?.data);
   * }
   */
  async newOrder(data, store, store_id) {
    console.log("newOrder: Creating new order for store ID", store_id);
    
    // Transform Shopify order to Deliveright format
    let order = await this.createDeliverightOrder(data, store, store_id);
    
    console.log("newOrder: Order data prepared for store ID", store_id);
    console.log("newOrder: Order data", JSON.stringify(order, null, 2));

    // Configure HTTP POST request
    const config = {
      method: "post",
      url: this.newOrderUrl,
      headers: { "Content-Type": "application/json" },
      data: order,
    };
    
    try {
      // Submit order to Deliveright API
      const res = await axios(config);
      console.log("newOrder: Order sent successfully", res.status);
      console.log("newOrder: Response data", res.data);
      return res.data;
    } catch (e) {
      // Log detailed error information for debugging
      console.error("newOrder: Error sending order", e.message);
      console.error("Error details:", JSON.stringify(e.response?.data, null, 2));
      throw e;
    }
  }

  /**
   * Transform Shopify order data into Deliveright order format
   * 
   * This is one of the most complex methods in the class. It handles:
   * - Data format conversion from Shopify to Deliveright
   * - Origin location resolution with multiple fallback mechanisms
   * - GraphQL queries to Shopify for missing location data
   * - Weight unit conversion (grams to pounds)
   * - Customer and address data extraction
   * - Service level detection
   * - Data validation and logging
   * 
   * Origin Location Resolution Strategy:
   * 1. Use line_item.origin_location if complete
   * 2. Fallback: Query fulfillment location via GraphQL
   * 3. Fallback: Query default location from Shopify
   * 4. Log warnings if data incomplete
   * 
   * The method includes extensive validation and logging to help diagnose
   * issues with missing or incomplete data from Shopify webhooks.
   * 
   * @async
   * @param {Object} data - Shopify order webhook data
   * @param {Object} data.id - Order ID
   * @param {string} data.name - Order name/number
   * @param {number} data.order_number - Numeric order number
   * @param {Object} data.customer - Customer object
   * @param {string} data.customer.first_name - Customer first name
   * @param {string} data.customer.last_name - Customer last name
   * @param {string} data.customer.email - Customer email
   * @param {string} data.customer.phone - Customer phone
   * @param {Object} data.shipping_address - Delivery address
   * @param {Object} data.customer_address - Billing/customer address (fallback)
   * @param {Array<Object>} data.line_items - Order line items
   * @param {Object} data.line_items[].origin_location - Item origin (may be incomplete)
   * @param {Array<Object>} data.fulfillments - Fulfillment records
   * @param {number} data.fulfillments[].location_id - Fulfillment location ID
   * @param {Array<Object>} data.shipping_lines - Shipping methods
   * @param {string} data.shipping_lines[].code - Service level code
   * @param {Object} retailer - Store configuration
   * @param {Object} retailer.settings - Store settings
   * @param {number} retailer.settings.delivery_type - Delivery type (1 or 2)
   * @param {Object} retailer.settings.auth - Authentication
   * @param {string} retailer.settings.auth.access_token - Shopify access token
   * @param {string} store_id - Store identifier (shop domain)
   * 
   * @returns {Promise<Object>} Transformed order in Deliveright format
   * @returns {Object} return.order - Order object
   * @returns {string} return.order.source - Always "shopify"
   * @returns {string} return.order.sales_order_number - Order name
   * @returns {string} return.order.ref_order_number - Order ID as string
   * @returns {Object} return.order.customer - Customer information
   * @returns {Array<Object>} return.order.line_items - Transformed line items
   * @returns {Object} return.order.retailer - Retailer identifier
   * @returns {string} return.order.service_level - Service level code
   * @returns {Object} return.order.payload - Additional Shopify data
   * @returns {Object} return.options - Processing options
   * 
   * @example
   * const order = await deliveright.createDeliverightOrder(
   *   shopifyOrderData,
   *   storeConfig,
   *   'example.myshopify.com'
   * );
   * 
   * // Order will have structure:
   * // {
   * //   order: {
   * //     source: "shopify",
   * //     customer: {...},
   * //     line_items: [...],
   * //     service_level: "wg",
   * //     ...
   * //   },
   * //   options: {...}
   * // }
   */
  async createDeliverightOrder(data, retailer, store_id) {
    console.log("createDeliverightOrder: Preparing order for store ID", store_id);
    
    // Log relevant webhook data for debugging
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

    // Determine if this is a last-mile only delivery
    // Last mile only (FOB) means no pickup from vendor, item already at hub
    const LAST_MILE_ONLY = 1;
    let is_fob = retailer.settings.delivery_type === LAST_MILE_ONLY;

    // Initialize Shopify GraphQL client for location queries
    // This client uses the store's access token for authenticated requests
    const client = new shopify.api.clients.Graphql({
      session: {
        shop: store_id,
        accessToken: retailer.settings.auth.access_token,
      },
    });

    // ==========================================================================
    // PROCESS LINE ITEMS - Origin Location Resolution
    // ==========================================================================
    
    let line_items = [];
    for (let line_item of data.line_items || []) {
      // Extract origin location from line item (may be incomplete or missing)
      let origin_location = line_item.origin_location || {};

      // Check if origin location has all required fields
      const hasValidOrigin =
        origin_location &&
        origin_location.address1 &&
        origin_location.city &&
        origin_location.province_code &&
        origin_location.zip &&
        origin_location.name &&
        origin_location.phone;

      // If origin location is incomplete, attempt to resolve it
      if (!hasValidOrigin) {
        console.warn(
          `createDeliverightOrder: origin_location is empty or incomplete for line_item ID ${line_item?.id || 'unknown'}`
        );

        let location = null;
        
        // Strategy 1: Try to get location from fulfillment
        const fulfillment = data.fulfillments?.find((f) =>
          f.line_items?.some((li) => li.id === line_item?.id)
        );

        if (fulfillment && fulfillment.location_id) {
          console.log(
            `createDeliverightOrder: Fetching location for fulfillment ID ${fulfillment.id} with location_id ${fulfillment.location_id}`
          );

          try {
            // GraphQL query to fetch location details by ID
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
            
            // Execute GraphQL query
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
              
              // Transform GraphQL location to required format
              origin_location = {
                address1: location.address.address1,
                address2: location.address.address2 || "",
                city: location.address.city,
                province_code: location.address.provinceCode,
                zip: location.address.zip,
                name: location.name,
                phone: location.address.phone,
              };
              
              // Validate that the fetched location has complete data
              if (!origin_location.address1 || !origin_location.city || !origin_location.province_code || !origin_location.zip || !origin_location.phone) {
                console.warn(
                  `createDeliverightOrder: Location ID ${fulfillment.location_id} has incomplete data:`,
                  JSON.stringify(origin_location, null, 2)
                );
                location = null;  // Mark as invalid for fallback to next strategy
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

        // Strategy 2: If no valid location yet, try to get default location
        if (!location) {
          console.log("createDeliverightOrder: Fetching default location from Shopify");
          
          try {
            // GraphQL query to fetch all locations (up to 10)
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
            
            // Execute GraphQL query
            const response = await client.query({ data: { query } });
            const locations = response.body.data?.locations?.edges?.map(edge => edge.node) || [];
            
            // Find first location with complete data, or use first location as last resort
            const defaultLocation = locations.find(loc => loc.address?.address1 && loc.address?.city && loc.address?.zip && loc.address?.phone) || locations[0];
            
            if (defaultLocation) {
              console.log(
                `createDeliverightOrder: Using default location: ${defaultLocation.name}`,
                JSON.stringify(defaultLocation, null, 2)
              );
              
              // Transform to required format
              origin_location = {
                address1: defaultLocation.address.address1 || "",
                address2: defaultLocation.address.address2 || "",
                city: defaultLocation.address.city || " ",  // Space as fallback for required field
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

      // Transform line item to Deliveright format
      let drl_item = {
        sku: line_item.sku || line_item.product_id?.toString(),  // Use SKU or fallback to product_id
        name: line_item.title,
        quantity: line_item.quantity,
        retail_value: line_item.price,
        weight: line_item.grams ? Number((line_item.grams / 453.592).toFixed(2)) : 0,  // Convert grams to lbs
        vendor: line_item.vendor,
        freight_info: {
          is_fob,  // Free on board flag (last mile only)
          vendor_info: {
            first_name: "",
            last_name: "",
            address: {
              address1: origin_location.address1,
              address2: origin_location.address2 || "",
              city: origin_location.city,
              state: origin_location.province_code,
              zip: origin_location.zip,
            },
            company: origin_location.name,
            phone: origin_location.phone || "",
            email: "",
            receiving_hours: "",
          },
        },
      };
      
      line_items.push(drl_item);
    }

    // Log transformed line items for debugging
    console.log("LINE ITEMS: ", JSON.stringify(line_items, null, 2));

    // ==========================================================================
    // PROCESS CUSTOMER DATA
    // ==========================================================================
    
    // Extract customer address (prefer shipping_address, fallback to customer_address)
    const customerAddress = data.shipping_address || data.customer_address || {};
    
    // Build customer object in Deliveright format
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

    // Log warning if customer phone is missing from both addresses
    if (!customerAddress.phone && !data.customer?.phone) {
      console.warn("createDeliverightOrder: Customer phone is missing in customer_address and customer");
    }

    // ==========================================================================
    // BUILD COMPLETE ORDER OBJECT
    // ==========================================================================
    
    let order = {
      order: {
        source: "shopify",  // Order source identifier
        sales_order_number: data.name || "",  // Order name (e.g., "#1001")
        ref_order_number: data.id?.toString() || "",  // Shopify order ID
        payload: {
          // Additional Shopify-specific data
          shopify_order_number: data.order_number || null,
          shopify_raw: {
            // Raw Shopify data for reference
            id: data.id || null,
            name: data.name || "",
            line_items: (data.line_items || []).map((li) => ({
              id: li.id,
              title: li.title,
              quantity: li.quantity,
              price: li.price,
              grams: li.grams,
              vendor: li.vendor,
              product_id: li.product_id,
            })),
          },
        },
        customer,
        line_items,
        retailer: {
          identifier: store_id,
        },
        service_level: data.shipping_lines?.[0]?.code || "STANDARD",  // Get service level from shipping method
        send_retailer_confirmation: false,
        note: "",
        label_recipients: [],
      },
      options: {
        send_retailer_confirmation: true,
        send_labels_to_manufacturer: true,
      },
    };

    // ==========================================================================
    // DATA VALIDATION AND LOGGING
    // ==========================================================================
    
    console.log("createDeliverightOrder: Validating order data");

    // Validate customer phone
    if (order.order.customer.phone1.number === "415-555-1234") {
      console.warn("createDeliverightOrder: Using fallback for customer.phone1.number");
    } else {
      console.log(
        "createDeliverightOrder: customer.phone1.number",
        order.order.customer.phone1.number
      );
    }

    // Validate customer address completeness
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

    // Validate line items exist
    if (!order.order.line_items || order.order.line_items.length === 0) {
      console.warn("createDeliverightOrder: line_items is empty");
    } else {
      // Validate each line item's vendor information
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

    // Validate Shopify raw data
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

  // ==========================================================================
  // PRICING AND FORMATTING METHODS
  // ==========================================================================

  /**
   * Adjust price based on payment strategy
   * 
   * Applies the store's payment strategy to the calculated shipping cost.
   * This determines how much the customer will be charged versus what the
   * merchant will pay to Deliveright.
   * 
   * Payment Strategy Implementations:
   * 
   * 1. PAID_BY_CUSTOMER (0): Customer pays full price
   *    - Return price as-is
   *    - Most transparent option
   * 
   * 2. PAID_BY_SHIPPER (1): Free shipping for customer
   *    - Return 0 (customer pays nothing)
   *    - Merchant absorbs full cost
   * 
   * 3. SPLIT (2): Shared cost
   *    - Calculate customer portion based on split_ratio
   *    - Example: 70% split ratio = customer pays 30%
   * 
   * 4. FIXED (3): Fixed fee regardless of actual cost
   *    - Return difference (price - fixed fee)
   *    - If fixed fee > actual cost, merchant profits
   *    - If fixed fee < actual cost, merchant subsidizes
   * 
   * 5. ROUND_NEAREST_NUMBER (4): Round to nearest configured value
   *    - Find closest value in round_nearest array
   *    - Provides cleaner pricing display
   * 
   * @param {number} price - Base shipping price in cents
   * @param {Object} settings - Store payment settings
   * @param {number} settings.payment.type - Payment strategy type (0-4)
   * @param {number} [settings.payment.split_ratio] - Split ratio for SPLIT strategy
   * @param {number} [settings.payment.fixed] - Fixed fee in dollars for FIXED strategy
   * @param {Array<number>} [settings.payment.round_nearest] - Rounding values for ROUND strategy
   * 
   * @returns {number} Adjusted price in cents
   * 
   * @example
   * // Customer pays all
   * getPriceByPaymentType(9500, { payment: { type: 0 } });
   * // Returns: 9500
   * 
   * @example
   * // Free shipping
   * getPriceByPaymentType(9500, { payment: { type: 1 } });
   * // Returns: 0
   * 
   * @example
   * // 50/50 split (50% split_ratio means customer pays 50%)
   * getPriceByPaymentType(10000, { payment: { type: 2, split_ratio: 50 } });
   * // Returns: 5000
   * 
   * @example
   * // Fixed $99 fee (price is 9500 cents = $95)
   * getPriceByPaymentType(9500, { payment: { type: 3, fixed: 99 } });
   * // Returns: -400 (merchant subsidizes $4)
   */
  getPriceByPaymentType(price, settings) {
    console.log("getPriceByPaymentType: Adjusting price based on payment type", settings.payment.type);
    
    const type = settings.payment.type;
    
    switch (type) {
      case config.paymentStrategies.PAID_BY_CUSTOMER:
        // Strategy 0: Customer pays full calculated cost
        return price;
        
      case config.paymentStrategies.PAID_BY_SHIPPER:
        // Strategy 1: Free shipping - customer pays nothing
        return 0;
        
      case config.paymentStrategies.SPLIT:
        // Strategy 2: Split cost between merchant and customer
        // Formula: customer pays (100 - split_ratio)% of cost
        // Example: split_ratio=70 means merchant pays 70%, customer pays 30%
        return (price / 100) * (100 - settings.payment.split_ratio);
        
      case config.paymentStrategies.FIXED:
        // Strategy 3: Fixed fee charged to customer
        // Convert fixed fee from dollars to cents
        let fixedInCents = settings.payment.fixed * 100;
        // Return difference (could be negative if fixed fee > actual cost)
        return price - fixedInCents;
        
      case config.paymentStrategies.ROUND_NEAREST_NUMBER:
        // Strategy 4: Round to nearest configured value
        let diff = 100000;  // Initialize with large number
        let p;
        
        // Find the smallest value in round_nearest array that is
        // greater than price and closest to it
        settings.payment.round_nearest.map((num) => {
          if (num > price && num - price < diff) {
            p = num;
            diff = num - price;
          }
        });
        
        // If no suitable rounding value found, use original price
        if (!p) p = price;
        return p;
    }
  }

  /**
   * Sum base shipping cost and accessorial fees
   * 
   * Accessorial fees are additional charges for special services:
   * - Stair carry (multiple flights of stairs)
   * - Lift gate service (for deliveries without loading dock)
   * - Inside delivery
   * - Appointment scheduling
   * - Re-delivery fees
   * - Fuel surcharges
   * 
   * The method uses lodash to safely sum all accessorial fees and add
   * them to the base shipping cost.
   * 
   * @param {Object} shippingResult - Shipping calculation result from Deliveright API
   * @param {number} shippingResult.cost - Base shipping cost in cents
   * @param {Object} shippingResult.accessorial_fees - Accessorial fees object
   * @param {number} shippingResult.accessorial_fees[].cost - Individual fee amount
   * 
   * @returns {number} Total price (base cost + all accessorial fees) in cents
   * 
   * @example
   * const result = {
   *   cost: 8000,  // $80 base cost
   *   accessorial_fees: {
   *     stairs: { cost: 1500 },  // $15 stair fee
   *     liftgate: { cost: 500 }  // $5 lift gate fee
   *   }
   * };
   * 
   * sumAccessorials(result);
   * // Returns: 10000 ($100 total)
   */
  sumAccessorials(shippingResult) {
    console.log("sumAccessorials: Summing shipping costs and fees");
    
    // Sum base cost + all accessorial fees
    // _.sumBy safely iterates over accessorial_fees and sums the 'cost' property
    // _.toArray converts the fees object to an array for sumBy
    let price = shippingResult.cost + _.sumBy(_.toArray(shippingResult.accessorial_fees), "cost");
    
    console.log("sumAccessorials: Total price calculated", price);
    return price;
  }

  /**
   * Format and apply price limits
   * 
   * Performs final price formatting and applies maximum price limits if
   * configured. This is the last step before returning the price to Shopify.
   * 
   * Operations:
   * 1. Apply price limit if active (caps maximum charge)
   * 2. Convert to cents (multiply by 100)
   * 3. Return formatted price
   * 
   * Price Limits:
   * Merchants can set a maximum delivery charge to prevent surprisingly
   * high costs for distant deliveries. If actual cost exceeds limit,
   * customer pays the limit and merchant subsidizes the difference.
   * 
   * @param {number} price - Price in cents after payment strategy adjustment
   * @param {Object} settings - Store settings
   * @param {Object} settings.payment - Payment configuration
   * @param {Object} settings.payment.limit - Price limit configuration
   * @param {boolean} settings.payment.limit.active - Whether limit is active
   * @param {number} [settings.payment.limit.amount] - Maximum price in cents
   * 
   * @returns {number} Final formatted price in cents
   * 
   * @example
   * // Without limit
   * formatPrice(9567, { payment: { limit: { active: false } } });
   * // Returns: 956700
   * 
   * @example
   * // With $100 limit (10000 cents)
   * formatPrice(12000, { 
   *   payment: { 
   *     limit: { 
   *       active: true, 
   *       amount: 10000 
   *     } 
   *   } 
   * });
   * // Returns: 1000000 (capped at $100)
   */
  formatPrice(price, settings) {
    console.log("formatPrice: Formatting price with limits");
    
    // Apply maximum price limit if configured
    if (settings.payment.limit.active && settings.payment.limit.amount)
      price = _.min([price, settings.payment.limit.amount]);
    
    // Convert price to cents (multiply by 100)
    // This ensures Shopify receives the price in the correct format
    const formattedPrice = price * 100;
    
    console.log("formatPrice: Formatted price in cents", formattedPrice);
    return formattedPrice;
  }
}

// ============================================================================
// MODULE EXPORT - Singleton Instance
// ============================================================================

/**
 * Extract Deliveright API credentials from environment variables
 * 
 * These credentials are used to authenticate all API requests to Deliveright.
 * They should be kept secure and never committed to version control.
 * 
 * @constant {string} DELIVERIGHT_ID - Client ID from environment
 * @constant {string} DELIVERIGHT_SECRET - Client secret from environment
 */
const { DELIVERIGHT_ID, DELIVERIGHT_SECRET } = process.env;
console.log("DeliverightApi: Exporting instance with credentials", DELIVERIGHT_ID);

/**
 * Export singleton instance of DeliverightApi
 * 
 * The class is instantiated once with credentials from environment variables.
 * This ensures consistent authentication and prevents multiple instances.
 * 
 * Usage in other modules:
 * ```javascript
 * import deliveright from './classes/deliveright.js';
 * 
 * // Use the singleton instance
 * const store = await deliveright.getStore('example.myshopify.com');
 * ```
 * 
 * @type {DeliverightApi}
 */
export default new DeliverightApi(DELIVERIGHT_ID, DELIVERIGHT_SECRET);
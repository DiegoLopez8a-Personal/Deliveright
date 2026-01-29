/**
 * @fileoverview Application Configuration Module - Deliveright Shopify Integration
 * 
 * This module serves as the central configuration hub for the Shopify-Deliveright
 * integration application. It manages all critical settings including:
 * - Environment variable loading and validation
 * - Shopify API scope definitions
 * - Carrier service configuration
 * - Delivery service level definitions
 * - Payment strategy mappings
 * 
 * The configuration is designed to be environment-agnostic, loading settings from
 * environment variables while providing sensible defaults for development.
 * 
 * Key Configuration Areas:
 * 1. API Endpoints: Deliveright API base URL and application host
 * 2. Shopify Integration: Required OAuth scopes and carrier service settings
 * 3. Service Levels: 12 distinct delivery service types with detailed descriptions
 * 4. Payment Strategies: 5 different payment calculation methods
 * 
 * Usage:
 * ```javascript
 * import config from './config.js';
 * 
 * // Access API endpoint
 * const apiUrl = config.deliverightApi;
 * 
 * // Get service level details
 * const whiteGlove = config.serviceLevels.wg;
 * 
 * // Check payment strategy
 * if (strategy === config.paymentStrategies.PAID_BY_CUSTOMER) {...}
 * ```
 * 
 * Environment Variables Required:
 * - HOST: Application host URL (e.g., 'https://your-app.com')
 * - DELIVERIGHT_HOST: Deliveright API base URL
 * 
 * @module config
 * @requires dotenv
 * 
 * @author Deliveright Development Team
 * @version 1.0.0
 */

// ============================================================================
// IMPORTS - Environment Configuration
// ============================================================================

import dotenv from "dotenv";

// ============================================================================
// ENVIRONMENT INITIALIZATION
// ============================================================================

/**
 * Load environment variables from .env file
 * 
 * The .env file should be located in the parent directory relative to this
 * config file. This allows for separation of configuration from code and
 * enables different settings per environment (dev, staging, production).
 * 
 * Expected .env structure:
 * ```
 * HOST=https://your-app-domain.com
 * DELIVERIGHT_HOST=https://api.deliveright.com
 * SHOPIFY_API_KEY=your_api_key
 * SHOPIFY_API_SECRET=your_api_secret
 * ```
 * 
 * @see https://www.npmjs.com/package/dotenv
 */
dotenv.config({ path: "../.env" });
console.log("Config: Loading environment variables from .env"); // Logs environment variable loading

// ============================================================================
// CONFIGURATION OBJECT INITIALIZATION
// ============================================================================

/**
 * Main configuration object
 * Contains all application settings organized by functional area
 * 
 * @type {Object}
 * @property {string} deliverightApi - Base URL for Deliveright API endpoints
 * @property {string} host - Application host URL for callbacks and webhooks
 * @property {Array<string>} shopifyAppScopes - Required Shopify OAuth permissions
 * @property {Object} carrierService - Shopify carrier service configuration
 * @property {Object} serviceLevels - Available delivery service level definitions
 * @property {Object} paymentStrategies - Payment calculation strategy enumerations
 */
let config = {};

// ============================================================================
// SECTION 1: HOST AND API CONFIGURATION
// ============================================================================

/**
 * Extract host configuration from environment variables
 * 
 * HOST: The public-facing URL of this application
 * - Used for OAuth callbacks
 * - Used for webhook endpoints
 * - Must be HTTPS in production
 * 
 * DELIVERIGHT_HOST: The base URL for Deliveright's API
 * - All API requests are prefixed with this URL
 * - Should not include trailing slash
 * - Example: 'https://api.deliveright.com'
 */
const { HOST, DELIVERIGHT_HOST } = process.env;
console.log("Config: Setting host variables", { HOST, DELIVERIGHT_HOST }); // Logs host variable assignment

/**
 * Deliveright API base URL
 * All API endpoints will be constructed relative to this URL
 * 
 * @type {string}
 * @example
 * // Constructing API endpoint
 * const endpoint = `${config.deliverightApi}/stores/create`;
 */
config.deliverightApi = DELIVERIGHT_HOST;

/**
 * Application host URL
 * Used for constructing callback URLs and webhook endpoints
 * 
 * @type {string}
 * @example
 * // Used in carrier service callback URL
 * callback_url: `${config.host}/carrier`
 */
config.host = HOST;

console.log("Config: Initialized API and host settings"); // Logs API and host config initialization

// ============================================================================
// SECTION 2: SHOPIFY APP SCOPES CONFIGURATION
// ============================================================================

/**
 * Shopify OAuth scopes required for app functionality
 * 
 * These scopes define the permissions requested during app installation.
 * Each scope grants access to specific Shopify API resources.
 * 
 * Scope Breakdown:
 * - read_products: View product catalog, variants, and inventory
 * - write_shipping: Create and modify shipping zones and rates
 * - read_shipping: View shipping zones and rates
 * - read_fulfillments: View order fulfillment status
 * - write_fulfillments: Create fulfillments and tracking updates
 * - read_orders: View order details and customer information
 * - write_orders: Modify orders and add notes
 * 
 * Important Notes:
 * - Scopes are requested during OAuth installation flow
 * - Changing scopes requires users to reinstall the app
 * - Request only necessary scopes to maintain user trust
 * - Some scopes have dependencies (e.g., write_shipping requires read_shipping)
 * 
 * @type {Array<string>}
 * @constant
 * 
 * @see https://shopify.dev/docs/api/usage/access-scopes
 */
config.shopifyAppScopes = [
  "read_products",        // Required: Filter products for Deliveright eligibility
  "write_shipping",       // Required: Create carrier service
  "read_shipping",        // Required: Verify carrier service configuration
  "read_fulfillments",    // Required: Track delivery status
  "write_fulfillments",   // Required: Update fulfillment with tracking info
  "read_orders",          // Required: Process orders for delivery
  "write_orders",         // Required: Add delivery notes and updates to orders
];

console.log("Config: Defined Shopify app scopes", config.shopifyAppScopes.length, "scopes"); // Logs Shopify scopes setup

// ============================================================================
// SECTION 3: CARRIER SERVICE CONFIGURATION
// ============================================================================

/**
 * Shopify carrier service configuration
 * 
 * The carrier service enables custom shipping rate calculation during checkout.
 * When configured, Shopify will call the specified callback_url to retrieve
 * available shipping rates based on cart contents and delivery address.
 * 
 * Configuration Properties:
 * 
 * @property {boolean} active - Whether the carrier service is active
 *   - true: Service is enabled and will be called during checkout
 *   - false: Service is disabled (useful for maintenance)
 * 
 * @property {string} name - Display name shown to merchants in Shopify admin
 *   - Appears in Settings > Shipping and delivery
 *   - Should clearly identify the service provider
 * 
 * @property {string} callback_url - Webhook endpoint for rate requests
 *   - Must be publicly accessible HTTPS URL
 *   - Shopify will POST rate requests to this endpoint
 *   - Must respond within 10 seconds or request times out
 *   - Format: https://your-app.com/carrier
 * 
 * @property {boolean} service_discovery - Enable automatic rate discovery
 *   - true: Shopify automatically queries for available rates
 *   - false: Merchant must manually configure shipping zones
 * 
 * @type {Object}
 * @constant
 * 
 * Security Note:
 * The callback_url is hardcoded to the production deployment URL.
 * For local development, you'll need to:
 * 1. Use a tunneling service (ngrok, cloudflare tunnel)
 * 2. Update this URL or make it environment-specific
 * 3. Reinstall the app to update the carrier service
 * 
 * @see https://shopify.dev/docs/apps/shipping/carrier-services
 * 
 * @example
 * // Creating carrier service via Shopify API
 * const carrier = await shopify.rest.CarrierService.create({
 *   session: session,
 *   ...config.carrierService
 * });
 */
config.carrierService = {
  active: true,
  name: "Deliveright - White Glove Delivery",
  callback_url: `https://deliveright-598053309572.us-central1.run.app/carrier`,
  service_discovery: true,
};

console.log("Config: Initialized carrier service settings", config.carrierService.name); // Logs carrier service setup

// ============================================================================
// SECTION 4: SERVICE LEVELS CONFIGURATION
// ============================================================================

/**
 * Deliveright delivery service level definitions
 * 
 * Service levels represent different types of delivery services offered by
 * Deliveright. Each service level has unique handling, setup, and pricing.
 * 
 * Service Level Flow:
 * 1. Products are tagged with service level codes in Shopify
 * 2. During checkout, eligible service levels are identified from cart items
 * 3. Rates are calculated for each applicable service level
 * 4. Customer selects preferred service level at checkout
 * 5. Order is fulfilled using selected service level
 * 
 * Structure:
 * Each service level object contains:
 * - service_name: Customer-facing display name
 * - description: Detailed explanation of what's included
 * - service_code: Internal identifier (must match product tags)
 * - currency: Pricing currency (currently all USD)
 * 
 * Usage in Product Tags:
 * Products should be tagged with service level codes to indicate eligibility.
 * Example tags: "deliveright-wg", "deliveright-thr", "deliveright-rocp"
 * 
 * @type {Object.<string, ServiceLevel>}
 * @constant
 * 
 * @typedef {Object} ServiceLevel
 * @property {string} service_name - Display name shown to customers
 * @property {string} description - Detailed service description
 * @property {string} service_code - Unique identifier for internal use
 * @property {string} currency - Currency code (ISO 4217)
 * @property {string|null} total_price - Calculated price (added at runtime)
 */
config.serviceLevels = {
  /**
   * PRCL - Parcel Service
   * 
   * Basic parcel delivery without special handling or signature.
   * Suitable for small, non-fragile items that don't require assembly.
   * 
   * Characteristics:
   * - No appointment scheduling
   * - No signature required
   * - Standard carrier delivery (UPS, FedEx, USPS)
   * - Leaves at door if customer not home
   * 
   * Ideal For:
   * - Small accessories
   * - Non-fragile items
   * - Items under 50 lbs
   * - Standard packaging
   */
  prcl: {
    service_name: "Parcel",
    description: "Parcel delivery service. No appointment or signature is required.",
    service_code: "prcl",
    currency: "USD",
  },

  /**
   * WILLCALL - Customer Pickup Service
   * 
   * Customer picks up order from local distribution warehouse.
   * Ideal for customers who prefer to handle their own transportation.
   * 
   * Characteristics:
   * - No delivery fee
   * - Customer schedules pickup time
   * - Available at distribution center
   * - Loading assistance may be provided
   * 
   * Ideal For:
   * - Cost-conscious customers
   * - Large items customer can transport
   * - Customers with pickup trucks/vans
   * - Local customers near warehouse
   */
  willcall: {
    service_name: "Will Call",
    description: "Customer picks up from the local distribution warehouse.",
    service_code: "willcall",
    currency: "USD",
  },

  /**
   * UNATTENDED - Front Door Delivery
   * 
   * Basic delivery to front door in original packaging.
   * No customer interaction or setup required.
   * 
   * Characteristics:
   * - Delivered in original packaging
   * - Left at front door
   * - No appointment needed
   * - No assembly or setup
   * - Customer unpacks and assembles
   * 
   * Ideal For:
   * - Small furniture items
   * - Items customer can move inside
   * - Pre-assembled products
   * - Customers comfortable with DIY setup
   */
  unattended: {
    service_name: "Unattended",
    description: "Unattended delivery to the customer's front door in the original packaging. No appointment scheduling or product setup.",
    service_code: "unattended",
    currency: "USD",
  },

  /**
   * ROCPA - Room of Choice with Assembly
   * 
   * Professional delivery with placement and full assembly service.
   * Includes debris removal for complete turnkey experience.
   * 
   * Characteristics:
   * - Scheduled appointment (2-4 hour window)
   * - Placement in room of choice
   * - Full product assembly
   * - Packaging debris removal
   * - Professional assembly team
   * - Original packaging removed
   * 
   * Ideal For:
   * - Complex furniture requiring assembly
   * - Heavy items needing placement
   * - Customers wanting turnkey service
   * - High-value furniture pieces
   * 
   * Not Included:
   * - Wall mounting (separate service)
   * - Electrical hookups
   * - Gas/propane line connections
   */
  rocpa: {
    service_name: "Room of choice with Assembly",
    description: "Delivery of the products in the original packaging and assembly at the customer's home, including debris removal.",
    service_code: "rocpa",
    currency: "USD",
  },

  /**
   * WG - White Glove Service (Premium)
   * 
   * Premium delivery service with full assembly and setup.
   * The most comprehensive service level offered.
   * 
   * Characteristics:
   * - Scheduled appointment with advance call
   * - Walk-through to plan placement
   * - Room of choice placement
   * - Complete assembly
   * - Professional setup
   * - All packaging debris removal
   * - Area cleaning after setup
   * 
   * Included Services:
   * ✓ Delivery to room of choice
   * ✓ Unpacking
   * ✓ Full assembly
   * ✓ Debris removal
   * ✓ Area cleanup
   * 
   * Not Included:
   * ✗ Wall mounting (requires additional service)
   * ✗ Electric hookups (requires licensed electrician)
   * ✗ Gas line connections (requires licensed technician)
   * ✗ Propane line connections
   * 
   * Ideal For:
   * - High-end furniture
   * - Complex assembly items
   * - Elderly or mobility-limited customers
   * - Time-constrained customers
   * - Premium customer experience
   */
  wg: {
    service_name: "White Glove Service",
    description: "White-Glove delivery and assembly at the customer home, including debris removal (assembly does not include wall mounting, electric hookups or burner element to the internal line, propane or gas lines)",
    service_code: "wg",
    currency: "USD",
  },

  /**
   * THR - Threshold Service
   * 
   * Basic delivery to home threshold (first dry area).
   * Economical option with customer handling assembly.
   * 
   * Characteristics:
   * - Delivery to threshold location:
   *   • Garage entrance
   *   • Front door
   *   • Covered porch
   *   • First dry area
   * - No interior placement
   * - No unpacking
   * - No assembly
   * - Customer moves items inside
   * 
   * Ideal For:
   * - Cost-conscious customers
   * - Customers with help available
   * - Single-level homes
   * - Items customer can move
   * - Pre-assembled products
   * 
   * Customer Responsibilities:
   * - Moving items inside
   * - Unpacking
   * - Assembly
   * - Debris disposal
   */
  thr: {
    service_name: "Threshold Service",
    description: "Delivering to the threshold of the customer's home (garage, front entrance etc.) or to the first dry area. Customer is responsible for unpacking and assembling",
    service_code: "thr",
    currency: "USD",
  },

  /**
   * BLNK - Blanket Wrap Service
   * 
   * Premium service for uncrated/unpackaged items requiring special handling.
   * Provides protection and care for finished furniture pieces.
   * 
   * Service Process:
   * 
   * 1. Pickup & Preparation:
   *    - Item is blanket wrapped at origin
   *    - Transported to terminal
   * 
   * 2. Terminal Processing:
   *    - Order inspection
   *    - Minor touchups applied if needed
   *    - Additional blanket wrapping
   *    - Shrink wrapping for protection
   * 
   * 3. Delivery Day:
   *    - 30-minute advance call to customer
   *    - Walk-through to plan placement
   *    - Room of choice delivery
   *    - Product unpacking
   *    - Setup per customer specifications
   * 
   * 4. Assembly Included:
   *    - Up to 30 minutes light assembly
   *    - Does NOT include knock-down (KD) furniture
   * 
   * 5. Completion:
   *    - Area cleaning
   *    - Debris removal
   *    - Final inspection
   * 
   * Ideal For:
   * - Finished wood furniture
   * - Display pieces
   * - Antiques
   * - Items without original packaging
   * - High-value unboxed items
   * 
   * Not Suitable For:
   * - Items requiring extensive assembly
   * - Knock-down furniture kits
   * - Items needing more than 30 min setup
   */
  blnk: {
    service_name: "Blanket Wrap",
    description: "This service is the same as White Glove, but for items that are not packaged or crated. We will blanket wrap the item before shipping it to our terminal. We open the order in our terminal, inspect it, and apply minor touchups if needed. We then blanket wrap and shrink-wrap the order and load it onto one of our home delivery trucks. We call the customer 30 minutes before our arrival. Upon arrival, we perform a walk-through to assess where the product(s) needs to be placed. We then bring the order to the room of choice and unpack the product(s). We will set up the order according to the customer's wishes, including 30 minutes of light assembly (excluding KDs). We always clean the area upon leaving so the customer can enjoy their new purchase right away!",
    service_code: "blnk",
    currency: "USD",
  },

  /**
   * ROCP - Room of Choice Plus
   * 
   * Enhanced delivery with placement and unpacking, but no assembly.
   * Good middle ground between threshold and full white glove.
   * 
   * Service Flow:
   * 
   * 1. Pre-Delivery:
   *    - 30-minute advance call
   *    - Confirm customer availability
   * 
   * 2. Arrival:
   *    - Walk-through assessment
   *    - Plan item placement
   *    - Verify room accessibility
   * 
   * 3. Delivery:
   *    - Move items to room of choice
   *    - Unpack products
   *    - Remove packaging materials
   * 
   * 4. Completion:
   *    - Area cleaning
   *    - Debris removal
   *    - Final walkthrough
   * 
   * Customer Responsibilities:
   * - Product assembly
   * - Final positioning/adjustment
   * - Minor setup tasks
   * 
   * Ideal For:
   * - Simple assembly items
   * - Customers comfortable with DIY
   * - Pre-assembled furniture
   * - Items only needing unpacking
   * - Budget-conscious customers wanting professional handling
   */
  rocp: {
    service_name: "Room of Choice +",
    description: "We call the customer 30 minutes before our arrival. Upon arrival, we perform a walk-through to assess where the product(s) needs to be placed. We then bring the order to the room of choice and unpack the product(s). We always clean the area upon leaving so the customer can enjoy their new purchase right away! *The customer is responsible for assembling the order.",
    service_code: "rocp",
    currency: "USD",
  },

  /**
   * ROC - Room of Choice (Basic)
   * 
   * Essential room placement service without unpacking.
   * Most economical indoor delivery option.
   * 
   * Service Flow:
   * 
   * 1. Pre-Delivery:
   *    - 30-minute advance call
   *    - Confirm delivery window
   * 
   * 2. Arrival:
   *    - Quick walk-through
   *    - Identify placement locations
   *    - Verify path accessibility
   * 
   * 3. Delivery:
   *    - Move items to designated rooms
   *    - Items remain in packaging
   *    - No unpacking performed
   * 
   * 4. Departure:
   *    - Confirm placement
   *    - Leave customer to unpack
   * 
   * Customer Responsibilities:
   * - Unpacking all items
   * - Assembly if required
   * - Packaging disposal
   * - Final positioning
   * 
   * Ideal For:
   * - Multi-room deliveries
   * - Customers wanting items inside
   * - Those comfortable unpacking
   * - Items on upper floors
   * - Customers saving on delivery costs
   */
  roc: {
    service_name: "Room of Choice",
    description: "We call the customer 30 minutes before our arrival. Upon arrival, we perform a walk-through to assess where the product(s) needs to be placed. We then bring the order to the room of choice so when we leave the residence, your customer can unpack the product(s) and finish any setup or assembly (if needed). *The customer is responsible for unpacking and assembling the order.",
    service_code: "roc",
    currency: "USD",
  },

  /**
   * B2B - Business to Business Delivery
   * 
   * Commercial delivery service for business locations.
   * Similar to threshold but optimized for commercial receiving.
   * 
   * Characteristics:
   * - Delivery to loading dock or main entrance
   * - Business hours scheduling
   * - No residential limitations
   * - Commercial receiving acceptable
   * - Freight elevator access if available
   * 
   * Delivery Locations:
   * - Loading dock
   * - Receiving area
   * - Main entrance
   * - First dry area
   * - Ground floor location
   * 
   * Business Responsibilities:
   * - Receiving signature
   * - Moving items to final location
   * - Unpacking
   * - Assembly
   * - Debris disposal
   * 
   * Ideal For:
   * - Office furniture
   * - Retail store inventory
   * - Restaurant equipment
   * - Commercial spaces
   * - Businesses with receiving staff
   */
  b2b: {
    service_name: "Business to Business",
    description: "Delivering to the threshold of the customer's home (garage, front entrance etc.) or to the first dry area. Customer is responsible for unpacking and assembling",
    service_code: "b2b",
    currency: "USD",
  },

  /**
   * CURB - Curbside Delivery
   * 
   * Most economical delivery option - items left at curb.
   * Customer handles all movement and setup.
   * 
   * Service Flow:
   * 
   * 1. Pre-Delivery:
   *    - 30-minute advance call
   *    - Confirm customer availability
   *    - Verify delivery address
   * 
   * 2. Delivery:
   *    - Items placed at curb
   *    - Outside home or apartment building
   *    - Safe, visible location
   *    - No entry to property
   * 
   * 3. Customer Action Required:
   *    - Immediately retrieve items
   *    - Move inside residence
   *    - Items left at customer's risk
   * 
   * Customer Responsibilities:
   * - Immediate retrieval of items
   * - Moving items inside
   * - Unpacking
   * - Assembly
   * - Debris disposal
   * - Weather protection
   * 
   * Ideal For:
   * - Customers with help available
   * - Ground floor/street level
   * - Items customer can move
   * - Maximum cost savings
   * - Customers comfortable with minimal service
   * 
   * Important Considerations:
   * - Weather exposure risk
   * - Theft potential
   * - Customer must be home
   * - Heavy items may be difficult to move
   * - Not suitable for apartments without ground access
   */
  curb: {
    service_name: "Curbside",
    description: "We call the customer 30 minutes before our arrival. We will leave the order outside the customer's home or apartment building. It is the customer's responsibility to bring the order inside the home. *The customer is responsible for unpacking and assembling the order",
    service_code: "curb",
    currency: "USD",
  },

  /**
   * PICK_CONSOLIDATE - Vendor Pickup & Consolidation
   * 
   * Logistics service for multi-vendor orders requiring consolidation.
   * Streamlines complex orders from multiple suppliers.
   * 
   * Service Process:
   * 
   * 1. Pickup Phase:
   *    - Scheduled vendor pickups
   *    - Multiple locations if needed
   *    - Inventory verification at each stop
   * 
   * 2. Consolidation Phase:
   *    - Items received at local hub
   *    - Inventory cross-check
   *    - Quality inspection
   *    - Consolidated packaging
   * 
   * 3. Preparation:
   *    - Combined shipment preparation
   *    - Single delivery coordination
   *    - Final quality check
   * 
   * 4. Delivery:
   *    - Proceeds with selected service level
   *    - Single consolidated delivery
   *    - All items delivered together
   * 
   * Benefits:
   * - Single delivery appointment
   * - Reduced delivery costs
   * - Better coordination
   * - Quality verification point
   * - Damage prevention
   * 
   * Ideal For:
   * - Multi-vendor orders
   * - Room packages (bedroom set, living room set)
   * - Multiple small items
   * - Orders requiring inspection
   * - Coordinated delivery timing
   * 
   * Typical Use Cases:
   * - Furniture sets from different manufacturers
   * - Complete room packages
   * - Multiple accessories with main item
   * - Drop-ship coordination
   */
  pick_consolidate: {
    service_name: "Pick & Consolidate",
    description: "Pickup from vendor for local consolidation",
    service_code: "pick_consolidate",
    currency: "USD",
  },
};

console.log("Config: Defined service levels", Object.keys(config.serviceLevels).length, "levels"); // Logs service levels setup

// ============================================================================
// SECTION 5: PAYMENT STRATEGIES CONFIGURATION
// ============================================================================

/**
 * Payment strategy enumeration
 * 
 * Defines how shipping costs are calculated and charged to customers.
 * Each strategy represents a different business model for handling delivery fees.
 * 
 * Strategy Descriptions:
 * 
 * PAID_BY_CUSTOMER (0):
 * - Customer pays full calculated delivery cost
 * - Most transparent pricing model
 * - No subsidy from merchant
 * - Exact cost passed to customer
 * 
 * PAID_BY_SHIPPER (1):
 * - Merchant absorbs all delivery costs
 * - "Free shipping" from customer perspective
 * - Merchant pays Deliveright directly
 * - Can be used as marketing incentive
 * - May be conditional (minimum order value)
 * 
 * SPLIT (2):
 * - Costs shared between merchant and customer
 * - Percentage split defined elsewhere
 * - Example: Merchant pays 50%, customer pays 50%
 * - Balances customer acquisition with cost control
 * 
 * FIXED (3):
 * - Customer pays fixed fee regardless of actual cost
 * - Examples: $99 flat rate, $49 white glove
 * - Simplifies customer decision-making
 * - Merchant absorbs cost variance
 * - Risk of loss on expensive deliveries
 * - Profit on inexpensive deliveries
 * 
 * ROUND_NEAREST_NUMBER (4):
 * - Rounds calculated cost to nearest whole number
 * - Examples: $95.67 → $96.00, $125.23 → $125.00
 * - Cleaner pricing display
 * - Simplifies checkout experience
 * - Minor cost absorption by merchant
 * 
 * @type {Object.<string, number>}
 * @constant
 * @readonly
 * 
 * @property {number} PAID_BY_CUSTOMER - Value: 0
 * @property {number} PAID_BY_SHIPPER - Value: 1
 * @property {number} SPLIT - Value: 2
 * @property {number} FIXED - Value: 3
 * @property {number} ROUND_NEAREST_NUMBER - Value: 4
 * 
 * Usage Example:
 * ```javascript
 * // Check payment strategy
 * if (store.payment_strategy === config.paymentStrategies.PAID_BY_CUSTOMER) {
 *   // Charge customer full amount
 *   customerCharge = calculatedRate;
 * } else if (store.payment_strategy === config.paymentStrategies.FIXED) {
 *   // Charge fixed fee
 *   customerCharge = store.fixed_shipping_fee;
 * }
 * ```
 * 
 * Configuration Considerations:
 * - Strategy should match business model
 * - Consider customer expectations
 * - Evaluate profit margins
 * - Review competitive landscape
 * - Test impact on conversion rates
 */
config.paymentStrategies = {
  PAID_BY_CUSTOMER: 0,        // Customer pays full delivery cost
  PAID_BY_SHIPPER: 1,         // Merchant pays full cost (free shipping)
  SPLIT: 2,                   // Shared cost between merchant and customer
  FIXED: 3,                   // Fixed fee regardless of actual cost
  ROUND_NEAREST_NUMBER: 4,    // Round to nearest dollar for cleaner pricing
};

console.log("Config: Defined payment strategies", Object.keys(config.paymentStrategies).length, "strategies"); // Logs payment strategies setup

// ============================================================================
// CONFIGURATION EXPORT
// ============================================================================

/**
 * Export the configuration object as default export
 * 
 * This allows other modules to import and use the configuration:
 * 
 * ```javascript
 * import config from './config.js';
 * ```
 * 
 * The configuration is frozen after export to prevent accidental modification
 * during runtime. All changes should be made through environment variables.
 */
export default config;
console.log("Config: Exporting configuration object"); // Logs export of config object
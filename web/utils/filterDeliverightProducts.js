/**
 * @fileoverview Product Filtering and Tag Analysis Utility
 *
 * This module filters cart items to identify which products are eligible for
 * Deliveright shipping services. Eligibility is determined by product tags
 * that match configured service level codes (e.g., 'wg', 'rocpa').
 *
 * Workflow:
 * 1. Extract product IDs from cart items
 * 2. Fetch product details (including tags) from Shopify GraphQL API
 * 3. Filter products that contain valid service level tags
 * 4. Attach relevant tags to the items for rate calculation
 *
 * @module utils/filterDeliverightProducts
 * @requires ../config
 * @requires node-fetch
 * @requires @shopify/shopify-api
 *
 * @author Deliveright Development Team
 * @version 1.0.0
 */

import config from "../config.js";
import fetch from 'node-fetch';
import { LATEST_API_VERSION } from '@shopify/shopify-api'; // You can adjust the version if needed

/**
 * List of valid service level codes from configuration
 * Used to validate product tags
 *
 * @constant {Array<string>}
 */
const level_codes = Object.keys(config.serviceLevels)
console.log("filterDeliverightProducts: Initialized service level codes", level_codes.length); // Logs service level codes initialization

/**
 * Filter tags to keep only valid service level codes
 *
 * @function productFilterTags
 * @param {Object} p - Product object
 * @param {number} p.product_id - Product ID
 * @param {Array<string>} p.tags - Product tags
 * @returns {Object} Product with filtered tags
 */
let productFilterTags = (p) => {
    console.log("productFilterTags: Filtering tags for product ID", p.product_id); // Logs tag filtering start
    const tags = p.tags
    let new_tags = tags.filter(s => level_codes.includes(s))
    console.log("productFilterTags: Filtered tags", new_tags); // Logs filtered tags
    return {...p, tags: new_tags}
}

/**
 * Higher-order function to attach tags to cart items
 *
 * @function addServiceTags
 * @param {Array<Object>} products - List of products with tags
 * @returns {Function} Mapper function for cart items
 */
let addServiceTags = (products) => {
    return (item) => {
        console.log("addServiceTags: Adding tags to item with product ID", item.product_id); // Logs tag addition
        let product = products.find(p => p.product_id === item.product_id)
        console.log("addServiceTags: Tags added", product?.tags || []); // Logs added tags
        return {...item, tags: product.tags}
    }
}

/**
 * Fetch product details from Shopify via GraphQL
 *
 * Retrieves product tags for a list of product IDs using the Admin GraphQL API.
 * This is necessary because cart items in the checkout webhook might not
 * include all tags needed for service level determination.
 *
 * @async
 * @function getProducts
 * @param {Object} session - Shopify session
 * @param {Array<number>} productIds - List of product IDs to fetch
 * @returns {Promise<Array<Object>>} List of products with IDs and tags
 */
async function getProducts(session, productIds) {
    console.log("getProducts: Fetching products for shop", session.shop); // Logs product fetch start
    const shop = session.shop; // Shopify store domain (e.g., 'your-store.myshopify.com')
    const accessToken = session.accessToken; // The access token for the authenticated session

    // Build the GraphQL query to fetch products by IDs and their tags
    const query = `
    query getProducts($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product {
          id
          tags
        }
      }
    }
  `;


    /**
     * Convert numeric product ID to Shopify Global ID format
     *
     * @param {number} id - Numeric Product ID
     * @returns {string} Global ID (gid://shopify/Product/...)
     */
    function toGlobalId(id) {
        console.log("toGlobalId: Converting product ID to global ID", id); // Logs ID conversion
        return `gid://shopify/Product/${id}`;
    }

    /**
     * Extract numeric ID from Shopify Global ID
     *
     * @param {string} globalId - Global ID string
     * @returns {number|null} Numeric ID or null if invalid
     */
    function fromGlobalId(globalId) {
        console.log("fromGlobalId: Extracting numeric ID from global ID", globalId); // Logs ID extraction
        const match = globalId.match(/Product\/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }

    // Map productIds to their corresponding global IDs
    console.log("getProducts: Converting product IDs to global IDs", productIds); // Logs ID conversion start
    const globalProductIds = productIds.map(toGlobalId);

    // Construct the GraphQL variables
    const variables = {
        ids: globalProductIds,
    };

    // Send the GraphQL request to Shopify's Admin API
    console.log("getProducts: Sending GraphQL request for products"); // Logs GraphQL request
    const response = await fetch(`https://${shop}/admin/api/${LATEST_API_VERSION}/graphql.json`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken, // Access token for authentication
        },
        body: JSON.stringify({ query, variables }),
    });

    // Check if the response is successful
    console.log("getProducts: Received response, status", response.status); // Logs response status
    if (!response.ok) {
        const error = await response.text();
        console.error("getProducts: Failed to fetch products", error); // Logs fetch error
        throw new Error(`Failed to fetch products: ${error}`);
    }

    // Parse the response and return the data
    const data = await response.json();
    console.log("getProducts: Processing product data", data.data.nodes.length); // Logs product data processing
    return data.data.nodes.map((product) => ({
        product_id: fromGlobalId(product.id),
        tags: product.tags,
    }));
}

/**
 * Filter items for Deliveright eligibility and attach service tags
 *
 * Main entry point for the module. Filters a list of cart items, keeping only
 * those that are eligible for Deliveright services (based on tags).
 *
 * @async
 * @param {Object} shopify - Shopify app instance
 * @param {Object} session - Shopify session
 * @param {Array<Object>} items - Cart items to filter
 * @returns {Promise<Array<Object>>} Filtered list of eligible items with tags
 */
export default async (shopify, session, items) => {
    console.log("filterDeliverightProducts: Starting product filtering for", items.length, "items"); // Logs filtering start
    let product_ids = items.map(p => p.product_id)
    console.log("filterDeliverightProducts: Extracted product IDs", product_ids); // Logs extracted IDs
    let products = (await getProducts(session, product_ids))
    console.log("filterDeliverightProducts: Retrieved products", products.length); // Logs retrieved products
    if (!products) {
        console.warn("filterDeliverightProducts: No products retrieved, returning empty array"); // Logs no products case
        return []
    }
    products.map(productFilterTags).filter(p => p.tags.length > 0)
    console.log("filterDeliverightProducts: Filtered products with valid tags", products.length); // Logs filtered products
    let filtered_ids = products.map(p => p.product_id)
    console.log("filterDeliverightProducts: Filtered product IDs", filtered_ids); // Logs filtered IDs
    
    return items.filter(p => filtered_ids.includes(p.product_id)).map(addServiceTags(products))
}
console.log("filterDeliverightProducts: Exporting product filtering function"); // Logs function export
import config from "../config.js";
import fetch from 'node-fetch';
import { LATEST_API_VERSION } from '@shopify/shopify-api'; // You can adjust the version if needed

const level_codes = Object.keys(config.serviceLevels)
console.log("filterDeliverightProducts: Initialized service level codes", level_codes.length); // Logs service level codes initialization

let productFilterTags = (p) => {
    console.log("productFilterTags: Filtering tags for product ID", p.product_id); // Logs tag filtering start
    const tags = p.tags
    let new_tags = tags.filter(s => level_codes.includes(s))
    console.log("productFilterTags: Filtered tags", new_tags); // Logs filtered tags
    return {...p, tags: new_tags}
}
let addServiceTags = (products) => {
    return (item) => {
        console.log("addServiceTags: Adding tags to item with product ID", item.product_id); // Logs tag addition
        let product = products.find(p => p.product_id === item.product_id)
        console.log("addServiceTags: Tags added", product?.tags || []); // Logs added tags
        return {...item, tags: product.tags}
    }
}

// Function to get products and their tags using GraphQL
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


    // Function to convert a numeric product ID to a global ID format
    function toGlobalId(id) {
        console.log("toGlobalId: Converting product ID to global ID", id); // Logs ID conversion
        return `gid://shopify/Product/${id}`;
    }

    // Function to extract the numeric ID from a global ID
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
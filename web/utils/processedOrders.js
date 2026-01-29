/**
 * @fileoverview Order Deduplication and Processing Tracker
 *
 * This module manages the tracking of processed orders to prevent duplicate
 * submissions to Deliveright. It uses a local SQLite database to store
 * pairs of (shop_domain, order_id).
 *
 * Why this is needed:
 * Shopify webhooks can be delivered multiple times for the same event (at-least-once delivery).
 * This utility ensures that each order is processed exactly once by the integration.
 *
 * Database Schema:
 * Table: processed_orders
 * - shop: TEXT (Shopify domain)
 * - order_id: TEXT (Shopify order ID)
 * - PRIMARY KEY: (shop, order_id)
 *
 * @module utils/processedOrders
 * @requires sqlite3
 *
 * @author Deliveright Development Team
 * @version 1.0.0
 */

import sqlite3 from 'sqlite3'

/**
 * Path to SQLite database file
 * @constant {string}
 */
const DB_PATH = `${process.cwd()}/database.sqlite`
sqlite3.verbose()

/**
 * Database connection instance
 * @type {sqlite3.Database}
 */
const db = new sqlite3.Database(DB_PATH)

// Ensure table exists
const INIT_SQL = `CREATE TABLE IF NOT EXISTS processed_orders(
    shop TEXT NOT NULL,
    order_id TEXT NOT NULL,
    PRIMARY KEY(shop, order_id)
)`

db.run(INIT_SQL)

/**
 * Check if an order is new and mark it as processed
 *
 * This function performs an atomic "insert if not exists" operation.
 *
 * Returns true if the order was successfully inserted (meaning it's new).
 * Returns false if the order was already in the database (duplicate).
 *
 * @function markIfNew
 * @param {string} shop - Shop domain
 * @param {string|number} orderId - Shopify Order ID
 * @returns {Promise<boolean>} True if order is new, False if already processed
 *
 * @example
 * const isNew = await markIfNew('shop.myshopify.com', '123456');
 * if (isNew) {
 *   // Process order...
 * } else {
 *   // Skip duplicate
 * }
 */
export function markIfNew(shop, orderId) {
    console.log("markIfNew: Marking order", orderId, "for shop", shop)
    return new Promise((resolve, reject) => {
        db.run(
            "INSERT INTO processed_orders(shop, order_id) VALUES (?, ?) ON CONFLICT DO NOTHING;",
            [shop, orderId],
            function (err) {
                if (err) {
                    console.error("markIfNew: Error marking order", err.message)
                    reject(err)
                } else {
                    resolve(this.changes > 0)
                }
            }
        )
    })
}
console.log("processedOrders: Exporting markIfNew function")

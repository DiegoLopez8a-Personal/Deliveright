import sqlite3 from 'sqlite3'

const DB_PATH = `${process.cwd()}/database.sqlite`
sqlite3.verbose()
const db = new sqlite3.Database(DB_PATH)

// Ensure table exists
const INIT_SQL = `CREATE TABLE IF NOT EXISTS processed_orders(
    shop TEXT NOT NULL,
    order_id TEXT NOT NULL,
    PRIMARY KEY(shop, order_id)
)`

db.run(INIT_SQL)

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

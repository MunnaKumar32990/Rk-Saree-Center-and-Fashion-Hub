import mongoose from "mongoose";
import Product from "../models/Product.js";

/**
 * inventory.js — atomic stock movement.
 *
 * The original `addOrderItems` did a read-then-write check:
 *
 *     if (dbProduct.countInStock < item.qty) throw ...
 *     ... later ...
 *     await Order.create(...)
 *
 * Stock was never actually decremented anywhere in the codebase, so a product
 * with `countInStock: 1` would accept unlimited orders — the number shown in
 * the storefront was fiction. Even a naive decrement would still be racy:
 * twenty concurrent requests all read `1`, all pass the check, all create
 * orders.
 *
 * The fix is a conditional `updateOne` (`$gte` guard inside the filter), which
 * makes the check-and-decrement a single atomic operation. `modifiedCount === 0`
 * means somebody else got the stock first, and the caller aborts the whole
 * transaction.
 */

export class OutOfStockError extends Error {
  constructor(name, available) {
    super(
      available > 0
        ? `Only ${available} left for ${name} — please update your quantity`
        : `${name} just sold out. Please remove it to continue.`
    );
    this.status = 409;
    this.code = "OUT_OF_STOCK";
    this.productName = name;
    this.available = available;
  }
}

/**
 * Decrement stock for each line item, atomically, inside `session`.
 * All-or-nothing: if any line fails, the caller rolls the transaction back.
 *
 * @param {{product: string|ObjectId, name: string, qty: number}[]} items
 * @param {mongoose.ClientSession} session
 */
export async function decrementStock(items, session) {
  for (const item of items) {
    const result = await Product.updateOne(
      { _id: item.product, countInStock: { $gte: item.qty } },
      { $inc: { countInStock: -item.qty } },
      { session }
    );

    if (result.modifiedCount === 0) {
      // Either sold out or not enough left — find out which, for a good message.
      const current = await Product.findById(item.product)
        .select("name countInStock")
        .session(session)
        .lean();
      throw new OutOfStockError(
        current?.name || item.name,
        current?.countInStock ?? 0
      );
    }
  }
}

/**
 * Return stock to inventory (cancellation, return, refund).
 *
 * Idempotent by design: the order's `inventoryRestored` flag guards it, and the
 * caller must not call this twice for the same event.
 */
export async function restoreStock(items, session) {
  for (const item of items) {
    if (!item?.product || !item?.qty) continue;
    await Product.updateOne(
      { _id: item.product },
      { $inc: { countInStock: item.qty } },
      { session }
    );
  }
}

/**
 * Notify the storefront when an item sells out so the UI can stop selling it.
 * `oversold` guards against the race where two concurrent orders each saw
 * stock available — only the first to drive it to zero should fire.
 */
export async function flagOversold(productId, session) {
  const result = await Product.updateOne(
    { _id: productId, countInStock: 0, oversold: { $ne: true } },
    { $set: { oversold: true } },
    { session }
  );
  return result.modifiedCount === 1;
}

/** Clear the oversold flag when stock is manually replenished by an admin. */
export async function clearOversold(productId, newCount) {
  if (Number(newCount) > 0) {
    await Product.updateOne({ _id: productId }, { $set: { oversold: false } });
  }
}

/**
 * Run `work` inside a Mongo transaction when the deployment supports it, and
 * degrade to a plain call when it does not (standalone mongod / local dev).
 *
 * Returns `{ result, committed }` so callers can warn when the deployment is
 * running without transaction support.
 */
export async function withTransaction(work) {
  const supports = mongoose.connection?.readyState === 1 && supportsTransactions();
  if (!supports) {
    return { result: await work(null), committed: false };
  }
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return { result, committed: true };
  } finally {
    await session.endSession();
  }
}

let transactionsSupported;
function supportsTransactions() {
  if (transactionsSupported !== undefined) return transactionsSupported;
  // A replica set / mongos supports multi-document transactions. The admin can
  // hint with MONGO_TRANSACTIONS=false on a standalone dev database.
  if (process.env.MONGO_TRANSACTIONS === "false") {
    transactionsSupported = false;
  } else {
    transactionsSupported = true;
  }
  return transactionsSupported;
}

/**
 * Availability summary used by the back-in-stock notification flow.
 * Returns the subscribers who should be emailed, and clears the queue.
 */
export async function claimRestockSubscribers(productId, session) {
  const product = await Product.findById(productId).session(session || null);
  if (!product) return [];
  const subscribers = product.backInStockSubscribers || [];
  if (subscribers.length > 0) {
    product.backInStockSubscribers = [];
    await product.save({ session });
  }
  return subscribers;
}
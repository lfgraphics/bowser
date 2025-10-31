"use strict";

import { getBowsersDatabaseConnection, getTransportDatabaseConnection, getUsersAndRolesDatabaseConnection } from "../../config/database.js";
import errorHandler from "./errorHandler.js";
const { logError } = errorHandler;

// Default transaction configuration
const defaultTxnOptions = Object.freeze({
  // readConcern/writeConcern ensure durability across replica set
  readConcern: { level: "majority" },
  writeConcern: { w: "majority", j: true },
  // NOTE: MongoDB driver doesn't accept maxTimeMS here; apply at operation level when needed
});

// Supported connection keys
const CONNECTIONS = Object.freeze({
  bowsers: getBowsersDatabaseConnection,
  transport: getTransportDatabaseConnection,
  users: getUsersAndRolesDatabaseConnection,
});

/**
 * Create a session for a specific logical connection
 * @param {"bowsers"|"transport"|"users"} key
 * @returns {Promise<import("mongodb").ClientSession>}
 */
async function createSession(key) {
  const connGetter = CONNECTIONS[key];
  if (!connGetter) throw new Error(`Unknown connection key: ${key}`);
  const conn = connGetter();
  // Use Mongoose's startSession method which returns a compatible session
  return conn.startSession();
}

/**
 * Get a map of sessions for the requested connections
 * @param {Array<"bowsers"|"transport"|"users">} connections
 */
async function createSessions(connections) {
  const sessions = {};
  for (const key of connections) {
    sessions[key] = await createSession(key);
  }
  return sessions;
}

/**
 * Start transactions for all provided sessions
 */
function startTransactions(sessions, txnOptions = defaultTxnOptions) {
  for (const s of Object.values(sessions)) {
    s.startTransaction(txnOptions);
  }
}

/**
 * Commit all sessions (best-effort 2PC style)
 */
async function commitAll(sessions) {
  for (const s of Object.values(sessions)) {
    await s.commitTransaction();
  }
}

/**
 * Abort all sessions
 */
async function abortAll(sessions) {
  for (const s of Object.values(sessions)) {
    try {
      await s.abortTransaction();
    } catch (e) {
      // swallow abort errors but log them
      logError(e, { scope: "transactions.abortAll" });
    }
  }
}

/**
 * End all sessions
 */
function endAll(sessions) {
  for (const s of Object.values(sessions)) {
    try {
      s.endSession();
    } catch (e) {
      logError(e, { scope: "transactions.endAll" });
    }
  }
}

/**
 * Execute a callback within transactions across multiple connections.
 * NOTE: This orchestrates multiple transactions in parallel but is NOT
 * a true distributed transaction; use judiciously.
 *
 * @param {Function} callback - async function receiving (sessions, context)
 * @param {Object} opts
 * @param {Array<"bowsers"|"transport"|"users">} [opts.connections] - which connections to include
 * @param {number} [opts.maxRetries] - number of retries on transient errors
 * @param {Object} [opts.txnOptions] - read/write concern options
 * @param {Object} [opts.context] - context info for logging
 */
async function withTransaction(callback, opts = {}) {
  const {
    connections = ["bowsers", "transport", "users"],
    maxRetries = 5, // Increased from 3 to 5 for better write conflict handling
    txnOptions = defaultTxnOptions,
    context = {},
    signal,
  } = opts;

  let attempt = 0;
  // Enhanced backoff with jitter for write conflicts
  const backoff = (n) => {
    const baseDelay = 50 * Math.pow(2, n); // Start with 50ms, exponential growth
    const jitter = Math.random() * 50; // Add 0-50ms random jitter to avoid thundering herd
    return new Promise((r) => setTimeout(r, baseDelay + jitter));
  };

  while (attempt < maxRetries) {
    attempt += 1;
    const attemptCtx = { ...context, attempt };
    const sessions = await createSessions(connections);
    let abortListenerAttached = false;
    let aborted = false;
    const abortError = () => {
      const e = new Error("Transaction aborted");
      e.code = "TXN_ABORTED";
      e.name = "AbortError";
      return e;
    };
    const onAbort = async () => {
      aborted = true;
      try {
        await abortAll(sessions);
      } catch (e) {
        // already handled in abortAll
      }
    };
    try {
      console.log(
        `[TXN] starting transactions for ${connections.join(",")} (attempt ${attempt})`
      );
      startTransactions(sessions, txnOptions);

      let result;
      if (signal) {
        if (signal.aborted) {
          await onAbort();
          throw abortError();
        }
        const abortPromise = new Promise((_, reject) => {
          const handler = async () => {
            await onAbort();
            reject(abortError());
          };
          signal.addEventListener("abort", handler, { once: true });
          // store removal
          abortListenerAttached = true;
          // ensure we remove the listener in finally
          sessions.__abortHandler = handler;
        });
        result = await Promise.race([callback(sessions, attemptCtx), abortPromise]);
        if (signal.aborted || aborted) {
          throw abortError();
        }
      } else {
        result = await callback(sessions, attemptCtx);
      }

      console.log(`[TXN] committing transactions (attempt ${attempt})`);
      await commitAll(sessions);
      return result;
    } catch (err) {
      logError(err, { severity: "error", scope: "transactions.withTransaction", ...attemptCtx });
      console.warn(`[TXN] aborting transactions (attempt ${attempt}) due to error: ${err?.message}`);
      await abortAll(sessions);

      // determine if transient
      const isTransient = isTransientTransactionError(err);
      endAll(sessions);
      if (isTransient && attempt < maxRetries) {
        // Log write conflict details for monitoring
        if (err.code === 112) {
          console.warn(`[TXN] Write conflict detected (attempt ${attempt}/${maxRetries}) for ${context?.route || 'unknown route'}, retrying with backoff...`);
        }
        await backoff(attempt - 1);
        continue;
      }
      // rethrow last error
      throw err;
    } finally {
      // ensure sessions are closed
      if (signal && abortListenerAttached && sessions.__abortHandler) {
        try {
          signal.removeEventListener("abort", sessions.__abortHandler);
        } catch (_) { }
      }
      endAll(sessions);
    }
  }
}

/**
 * Helper for complex flows when sessions are prepared externally
 */
async function executeInTransaction(sessions, fn, txnOptions = defaultTxnOptions) {
  startTransactions(sessions, txnOptions);
  try {
    const res = await fn(sessions);
    await commitAll(sessions);
    return res;
  } catch (err) {
    await abortAll(sessions);
    throw err;
  } finally {
    endAll(sessions);
  }
}

/**
 * Basic transient error classification for retries.
 */
function isTransientTransactionError(err) {
  const msg = String(err?.message || "");
  const code = err?.code;
  const labels = err?.errorLabels || [];
  return (
    labels.includes("TransientTransactionError") ||
    labels.includes("UnknownTransactionCommitResult") ||
    code === 112 || // WriteConflict
    code === 251 || // NoSuchTransaction
    /timed out|timeout|ETIMEDOUT|ECONNRESET|socket hang up/i.test(msg)
  );
}

// Named exports
export { createSession, withTransaction, executeInTransaction, defaultTxnOptions, isTransientTransactionError };

// Default export for backward compatibility
export default {
  createSession,
  withTransaction,
  executeInTransaction,
  defaultTxnOptions,
  isTransientTransactionError,
};

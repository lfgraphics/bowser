"use strict";

const util = require("util");

const Severity = Object.freeze({
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  fatal: "fatal",
});

/**
 * Format consistent error response objects
 * @param {Object} params
 * @param {number} [params.status=500]
 * @param {string} params.message
 * @param {any} [params.details]
 * @param {string} [params.code]
 */
function createErrorResponse({ status = 500, message, details, code }) {
  const body = { status, message };
  if (code) body.code = code;
  if (process.env.NODE_ENV !== "production" && details) {
    body.details = details;
  }
  return body;
}

/**
 * Classify common error types to map to HTTP codes and logging severity
 */
function classifyError(err) {
  // Mongoose/Mongo validation
  if (err?.name === "ValidationError") {
    return { status: 400, severity: Severity.warn, code: "VALIDATION_ERROR" };
  }
  if (err?.name === "MongoServerError" && err?.code === 11000) {
    return { status: 409, severity: Severity.warn, code: "DUPLICATE_KEY" };
  }
  if (err?.name === "CastError") {
    return { status: 400, severity: Severity.warn, code: "CAST_ERROR" };
  }
  // Network/timeout
  const msg = String(err?.message || "");
  if (/timeout|ETIMEDOUT|ECONNRESET|socket hang up/i.test(msg)) {
    return { status: 504, severity: Severity.error, code: "TIMEOUT" };
  }
  return { status: 500, severity: Severity.error, code: "INTERNAL" };
}

/**
 * Structured error logging
 * @param {Error} err
 * @param {Object} [context]
 */
function logError(err, context = {}) {
  const { severity = Severity.error, scope = "app" } = context;
  const base = {
    level: severity,
    scope,
    message: err?.message,
    name: err?.name,
    code: err?.code,
    labels: err?.errorLabels,
  };
  const serialized = util.inspect({ ...base, context }, { depth: 5, breakLength: 120 });
  if (severity === Severity.fatal || severity === Severity.error) {
    console.error(serialized, err?.stack);
  } else if (severity === Severity.warn) {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}

function handleTransactionError(err, context) {
  const classification = classifyError(err);
  logError(err, { ...context, severity: classification.severity, scope: "transaction" });
  return createErrorResponse({
    status: classification.status,
    message: err?.message || "Transaction failed",
    code: classification.code,
    details: err?.stack,
  });
}

module.exports = {
  Severity,
  createErrorResponse,
  classifyError,
  logError,
  handleTransactionError,
};

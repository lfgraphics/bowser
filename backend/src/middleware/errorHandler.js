"use strict";

const { createErrorResponse, classifyError, logError } = require("../utils/errorHandler");
const { randomUUID } = require("crypto");

// Request context middleware to add a requestId for correlation
function requestContext(req, _res, next) {
  req.requestId = req.headers["x-request-id"] || (randomUUID ? randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  req.requestStart = Date.now();
  next();
}

// Async handler wrapper to bubble errors to the central handler
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Central error handler
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const { status, severity, code } = classifyError(err);

  logError(err, {
    severity,
    scope: "http",
    requestId: req.requestId,
    path: req.originalUrl,
    method: req.method,
    durationMs: Date.now() - (req.requestStart || Date.now()),
    ip: req.ip,
  });

  const body = createErrorResponse({
    status,
    message: err?.message || "Internal server error",
    code,
    details: err?.stack,
  });

  res.status(status).json({ requestId: req.requestId, ...body });
}

module.exports = {
  requestContext,
  asyncHandler,
  errorHandler,
};

const mongoose = require('mongoose');
const { UsersAndRolesDatabaseConnection } = require('../../config/database');

const unauthorizedLoginSchema = new mongoose.Schema({
  userId: String,
  name: String,
  phoneNumber: String,
  registeredDeviceUUID: String,
  attemptedDeviceUUID: String,
  timestamp: { type: Date, default: Date.now, timezone: "Asia/Kolkata" },
});

module.exports = UsersAndRolesDatabaseConnection.model('UnAuthorizedLogin', unauthorizedLoginSchema, 'UnauthorizedLoginCollection');
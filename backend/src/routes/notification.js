// backend/notification.js
const admin = require("../firebase");

const sendNotification = (token, message) => {
  const payload = {
    notification: {
      title: message.title,
      body: message.body,
    },
  };

  return admin.messaging().sendToDevice(token, payload);
};

module.exports = { sendNotification };

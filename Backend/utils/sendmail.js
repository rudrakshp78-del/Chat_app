// 
const sgMail = require("@sendgrid/mail");

const apiKey = process.env.SENDGRID_API_KEY;

console.log("========== SENDGRID ==========");
console.log("API key exists:", !!apiKey);
console.log("API key starts SG:", apiKey?.startsWith("SG."));
console.log("API key length:", apiKey?.length);
console.log(
  "API key preview:",
  apiKey ? `${apiKey.slice(0, 5)}...${apiKey.slice(-4)}` : "MISSING"
);
console.log("FROM:", process.env.SENDGRID_FROM_EMAIL);
console.log("==============================");

sgMail.setApiKey(apiKey);

const sendSGMail = async ({ to, subject, html, text }) => {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    text,
    html,
  };

  try {
    const response = await sgMail.send(msg);

    console.log("✅ SendGrid:", response[0].statusCode);

    return response;
  } catch (error) {
    console.error(
      "❌ SendGrid error:",
      error.response?.body || error.message
    );

    throw error;
  }
};

module.exports = sendSGMail;

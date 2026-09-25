const sgMail = require("@sendgrid/mail");

console.log("Mailer key exists:", !!process.env.SENDGRID_API_KEY);
console.log("Mailer key prefix:", process.env.SENDGRID_API_KEY?.slice(0, 3));
console.log("Mailer key last 4:", process.env.SENDGRID_API_KEY?.slice(-4));

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendSGMail = async ({
  to,
  sender,
  subject,
  html,
  attachments,
  text,
}) => {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    html,
    text,
    attachments,
  };

  try {
    const response = await sgMail.send(msg);

    console.log("✅ SendGrid email sent");
    console.log("Status:", response[0]?.statusCode);

    return response;
  } catch (error) {
    console.error("❌ SENDGRID ERROR");
    console.error("Status:", error.code);
    console.error(
      "Response:",
      JSON.stringify(error.response?.body, null, 2)
    );

    throw error;
  }
};

exports.sendEmail = async (args) => {
  return sendSGMail(args);
};

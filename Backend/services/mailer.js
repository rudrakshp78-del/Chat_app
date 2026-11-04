const sgMail = require("@sendgrid/mail");
let nodemailer;
try {
  nodemailer = require("nodemailer");
} catch (e) {
  nodemailer = null;
}

console.log("Mailer SendGrid key exists:", !!process.env.SENDGRID_API_KEY);
if (process.env.SENDGRID_API_KEY) {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  } catch (err) {
    console.error("Failed to set SendGrid API key:", err.message);
  }
}

const getSmtpTransporter = () => {
  if (!nodemailer) return null;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });
  }

  return null;
};

const sendSGMail = async ({ to, subject, html, text, attachments }) => {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY not configured");
  }

  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "support@trackon.app";
  const msg = {
    to,
    from: fromEmail,
    subject,
    html,
    text,
    attachments,
  };

  try {
    const response = await sgMail.send(msg);
    console.log("✅ SendGrid email sent to", to, "Status:", response[0]?.statusCode);
    return response;
  } catch (error) {
    console.error("❌ SENDGRID ERROR:", error.code || error.message);
    if (error.response?.body) {
      console.error("Response body:", JSON.stringify(error.response.body));
    }
    throw error;
  }
};

const sendSmtpMail = async ({ to, subject, html, text, attachments }) => {
  const transporter = getSmtpTransporter();
  if (!transporter) {
    throw new Error("No SMTP transporter configured");
  }

  const fromEmail =
    process.env.SMTP_FROM ||
    process.env.GMAIL_USER ||
    process.env.SENDGRID_FROM_EMAIL ||
    "support@trackon.app";

  const info = await transporter.sendMail({
    from: fromEmail,
    to,
    subject,
    html,
    text,
    attachments,
  });

  console.log("✅ SMTP email sent to", to, "MessageId:", info.messageId);
  return info;
};

exports.sendEmail = async ({ to, sender, subject, html, attachments, text }) => {
  let lastError = null;

  // 1. Try SendGrid if API key is configured
  if (process.env.SENDGRID_API_KEY) {
    try {
      return await sendSGMail({ to, subject, html, text, attachments });
    } catch (err) {
      lastError = err;
      console.warn("⚠️ SendGrid sending failed, checking for SMTP fallback...");
    }
  }

  // 2. Try SMTP / Gmail fallback if configured
  const smtp = getSmtpTransporter();
  if (smtp) {
    try {
      return await sendSmtpMail({ to, subject, html, text, attachments });
    } catch (err) {
      lastError = err;
      console.error("❌ SMTP fallback sending failed:", err.message);
    }
  }

  // If no mail transport succeeded, throw last error or general error
  throw lastError || new Error("No mail transport available or email delivery failed");
};

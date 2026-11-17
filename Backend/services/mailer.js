const sgMail = require("@sendgrid/mail");
let nodemailer;
try {
  nodemailer = require("nodemailer");
} catch (e) {
  nodemailer = null;
}

if (process.env.SENDGRID_API_KEY) {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY.trim());
  } catch (err) {
    console.error("Failed to set SendGrid API key:", err.message);
  }
}

const getDefaultFrom = (preferredFrom) => {
  const from =
    preferredFrom ||
    process.env.MAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.BREVO_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    process.env.GMAIL_USER ||
    process.env.EMAIL_USER ||
    process.env.SENDGRID_FROM_EMAIL ||
    "support@trackon.app";

  return String(from).trim();
};

const parseFromAddress = (rawFrom) => {
  const str = String(rawFrom || "").trim();
  const match = str.match(/^(.*)<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^["']|["']$/g, "") || "Trackon Support",
      email: match[2].trim(),
    };
  }
  return {
    name: "Trackon Support",
    email: str || "support@trackon.app",
  };
};

const getSmtpTransporters = () => {
  if (!nodemailer) return [];

  const transporters = [];

  // 1. Custom SMTP Server
  const smtpHost = (process.env.SMTP_HOST || "").trim();
  const smtpUser = (process.env.SMTP_USER || "").trim();
  const smtpPass = (process.env.SMTP_PASS || "").trim();

  if (smtpHost && smtpUser && smtpPass) {
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const secure =
      process.env.SMTP_SECURE === "true" || port === 465;

    transporters.push({
      label: `SMTP (${smtpHost}:${port})`,
      transporter: nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        family: 4,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      }),
    });
  }

  // 2. Gmail with 16-character Google App Password
  const gmailUser = (process.env.GMAIL_USER || process.env.EMAIL_USER || "").trim();
  const gmailPass = String(process.env.GMAIL_PASS || process.env.EMAIL_PASS || "").replace(/\s+/g, "");

  if (gmailUser && gmailPass) {
    // Primary: SMTPS port 465 over IPv4 (most reliable on Render/cloud hosts)
    transporters.push({
      label: "Gmail SMTP (465)",
      transporter: nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        family: 4,
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      }),
    });

    // Secondary: STARTTLS port 587 over IPv4
    transporters.push({
      label: "Gmail SMTP (587)",
      transporter: nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        requireTLS: true,
        family: 4,
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      }),
    });
  }

  return transporters;
};

let cachedEtherealTransporter = null;
const getEtherealTransporter = async () => {
  if (!nodemailer) return null;
  if (cachedEtherealTransporter) return cachedEtherealTransporter;

  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedEtherealTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      connectionTimeout: 10000,
    });
    return cachedEtherealTransporter;
  } catch (err) {
    console.warn("⚠️ Could not create Ethereal test account:", err.message);
    return null;
  }
};

// Provider: Resend HTTPS API (Port 443 - never blocked by SMTP firewalls)
const sendResendMail = async ({ to, from, subject, html, text }) => {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const fromEmail =
    (process.env.RESEND_FROM_EMAIL || "").trim() ||
    from ||
    "Trackon <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(text ? { text } : {}),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(`Resend API error: ${errMsg}`);
  }

  console.log("✅ Resend email sent to", to, "ID:", data?.id);
  return { provider: "resend", messageId: data?.id };
};

// Provider: Brevo (Sendinblue) HTTPS API (Port 443 - 300 free emails/day)
const sendBrevoMail = async ({ to, from, subject, html, text }) => {
  const apiKey = (process.env.BREVO_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("BREVO_API_KEY not configured");
  }

  const sender = parseFromAddress(
    (process.env.BREVO_FROM_EMAIL || "").trim() ||
      (process.env.SENDGRID_FROM_EMAIL || "").trim() ||
      from
  );

  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({
    email: String(email).trim(),
  }));

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: recipients,
      subject,
      htmlContent: html,
      ...(text ? { textContent: text } : {}),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = data?.message || data?.code || `HTTP ${res.status}`;
    throw new Error(`Brevo API error: ${errMsg}`);
  }

  console.log("✅ Brevo email sent to", to, "MessageId:", data?.messageId);
  return { provider: "brevo", messageId: data?.messageId };
};

// Provider: SendGrid HTTPS API
const sendSGMail = async ({ to, from, subject, html, text, attachments }) => {
  const apiKey = (process.env.SENDGRID_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY not configured");
  }

  sgMail.setApiKey(apiKey);

  const fromEmail =
    (process.env.SENDGRID_FROM_EMAIL || "").trim() ||
    parseFromAddress(from).email ||
    "support@trackon.app";

  const msg = {
    to,
    from: fromEmail,
    subject,
    html,
    ...(text ? { text } : {}),
    ...(Array.isArray(attachments) && attachments.length > 0 ? { attachments } : {}),
  };

  try {
    const response = await sgMail.send(msg);
    console.log("✅ SendGrid email sent to", to, "Status:", response[0]?.statusCode);
    return { provider: "sendgrid", statusCode: response[0]?.statusCode };
  } catch (error) {
    const isCreditLimit =
      error.response?.body?.errors?.some((e) =>
        e.message?.toLowerCase().includes("maximum credits exceeded")
      ) || error.code === 401;

    if (isCreditLimit) {
      console.warn(
        "⚠️ SendGrid quota / credits exceeded (401). Falling back to alternate mail transport."
      );
    } else {
      console.error("❌ SendGrid error:", error.code || error.message, error.response?.body || "");
    }
    throw error;
  }
};

// Provider: SMTP / Gmail via Nodemailer
const sendSmtpMail = async ({ to, from, subject, html, text, attachments }) => {
  const transporters = getSmtpTransporters();
  if (transporters.length === 0) {
    throw new Error("No SMTP transporter configured");
  }

  const fromEmail = getDefaultFrom(
    process.env.SMTP_FROM || process.env.GMAIL_USER || process.env.EMAIL_USER || from
  );

  let lastSmtpError = null;
  for (const { label, transporter } of transporters) {
    try {
      const info = await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        html,
        ...(text ? { text } : {}),
        ...(Array.isArray(attachments) && attachments.length > 0 ? { attachments } : {}),
      });

      console.log(`✅ ${label} email sent to`, to, "MessageId:", info.messageId);
      return { provider: "smtp", transport: label, messageId: info.messageId };
    } catch (err) {
      lastSmtpError = err;
      console.error(`❌ ${label} failed:`, err.message);
    }
  }

  throw lastSmtpError || new Error("SMTP email delivery failed");
};

exports.getEmailConfigStatus = () => {
  const hasResend = Boolean((process.env.RESEND_API_KEY || "").trim());
  const hasBrevo = Boolean((process.env.BREVO_API_KEY || "").trim());
  const hasCustomSmtp = Boolean(
    (process.env.SMTP_HOST || "").trim() &&
      (process.env.SMTP_USER || "").trim() &&
      (process.env.SMTP_PASS || "").trim()
  );
  const hasGmail = Boolean(
    (process.env.GMAIL_USER || process.env.EMAIL_USER || "").trim() &&
      (process.env.GMAIL_PASS || process.env.EMAIL_PASS || "").trim()
  );
  const hasSendGrid = Boolean((process.env.SENDGRID_API_KEY || "").trim());

  return {
    hasResend,
    hasBrevo,
    hasCustomSmtp,
    hasGmail,
    hasSendGrid,
    hasAnyProvider: hasResend || hasBrevo || hasCustomSmtp || hasGmail || hasSendGrid,
  };
};

exports.sendEmail = async ({ to, from, sender, subject, html, attachments, text }) => {
  const resolvedFrom = from || sender;
  let lastError = null;

  // 1. Try Resend HTTPS API if configured
  if ((process.env.RESEND_API_KEY || "").trim()) {
    try {
      return await sendResendMail({ to, from: resolvedFrom, subject, html, text });
    } catch (err) {
      lastError = err;
      console.error("❌ Resend failed:", err.message);
    }
  }

  // 2. Try Brevo HTTPS API if configured
  if ((process.env.BREVO_API_KEY || "").trim()) {
    try {
      return await sendBrevoMail({ to, from: resolvedFrom, subject, html, text });
    } catch (err) {
      lastError = err;
      console.error("❌ Brevo failed:", err.message);
    }
  }

  // 3. Try SMTP / Gmail App Password if configured
  if (getSmtpTransporters().length > 0) {
    try {
      return await sendSmtpMail({
        to,
        from: resolvedFrom,
        subject,
        html,
        text,
        attachments,
      });
    } catch (err) {
      lastError = err;
      console.error("❌ SMTP transport failed:", err.message);
    }
  }

  // 4. Try SendGrid if API key is configured
  if ((process.env.SENDGRID_API_KEY || "").trim()) {
    try {
      return await sendSGMail({
        to,
        from: resolvedFrom,
        subject,
        html,
        text,
        attachments,
      });
    } catch (err) {
      lastError = err;
    }
  }

  // 5. In non-production / development, provide Ethereal web preview or console fallback
  const isDev =
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_DEV_MAIL_FALLBACK === "true";

  if (isDev) {
    try {
      const etherealTransporter = await getEtherealTransporter();
      if (etherealTransporter && nodemailer) {
        const fromEmail = "Trackon Security <security@trackon.app>";
        const info = await etherealTransporter.sendMail({
          from: fromEmail,
          to,
          subject,
          html,
          ...(text ? { text } : {}),
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log("====================================================");
        console.log("📬 EMAIL DISPATCHED (DEVELOPMENT ETHEREAL PREVIEW)");
        console.log("To:", to);
        console.log("Subject:", subject);
        if (previewUrl) console.log("🔗 Web Preview URL:", previewUrl);
        console.log("====================================================");

        return {
          provider: "ethereal",
          simulated: true,
          previewUrl: previewUrl || null,
          messageId: info.messageId,
        };
      }
    } catch (etherealErr) {
      console.warn("⚠️ Ethereal delivery error:", etherealErr.message);
    }

    console.log("====================================================");
    console.log("📬 EMAIL DISPATCH (CONSOLE LOCAL FALLBACK)");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("====================================================");
    return {
      provider: "console",
      simulated: true,
    };
  }

  // 6. Strict production error when all mail providers fail
  const isSendGridCreditError =
    lastError?.response?.body?.errors?.some((e) =>
      e.message?.toLowerCase().includes("maximum credits exceeded")
    ) || lastError?.code === 401;

  if (isSendGridCreditError) {
    throw new Error(
      "Email service quota exceeded (SendGrid credits exhausted). Please configure GMAIL_USER & GMAIL_PASS (App Password), BREVO_API_KEY, or RESEND_API_KEY in server environment variables."
    );
  }

  throw (
    lastError ||
    new Error(
      "No email provider configured. Please set GMAIL_USER/GMAIL_PASS, BREVO_API_KEY, RESEND_API_KEY, or SMTP credentials."
    )
  );
};

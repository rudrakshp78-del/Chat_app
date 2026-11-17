module.exports = (name, link) => {
  const currentYear = new Date().getFullYear();
  const userName = name ? String(name).trim() : "there";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset Your Trackon Password</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      min-width: 100%;
      height: 100% !important;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f1f5f9;
      padding-top: 40px;
      padding-bottom: 40px;
    }
    .main-card {
      background-color: #ffffff;
      margin: 0 auto;
      max-width: 580px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }
    .header-bar {
      background: linear-gradient(135deg, #0162C4 0%, #004b99 100%);
      padding: 32px 40px 28px 40px;
      text-align: center;
    }
    .brand-title {
      color: #ffffff;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 2px;
      margin: 0;
      text-transform: uppercase;
    }
    .brand-subtitle {
      color: #cbd5e1;
      font-size: 13px;
      margin-top: 6px;
      letter-spacing: 0.5px;
    }
    .content-body {
      padding: 36px 40px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 16px 0;
    }
    .paragraph {
      font-size: 15px;
      line-height: 1.6;
      color: #334155;
      margin: 0 0 20px 0;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .reset-button {
      display: inline-block;
      background-color: #0162C4;
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(1, 98, 196, 0.25);
    }
    .reset-button:hover {
      background-color: #004b99;
    }
    .notice-box {
      background-color: #eff6ff;
      border-left: 4px solid #0162C4;
      padding: 14px 16px;
      border-radius: 4px;
      margin: 24px 0;
    }
    .notice-text {
      font-size: 13px;
      line-height: 1.5;
      color: #1e40af;
      margin: 0;
    }
    .raw-link-box {
      font-size: 13px;
      line-height: 1.6;
      color: #64748b;
      word-break: break-all;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .raw-link {
      color: #0162C4;
      text-decoration: underline;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
      margin: 0;
    }
    @media only screen and (max-width: 600px) {
      .main-card {
        border-radius: 0 !important;
        border: none !important;
      }
      .content-body, .header-bar, .footer {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">
      <div class="header-bar">
        <h1 class="brand-title">TRACKON</h1>
        <div class="brand-subtitle">Password Recovery</div>
      </div>
      <div class="content-body">
        <p class="greeting">Hello ${userName},</p>
        <p class="paragraph">
          We received a request to reset your Trackon account password. Click the button below to choose a new, secure password:
        </p>

        <div class="button-container">
          <a href="${link}" target="_blank" class="reset-button">Reset Password</a>
        </div>

        <div class="notice-box">
          <p class="notice-text">
            <strong>Security Notice:</strong> This password reset link is time-sensitive and valid for only <strong>10 minutes</strong>.
          </p>
        </div>

        <p class="paragraph" style="font-size: 14px; color: #64748b;">
          If you did not make this request, you can safely ignore this email. Your current password will remain unchanged and your account is secure.
        </p>

        <div class="raw-link-box">
          If the button above does not work, copy and paste this link into your web browser:<br>
          <a href="${link}" class="raw-link" target="_blank">${link}</a>
        </div>
      </div>
      <div class="footer">
        <p class="footer-text">
          &copy; ${currentYear} Trackon. All rights reserved.<br>
          This is an automated notification. Please do not reply directly to this email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

let brevoTransport = require("./brevoTransport");

// In production mails go through Brevo's HTTPS API (outbound SMTP is blocked on Render),
// Gmail SMTP stays the fallback when no Brevo key is set (e.g. in dev)
module.exports = process.env.BREVO_API_KEY
    ? brevoTransport(process.env.BREVO_API_KEY)
    : {
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          // nodemailer waits up to 2 min to connect and 10 min on an idle socket by default: a stuck
          // SMTP connection kept requests (e.g. the password reset) loading until the client gave up
          connectionTimeout: 10 * 1000,
          greetingTimeout: 10 * 1000,
          socketTimeout: 20 * 1000,
          auth: {
              user: process.env.GMAIL_USER,
              pass: process.env.GMAIL_PASSWORD,
          },
      };

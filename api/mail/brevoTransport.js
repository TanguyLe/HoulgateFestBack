// Nodemailer transport sending through Brevo's HTTPS API: Render's free instances block outbound
// SMTP ports, so the Gmail SMTP connection timed out and no mail was ever sent.
// Every sender (activator, contact, shotgun recap) goes through nodemailer, so they all use it.
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const DEFAULT_SENDER = "houlgatefest@gmail.com";
const TIMEOUT_MS = 10 * 1000;

module.exports = (apiKey) => ({
    name: "brevo",
    version: "1.0.0",
    send: (mail, callback) => {
        // the envelope has the parsed addresses, whatever shape `from` / `to` were given in
        let envelope = mail.message.getEnvelope();
        let { subject, html, text } = mail.data;

        fetch(BREVO_URL, {
            method: "POST",
            headers: {
                "api-key": apiKey,
                "content-type": "application/json",
                accept: "application/json",
            },
            body: JSON.stringify({
                sender: { name: "HoulgateFest", email: envelope.from || DEFAULT_SENDER },
                to: envelope.to.map((email) => ({ email })),
                subject: subject,
                htmlContent: html || undefined,
                textContent: text || undefined,
            }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        })
            .then(async (response) => {
                let body = await response.json().catch(() => ({}));
                if (!response.ok)
                    throw new Error(`Brevo answered ${response.status}: ${body.message || ""}`);

                // same shape as nodemailer's info, mailSender checks `rejected`
                callback(null, {
                    messageId: body.messageId,
                    envelope: envelope,
                    accepted: envelope.to,
                    rejected: [],
                });
            })
            .catch((err) => callback(err));
    },
});

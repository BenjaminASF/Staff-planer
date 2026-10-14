// Sends e-mail through Resend's HTTP API (https://resend.com). Railway blocks
// outgoing SMTP on most plans, so an HTTP API is used instead of SMTP.
//
// Without RESEND_API_KEY and MAIL_FROM no mail is sent; the app works as before.

const RESEND_URL = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 10_000;

function createMailer({ apiKey = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM } = {}) {
  if (!apiKey || !from) return { configured: false, async send() { return false; } };
  return {
    configured: true,
    async send({ to, subject, text }) {
      const response = await fetch(RESEND_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, text }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS)
      });
      if (!response.ok) throw new Error(`Resend svarade ${response.status}: ${await response.text()}`);
      return true;
    }
  };
}

module.exports = { createMailer };

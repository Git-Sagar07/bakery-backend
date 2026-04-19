// routes/contact.js
const express = require("express");
const router  = express.Router();
const { Resend } = require("resend");

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("re_REPLACE")) {
    throw new Error("RESEND_API_KEY not configured.");
  }
  return new Resend(key);
}

// ── POST /api/contact ────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: "Name, email and message are required." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email address." });
    }
    if (message.length < 10) {
      return res.status(400).json({ success: false, message: "Message is too short." });
    }

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL || "orders@visitmybakery.com";
    const FROM_EMAIL  = process.env.FROM_EMAIL  || "orders@visitmybakery.com";

    const html = `
      <div style="font-family:sans-serif;max-width:600px;padding:24px;background:#fffaf5;border-radius:12px;">
        <h2 style="color:#d35400;margin:0 0 16px;">📬 New Contact Message</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#888;width:100px;">From</td><td style="padding:8px 0;font-weight:600;">${name} &lt;${email}&gt;</td></tr>
          <tr><td style="padding:8px 0;color:#888;">Subject</td><td style="padding:8px 0;">${subject || "General enquiry"}</td></tr>
          <tr><td style="padding:8px 0;color:#888;vertical-align:top;">Message</td>
              <td style="padding:8px 0;line-height:1.6;">${message.replace(/\n/g, "<br/>")}</td></tr>
        </table>
        <p style="margin-top:20px;font-size:12px;color:#aaa;">Sent via My Bakery contact form</p>
      </div>`;

    await getResend().emails.send({
      from:    FROM_EMAIL,
      to:      [ADMIN_EMAIL],
      replyTo: email,
      subject: `[My Bakery] ${subject || "New message"} — from ${name}`,
      html,
    });

    // Auto-reply to sender
    await getResend().emails.send({
      from:    FROM_EMAIL,
      to:      [email],
      subject: "We got your message! 🧁 — My Bakery",
      html: `
        <div style="font-family:sans-serif;max-width:600px;padding:24px;background:#fffaf5;border-radius:12px;">
          <h2 style="color:#d35400;">Hi ${name}! 👋</h2>
          <p>Thanks for reaching out. We've received your message and will get back to you within 24 hours.</p>
          <div style="background:#fff3e8;border-radius:10px;padding:16px;margin:16px 0;">
            <strong>Your message:</strong><br/><br/>
            <em style="color:#555;">${message.replace(/\n/g, "<br/>")}</em>
          </div>
          <p style="color:#888;font-size:13px;">— The My Bakery Team 🧁</p>
        </div>`,
    });

    return res.json({ success: true, message: "Message sent! We'll reply within 24 hours." });
  } catch (err) {
    console.error("Contact route error:", err);
    return res.status(500).json({ success: false, message: "Could not send message. Please try again." });
  }
});

module.exports = router;

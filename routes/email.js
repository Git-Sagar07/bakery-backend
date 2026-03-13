const { Resend } = require("resend");

// Lazy init — only fails if you actually try to send, not on startup
let resendClient;
function getResend() {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not set. Add it to your environment variables.");
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// ── Order Confirmation Email ──────────────────────────────────
async function sendOrderConfirmationEmail({
  toEmail, userName, orderId,
  items, subtotal, delivery, gst, discount, grand_total, address,
}) {
  const FROM_EMAIL = process.env.FROM_EMAIL || "orders@visitmybakery.com";
  const SITE_URL   = process.env.FRONTEND_URL || "https://visitmybakery.netlify.app";

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #fdebd0;">
        <strong style="color:#333;">${item.name}</strong>
        <span style="color:#888;font-size:12px;"> (${item.unit})</span>
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #fdebd0;text-align:center;color:#555;">×${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #fdebd0;text-align:right;font-weight:600;color:#d35400;">₹${item.price * item.quantity}</td>
    </tr>
  `).join("");

  const addrLine = address.street
    ? `${address.name || userName} · ${address.street}, ${address.city} – ${address.pin}`
    : "Address not set";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Order Confirmed – My Bakery</title>
</head>
<body style="margin:0;padding:0;background:#fffaf5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf5;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(211,84,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#d35400,#e67e22);padding:32px 40px;text-align:center;">
            <div style="font-size:48px;margin-bottom:8px;">🧁</div>
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">My Bakery</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Order Confirmed!</p>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:32px 40px 0;">
            <h2 style="margin:0 0 8px;color:#222;font-size:20px;">Hey ${userName.split(" ")[0]}! 🎉</h2>
            <p style="margin:0;color:#555;font-size:15px;line-height:1.6;">
              Your order has been confirmed and our bakers are already on it.
              Here's a summary of what's coming your way.
            </p>
          </td>
        </tr>

        <!-- Order ID Badge -->
        <tr>
          <td style="padding:20px 40px 0;">
            <div style="background:#fff3e8;border:2px solid #ffd7c2;border-radius:12px;padding:14px 20px;display:inline-block;">
              <span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Order ID</span><br/>
              <strong style="color:#d35400;font-size:20px;letter-spacing:1px;">${orderId}</strong>
            </div>
          </td>
        </tr>

        <!-- Items Table -->
        <tr>
          <td style="padding:24px 40px 0;">
            <h3 style="margin:0 0 12px;color:#333;font-size:15px;text-transform:uppercase;letter-spacing:0.5px;">Items Ordered</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <thead>
                <tr style="background:#fffaf5;">
                  <th style="padding:8px;text-align:left;color:#888;font-size:12px;font-weight:600;">ITEM</th>
                  <th style="padding:8px;text-align:center;color:#888;font-size:12px;font-weight:600;">QTY</th>
                  <th style="padding:8px;text-align:right;color:#888;font-size:12px;font-weight:600;">PRICE</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
          </td>
        </tr>

        <!-- Totals -->
        <tr>
          <td style="padding:16px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0;color:#666;font-size:14px;">Subtotal</td>
                <td style="padding:4px 0;text-align:right;color:#333;font-size:14px;">₹${subtotal}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;color:#666;font-size:14px;">Delivery</td>
                <td style="padding:4px 0;text-align:right;color:#333;font-size:14px;">${delivery === 0 ? "FREE 🎉" : `₹${delivery}`}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;color:#666;font-size:14px;">GST (5%)</td>
                <td style="padding:4px 0;text-align:right;color:#333;font-size:14px;">₹${gst}</td>
              </tr>
              ${discount > 0 ? `
              <tr>
                <td style="padding:4px 0;color:#27ae60;font-size:14px;">Discount</td>
                <td style="padding:4px 0;text-align:right;color:#27ae60;font-size:14px;">−₹${discount}</td>
              </tr>` : ""}
              <tr>
                <td colspan="2" style="padding:12px 0 0;border-top:2px solid #fdebd0;"></td>
              </tr>
              <tr>
                <td style="color:#333;font-size:16px;font-weight:700;">Total Paid</td>
                <td style="text-align:right;color:#d35400;font-size:20px;font-weight:800;">₹${grand_total}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Delivery Address -->
        <tr>
          <td style="padding:20px 40px 0;">
            <div style="background:#fffaf5;border-radius:10px;padding:14px 16px;">
              <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Delivering to</p>
              <p style="margin:0;color:#333;font-size:14px;">📍 ${addrLine}</p>
            </div>
          </td>
        </tr>

        <!-- ETA -->
        <tr>
          <td style="padding:20px 40px 0;">
            <div style="background:#fff3e8;border-radius:10px;padding:14px 16px;text-align:center;">
              <p style="margin:0;color:#d35400;font-size:15px;font-weight:600;">⏱️ Estimated Delivery: 30–45 minutes</p>
            </div>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:28px 40px;text-align:center;">
            <a href="${SITE_URL}/pages/profile.html?tab=orders"
               style="background:linear-gradient(135deg,#d35400,#e67e22);color:#fff;text-decoration:none;padding:14px 32px;border-radius:30px;font-weight:700;font-size:15px;display:inline-block;">
              Track Your Order 📦
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fdebd0;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#888;font-size:13px;">
              Thank you for choosing <strong style="color:#d35400;">My Bakery</strong> 🧁<br/>
              Questions? Reply to this email or visit <a href="${SITE_URL}" style="color:#d35400;">${SITE_URL}</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { data, error } = await getResend().emails.send({
    from:    FROM_EMAIL,
    to:      [toEmail],
    subject: `🧁 Order ${orderId} Confirmed – My Bakery`,
    html,
  });

  if (error) throw new Error(error.message);
  return data;
}

// ── Welcome Email ─────────────────────────────────────────────
async function sendWelcomeEmail({ toEmail, userName }) {
  const FROM_EMAIL = process.env.FROM_EMAIL || "orders@visitmybakery.com";
  const SITE_URL   = process.env.FRONTEND_URL || "https://visitmybakery.netlify.app";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Welcome to My Bakery!</title></head>
<body style="margin:0;padding:0;background:#fffaf5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf5;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(211,84,0,0.1);">
        <tr>
          <td style="background:linear-gradient(135deg,#d35400,#e67e22);padding:40px;text-align:center;">
            <div style="font-size:56px;margin-bottom:10px;">🧁</div>
            <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">Welcome to My Bakery!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h2 style="margin:0 0 12px;color:#222;font-size:20px;">Hi ${userName.split(" ")[0]}! 👋</h2>
            <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.7;">
              We're so happy to have you with us! My Bakery brings freshly baked happiness to your door — 
              cakes, pastries, cookies, breads, and more.
            </p>
            <div style="background:#fff3e8;border-radius:12px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 8px;color:#d35400;font-weight:700;font-size:15px;">🎁 Your first order coupon</p>
              <p style="margin:0 0 12px;color:#555;font-size:14px;">Use code at checkout for 15% off your first order:</p>
              <div style="background:#d35400;color:#fff;border-radius:8px;padding:12px;text-align:center;letter-spacing:3px;font-size:20px;font-weight:800;">FIRST15</div>
            </div>
            <div style="text-align:center;">
              <a href="${SITE_URL}/pages/menu.html"
                 style="background:linear-gradient(135deg,#d35400,#e67e22);color:#fff;text-decoration:none;padding:14px 36px;border-radius:30px;font-weight:700;font-size:15px;display:inline-block;">
                Explore Our Menu 🍰
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#fdebd0;padding:18px 40px;text-align:center;">
            <p style="margin:0;color:#888;font-size:13px;">
              © My Bakery · <a href="${SITE_URL}" style="color:#d35400;">${SITE_URL}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { data, error } = await getResend().emails.send({
    from:    FROM_EMAIL,
    to:      [toEmail],
    subject: `🧁 Welcome to My Bakery, ${userName.split(" ")[0]}!`,
    html,
  });

  if (error) throw new Error(error.message);
  return data;
}

// (exported below with sendPasswordResetEmail)

// ── Password Reset Email ──────────────────────────────────────
async function sendPasswordResetEmail({ toEmail, userName, resetUrl }) {
  const FROM_EMAIL = process.env.FROM_EMAIL || "orders@visitmybakery.com";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Reset Your Password</title></head>
<body style="margin:0;padding:0;background:#fffaf5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf5;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(211,84,0,0.1);">
        <tr>
          <td style="background:linear-gradient(135deg,#d35400,#e67e22);padding:32px 40px;text-align:center;">
            <div style="font-size:48px;margin-bottom:8px;">🔑</div>
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Reset Your Password</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h2 style="margin:0 0 12px;color:#222;font-size:18px;">Hi ${userName.split(" ")[0]},</h2>
            <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.7;">
              We received a request to reset your My Bakery password.
              Click the button below to choose a new password. This link expires in <strong>15 minutes</strong>.
            </p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${resetUrl}"
                 style="background:linear-gradient(135deg,#d35400,#e67e22);color:#fff;text-decoration:none;padding:14px 36px;border-radius:30px;font-weight:700;font-size:15px;display:inline-block;">
                Reset My Password 🔐
              </a>
            </div>
            <p style="margin:0;color:#aaa;font-size:13px;line-height:1.6;">
              If you didn't request this, you can safely ignore this email — your password will not change.<br/>
              Link not working? Copy and paste this URL into your browser:<br/>
              <span style="color:#d35400;word-break:break-all;">${resetUrl}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#fdebd0;padding:18px 40px;text-align:center;">
            <p style="margin:0;color:#888;font-size:13px;">© My Bakery · This link expires in 15 minutes</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { data, error } = await getResend().emails.send({
    from:    FROM_EMAIL,
    to:      [toEmail],
    subject: "🔑 Reset your My Bakery password",
    html,
  });

  if (error) throw new Error(error.message);
  return data;
}

module.exports = { sendOrderConfirmationEmail, sendWelcomeEmail, sendPasswordResetEmail };

import { sendEmail } from './resendEmail.js';

export { sendEmail };

/**
 * Build a branded HTML email for password reset
 */
export const buildResetEmailHTML = (name, resetUrl) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset Your Password — Fadii Interior</title>
</head>
<body style="margin:0;padding:0;background:#FAF9F6;font-family:'Plus Jakarta Sans',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF9F6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E8E2D5;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1F1D1B 0%,#2D2A27 100%);padding:36px 40px;text-align:center;">
              <p style="margin:0;color:#D4AF37;letter-spacing:0.25em;font-size:11px;text-transform:uppercase;font-weight:700;">FADII INTERIOR</p>
              <h1 style="margin:12px 0 0;color:#FAF9F6;font-size:24px;font-weight:600;letter-spacing:0.05em;">Password Reset</h1>
              <div style="width:40px;height:2px;background:#D4AF37;margin:14px auto 0;"></div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;color:#1F1D1B;">
              <p style="margin:0 0 16px;font-size:15px;color:#59524C;">
                Dear ${name},
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#59524C;line-height:1.7;">
                We received a request to reset the password for your Fadii Interior account. 
                Click the button below to create a new password. This link is valid for 
                <strong style="color:#1F1D1B;">15 minutes</strong>.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:32px auto;">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,#D4AF37 0%,#C9A24B 100%);border-radius:4px;">
                    <a href="${resetUrl}" 
                       style="display:inline-block;padding:14px 36px;color:#FFFFFF;font-size:13px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F5F0E6;padding:20px 40px;text-align:center;border-top:1px solid #E8E2D5;">
              <p style="margin:0;font-size:11px;color:#A09890;letter-spacing:0.1em;">
                © ${new Date().getFullYear()} Fadii Interior — Artisanal Clocks & Home Decor
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Send Instant Order Confirmation Emails (Customer + Admin)
 */
export const sendOrderConfirmationEmails = async (order) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'faadiinterior1@gmail.com';
  const customerEmail = order.shippingAddress?.email || order.user?.email;

  const itemsListHTML = order.orderItems
    .map(
      (item) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #F0ECE1;font-size:13px;">${item.name}</td>
        <td style="padding:10px;border-bottom:1px solid #F0ECE1;font-size:13px;text-align:center;">${item.quantity}</td>
        <td style="padding:10px;border-bottom:1px solid #F0ECE1;font-size:13px;text-align:right;">Rs ${(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `
    )
    .join('');

  // 1. Customer Email HTML
  const customerHTML = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"/></head>
    <body style="margin:0;padding:0;background:#FAF9F6;font-family:'Plus Jakarta Sans',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF9F6;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E8E2D5;border-radius:8px;overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(135deg,#1F1D1B 0%,#2D2A27 100%);padding:30px;text-align:center;">
                  <p style="margin:0;color:#D4AF37;letter-spacing:0.25em;font-size:11px;text-transform:uppercase;font-weight:700;">FADII INTERIOR</p>
                  <h2 style="margin:10px 0 0;color:#FAF9F6;font-size:22px;">Order Confirmed!</h2>
                  <p style="margin:5px 0 0;color:#D4AF37;font-size:12px;">Reference: ${order.orderId || order._id}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;color:#1F1D1B;">
                  <p>Dear <strong>${order.shippingAddress?.name || 'Customer'}</strong>,</p>
                  <p style="color:#59524C;line-height:1.6;">Thank you for your order with Fadii Interior. We have received your order details and our horology studio has begun preparing your handcrafted timepiece.</p>
                  
                  <h3 style="margin-top:24px;border-bottom:2px solid #D4AF37;padding-bottom:6px;font-size:15px;">Order Summary</h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                    <thead>
                      <tr style="background:#FAF9F6;color:#59524C;font-size:12px;text-align:left;">
                        <th style="padding:8px;">Item</th>
                        <th style="padding:8px;text-align:center;">Qty</th>
                        <th style="padding:8px;text-align:right;">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsListHTML}
                    </tbody>
                  </table>

                  <table width="100%" style="font-size:13px;color:#1F1D1B;margin-top:10px;">
                    <tr>
                      <td style="text-align:right;"><strong>Total Amount:</strong></td>
                      <td style="text-align:right;width:120px;"><strong style="color:#C9A24B;font-size:16px;">Rs ${order.totalPrice?.toLocaleString()}</strong></td>
                    </tr>
                    <tr>
                      <td style="text-align:right;"><strong>Payment Method:</strong></td>
                      <td style="text-align:right;">${order.paymentMethod}</td>
                    </tr>
                  </table>

                  <h3 style="margin-top:24px;border-bottom:2px solid #D4AF37;padding-bottom:6px;font-size:15px;">Shipping Address</h3>
                  <p style="font-size:13px;color:#59524C;line-height:1.5;">
                    <strong>Name:</strong> ${order.shippingAddress?.name}<br/>
                    <strong>Phone:</strong> ${order.shippingAddress?.phone}<br/>
                    <strong>Address:</strong> ${order.shippingAddress?.address}, ${order.shippingAddress?.city}, ${order.shippingAddress?.country}
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background:#F5F0E6;padding:20px;text-align:center;font-size:11px;color:#A09890;">
                  Need assistance? Reply to this email or contact us at faadiinterior1@gmail.com
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // 2. Admin Alert Email HTML
  const adminHTML = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"/></head>
    <body style="margin:0;padding:0;background:#FAF9F6;font-family:'Plus Jakarta Sans',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #D4AF37;border-radius:8px;overflow:hidden;">
              <tr>
                <td style="background:#1F1D1B;padding:24px;text-align:center;">
                  <h2 style="margin:0;color:#D4AF37;">NEW ORDER RECEIVED! 🛍️</h2>
                  <p style="margin:6px 0 0;color:#FAF9F6;font-size:13px;">Fadii Interior Store Order #${order.orderId || order._id}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:24px;color:#1F1D1B;font-size:14px;">
                  <p><strong>Customer Name:</strong> ${order.shippingAddress?.name}</p>
                  <p><strong>Email:</strong> ${customerEmail || 'Guest'}</p>
                  <p><strong>Phone:</strong> ${order.shippingAddress?.phone}</p>
                  <p><strong>Delivery Address:</strong> ${order.shippingAddress?.address}, ${order.shippingAddress?.city}</p>
                  <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                  <p><strong>Total Revenue:</strong> <span style="color:#C9A24B;font-weight:bold;font-size:16px;">Rs ${order.totalPrice?.toLocaleString()}</span></p>

                  <h3 style="border-bottom:1px solid #E8E2D5;padding-bottom:4px;">Items Purchased:</h3>
                  <ul>
                    ${order.orderItems.map((i) => `<li>${i.name} (Qty: ${i.quantity}) - Rs ${(i.price * i.quantity).toLocaleString()}</li>`).join('')}
                  </ul>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Send customer email if provided
  if (customerEmail) {
    try {
      await sendEmail({
        to: customerEmail,
        subject: `Order Confirmation #${order.orderId || order._id} — Fadii Interior`,
        html: customerHTML,
      });
    } catch (err) {
      console.error('Failed to send customer confirmation email:', err);
    }
  }

  // Send admin notification email
  try {
    await sendEmail({
      to: adminEmail,
      subject: `🚨 NEW ORDER #${order.orderId || order._id} - Rs ${order.totalPrice?.toLocaleString()} — Fadii Interior`,
      html: adminHTML,
    });
  } catch (err) {
    console.error('Failed to send admin order alert email:', err);
  }
};

/**
 * Send Order Delivered Email (Customer)
 */
export const sendOrderDeliveredEmail = async (order) => {
  const customerEmail = order.shippingAddress?.email || order.user?.email;
  if (!customerEmail) return;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"/></head>
    <body style="margin:0;padding:0;background:#FAF9F6;font-family:'Plus Jakarta Sans',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E8E2D5;border-radius:8px;overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(135deg,#1F1D1B 0%,#2D2A27 100%);padding:30px;text-align:center;">
                  <p style="margin:0;color:#D4AF37;letter-spacing:0.25em;font-size:11px;text-transform:uppercase;font-weight:700;">FADII INTERIOR</p>
                  <h2 style="margin:10px 0 0;color:#FAF9F6;font-size:22px;">Your Order Has Been Delivered! 🎉</h2>
                  <p style="margin:5px 0 0;color:#D4AF37;font-size:12px;">Order ID: ${order.orderId || order._id}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;color:#1F1D1B;">
                  <p>Dear <strong>${order.shippingAddress?.name || 'Customer'}</strong>,</p>
                  <p style="color:#59524C;line-height:1.6;">We are delighted to inform you that your handcrafted Fadii Interior order has been successfully delivered!</p>
                  <p style="color:#59524C;line-height:1.6;">As a verified owner of our artisanal timepieces, you are now invited to share your collector review on our store.</p>
                  
                  <div style="text-align:center;margin:30px 0;">
                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/shop" style="background:linear-gradient(135deg,#D4AF37 0%,#C9A24B 100%);color:#FFFFFF;padding:14px 32px;text-decoration:none;font-weight:bold;border-radius:4px;display:inline-block;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">
                      Leave A Collector Review
                    </a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background:#F5F0E6;padding:20px;text-align:center;font-size:11px;color:#A09890;">
                  Thank you for choosing Fadii Interior — Where artisanal craftsmanship meets living interior art.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      to: customerEmail,
      subject: `Order Delivered #${order.orderId || order._id} — Fadii Interior`,
      html,
    });
  } catch (err) {
    console.error('Failed to send order delivery email:', err);
  }
};

export default {
  sendEmail,
  buildResetEmailHTML,
  sendOrderConfirmationEmails,
  sendOrderDeliveredEmail,
};

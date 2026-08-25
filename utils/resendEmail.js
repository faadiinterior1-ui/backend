import { Resend } from 'resend';

// Set RESEND_API_KEY in Render dashboard > Environment
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * @typedef {Object} SendEmailParams
 * @property {string} to
 * @property {string} subject
 * @property {string} html
 */

/**
 * Send email using Resend API
 * @param {SendEmailParams} params
 */
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Céleste Clocks <orders@faadiinterior.com>',
      to,
      subject,
      html,
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Resend email failed:', error);
    throw error;
  }
};

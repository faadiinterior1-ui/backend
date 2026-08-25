import { Resend } from 'resend';

// Set RESEND_API_KEY in Render dashboard > Environment
let resend;

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
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('Missing API key. Please set RESEND_API_KEY in Render dashboard > Environment');
    }

    if (!resend) {
      resend = new Resend(apiKey);
    }

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

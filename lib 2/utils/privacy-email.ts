interface PrivacyEmailOptions {
  to?: string | null;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send a transactional privacy email using Resend (if configured)
 */
export async function sendPrivacyEmail(options: PrivacyEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY || process.env.PRIVACY_EMAIL_API_KEY;
  const fromAddress = process.env.PRIVACY_EMAIL_FROM || 'Urban Manual <privacy@theurbanmanual.com>';

  if (!apiKey) {
    console.warn('[privacy-email] RESEND_API_KEY not configured. Skipping email send.');
    return { skipped: true };
  }

  if (!options.to) {
    console.warn('[privacy-email] Missing recipient email.');
    return { skipped: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send email: ${response.status} ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('[privacy-email] Error sending email', error);
    return { success: false, error };
  }
}

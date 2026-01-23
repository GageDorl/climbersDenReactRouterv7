/**
 * Email service for sending transactional emails
 * Currently uses console logging for development
 * In production, integrate with SendGrid, AWS SES, or similar
 */

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/auth/reset-password/${resetToken}`;

  // TODO: In production, replace with actual email service
  console.log(`
====================================
Password Reset Email
====================================
To: ${email}
Subject: Reset your climbersDen password

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.
====================================
  `);

  // For production, uncomment and configure email service:
  /*
  // Example with SendGrid
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  await sgMail.send({
    to: email,
    from: 'noreply@climbersden.com',
    subject: 'Reset your climbersDen password',
    text: `Click the link to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour.`,
    html: `
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  });
  */
}

export async function sendEmailVerificationEmail(
  email: string,
  verificationToken: string
): Promise<void> {
  const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/auth/verify-email/${verificationToken}`;

  // TODO: In production, replace with actual email service
  console.log(`
====================================
Email Verification
====================================
To: ${email}
Subject: Verify your climbersDen email

Click the link below to verify your email address:
${verificationUrl}

This link will expire in 24 hours.
====================================
  `);
}

export async function sendWelcomeEmail(email: string, displayName: string): Promise<void> {
  // TODO: In production, replace with actual email service
  console.log(`
====================================
Welcome Email
====================================
To: ${email}
Subject: Welcome to climbersDen, ${displayName}!

Welcome to the climbersDen community!

Start exploring:
- Create your first post
- Discover climbers near you
- Log your route ticks
- Plan your next climbing trip

Happy climbing!
====================================
  `);
}

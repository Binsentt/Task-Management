import nodemailer from 'nodemailer';

const REQUIRED_SETTINGS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'];

export function getMissingSmtpConfiguration(environment = process.env) {
    return REQUIRED_SETTINGS.filter((name) => !environment[name]?.trim());
}

export class SmtpConfigurationError extends Error {
    constructor(missing) {
        super(`Password reset email is unavailable. Configure: ${missing.join(', ')}`);
        this.name = 'SmtpConfigurationError';
        this.missing = missing;
    }
}

export async function sendPasswordResetEmail(
    email,
    token,
    { environment = process.env, transportFactory = nodemailer.createTransport } = {}
) {
    const missing = getMissingSmtpConfiguration(environment);
    const port = Number(environment.SMTP_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) missing.push('SMTP_PORT');
    if (missing.length > 0) throw new SmtpConfigurationError([...new Set(missing)]);

    const clientUrl = environment.CLIENT_URL || 'http://localhost:5174';
    const resetUrl = new URL('/reset-password', clientUrl);
    resetUrl.searchParams.set('token', token);
    const transport = transportFactory({
        host: environment.SMTP_HOST,
        port,
        secure: environment.SMTP_SECURE === 'true' || port === 465,
        auth: {
            user: environment.SMTP_USER,
            pass: environment.SMTP_PASSWORD
        }
    });

    await transport.sendMail({
        from: environment.SMTP_FROM,
        to: email,
        subject: 'Reset your Task Management password',
        text: `Use this link to reset your password. It expires in 30 minutes and can only be used once:\n\n${resetUrl.toString()}\n\nIf you did not request this reset, you can ignore this email.`
    });
}

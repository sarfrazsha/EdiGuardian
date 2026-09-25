require('dotenv').config();
const nodemailer = require('nodemailer');

// All app accounts (admin/teacher/parent/student) use @gmail.com, so Gmail SMTP
// is the default. Any SMTP provider works if EMAIL_HOST/EMAIL_PORT are set.
const EMAIL_ENABLED = String(process.env.EMAIL_ENABLED || 'true').toLowerCase() !== 'false';
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'EduGuardian';
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = Number(process.env.EMAIL_PORT) || 465;
const EMAIL_SECURE = String(process.env.EMAIL_SECURE || 'true').toLowerCase() !== 'false';

let transporter = null;

function isConfigured() {
    return EMAIL_ENABLED && Boolean(EMAIL_USER) && Boolean(EMAIL_PASS);
}

function getTransporter() {
    if (!isConfigured()) return null;
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: EMAIL_HOST,
            port: EMAIL_PORT,
            secure: EMAIL_SECURE, // true for port 465, false for 587/STARTTLS
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS
            }
        });
    }
    return transporter;
}

// Checks the SMTP connection at startup. Logs only — never blocks server start,
// since a bad/missing SMTP config shouldn't take the whole app down.
async function verifyConnection() {
    if (!isConfigured()) {
        console.log('[email] Notifications disabled: EMAIL_USER/EMAIL_PASS not set (see .env.example).');
        return false;
    }
    try {
        await getTransporter().verify();
        console.log(`[email] SMTP ready (${EMAIL_HOST}:${EMAIL_PORT}) as ${EMAIL_USER}`);
        return true;
    } catch (err) {
        console.error('[email] SMTP verification failed:', err.message);
        return false;
    }
}

// Sends one email. Never throws - callers (attendance/results/fees/homework
// routes) must not fail their main request just because an email didn't go out.
// Returns { sent: boolean, error?: string, skipped?: boolean }.
async function sendMail({ to, subject, html, text, attachments }) {
    if (!to) {
        console.warn(`[email] Skipped "${subject}": no recipient address.`);
        return { sent: false, skipped: true, error: 'No recipient' };
    }
    const t = getTransporter();
    if (!t) {
        console.log(`[email] (disabled) Would send "${subject}" to ${to}`);
        return { sent: false, skipped: true };
    }
    try {
        await t.sendMail({
            from: `"${EMAIL_FROM_NAME}" <${EMAIL_USER}>`,
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
            attachments
        });
        console.log(`[email] Sent "${subject}" to ${to}`);
        return { sent: true };
    } catch (err) {
        console.error(`[email] Failed to send "${subject}" to ${to}:`, err.message);
        return { sent: false, error: err.message };
    }
}

module.exports = { sendMail, verifyConnection, isConfigured };

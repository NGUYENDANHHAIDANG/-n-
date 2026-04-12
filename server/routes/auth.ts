import express from 'express';
import nodemailer from 'nodemailer';
import { User } from '../models/User';

const router = express.Router();

// --- CONFIGURATION ---
// You must use an "App Password" for Gmail, not your login password.
// Go to Google Account -> Security -> 2-Step Verification -> App Passwords
const getGmailCredentials = () => ({
    user: process.env.GMAIL_USER || 'dang0945392289@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || 'nftc hzva cohz fuqc'
});

const createTransporter = () => {
    const { user, pass } = getGmailCredentials();
    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });
};

// --- API ENDPOINTS ---

// SEND VERIFICATION CODE
router.post('/send-code', async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ success: false, message: 'Missing email or code' });
    }

    const { user: gmailUser, pass: gmailPassword } = getGmailCredentials();
    if (!gmailUser || !gmailPassword) {
        console.warn('[Node Server] GMAIL_USER or GMAIL_APP_PASSWORD not set. Skipping actual email send.');
        return res.json({ success: true, message: 'Email sending skipped (credentials not configured)', mock: true });
    }

    const transporter = createTransporter();
    const mailOptions = {
        from: '"ChatApp Security" <noreply@chatapp.com>',
        to: email,
        subject: 'Your Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #2AABEE;">ChatApp Verification</h2>
                <p>Hello,</p>
                <p>Your verification code is:</p>
                <h1 style="background: #f4f4f4; padding: 10px; text-align: center; letter-spacing: 5px; border-radius: 5px;">${code}</h1>
                <p>This code will expire in 5 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[Node Server] Email sent to ${email}`);
        res.json({ success: true, message: 'Email sent successfully' });
    } catch (error: any) {
        console.error('[Node Server] Error sending email:', error);
        res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
    }
});

// REGISTER
router.post('/register', async (req, res) => {
    const { email, password, name, avatar } = req.body;
    
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        const newUser = new User({
            name,
            email,
            password, // In production, hash this!
            avatar: avatar || `https://picsum.photos/seed/${name}/200/200`,
            blockedUsers: []
        });

        await newUser.save();
        res.json({ success: true, user: newUser });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        res.json({ success: true, user });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Login failed', error: error.message });
    }
});

export default router;

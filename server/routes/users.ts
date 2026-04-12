import express from 'express';
import { User } from '../models/User';

const router = express.Router();

// Get User by Email
router.get('/by-email/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// Get User Profile
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// Update Profile
router.put('/:id', async (req, res) => {
    const { name, avatar } = req.body;
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id, 
            { name, avatar }, 
            { new: true }
        );
        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// Block User
router.post('/:id/block', async (req, res) => {
    const { targetUserId } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.blockedUsers.includes(targetUserId)) {
            user.blockedUsers.push(targetUserId);
            await user.save();
        }
        res.json({ success: true, blockedUsers: user.blockedUsers });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// Unblock User
router.post('/:id/unblock', async (req, res) => {
    const { targetUserId } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.blockedUsers = user.blockedUsers.filter(id => id !== targetUserId);
        await user.save();
        res.json({ success: true, blockedUsers: user.blockedUsers });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;

import express from 'express';
import { FriendRequest } from '../models/FriendRequest';
import { User } from '../models/User';
import { Chat } from '../models/Chat';

const router = express.Router();

// Send Friend Request
router.post('/request', async (req, res) => {
    const { senderId, receiverEmail } = req.body;
    try {
        const receiver = await User.findOne({ email: receiverEmail });
        if (!receiver) return res.status(404).json({ success: false, message: 'User not found' });
        
        if (receiver._id.toString() === senderId) {
            return res.status(400).json({ success: false, message: 'Cannot add yourself' });
        }

        const existing = await FriendRequest.findOne({
            $or: [
                { senderId, receiverId: receiver._id },
                { senderId: receiver._id, receiverId: senderId }
            ],
            status: { $in: ['pending', 'accepted'] }
        } as any);

        if (existing) {
            return res.status(400).json({ success: false, message: 'Request pending or already friends' });
        }

        const newReq = new FriendRequest({
            senderId,
            receiverId: receiver._id
        });
        await newReq.save();

        res.json({ success: true, message: 'Request sent' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Pending Requests
router.get('/requests/:userId', async (req, res) => {
    try {
        const requests = await FriendRequest.find({ 
            receiverId: req.params.userId, 
            status: 'pending' 
        }).populate('senderId', 'name avatar');
        
        const formatted = requests.map((r: any) => ({
            id: r._id,
            senderId: r.senderId._id,
            senderName: r.senderId.name,
            senderAvatar: r.senderId.avatar,
            timestamp: r.timestamp
        }));

        res.json(formatted);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// Respond to Request
router.post('/respond', async (req, res) => {
    const { requestId, action } = req.body; // action: 'accept' | 'reject'
    try {
        const reqObj = await FriendRequest.findById(requestId);
        if (!reqObj) return res.status(404).json({ message: 'Request not found' });

        reqObj.status = action === 'accept' ? 'accepted' : 'rejected';
        await reqObj.save();

        if (action === 'accept') {
            // Create Chat
            const newChat = new Chat({
                participants: [reqObj.senderId, reqObj.receiverId],
                lastMessage: 'You are now connected',
                unreadCounts: {}
            });
            await newChat.save();
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;

import express from 'express';
import { Chat } from '../models/Chat';
import { Message } from '../models/Message';
import { User } from '../models/User';

const router = express.Router();

// Get Chats for User
router.get('/user/:userId', async (req, res) => {
    try {
        // Find chats where user is a participant
        const chats = await Chat.find({ participants: req.params.userId })
            .populate('participants', 'name avatar email blockedUsers')
            .sort({ lastMessageTime: -1 });
        
        // Transform for frontend
        const formattedChats = chats.map(chat => {
            const partner = chat.participants.find((p: any) => p._id.toString() !== req.params.userId) as any;
            if (!partner) return null;

            // Check if blocked
            // Note: In a real app, you'd check both ways. Here we check if current user blocked partner.
            // But we need the current user object to know if *they* blocked the partner.
            // For simplicity, we'll return the raw data and let frontend handle or do a second query.
            
            return {
                id: chat._id,
                partnerId: partner._id,
                name: partner.name,
                avatar: partner.avatar,
                lastMessage: chat.lastMessage || 'Start chatting',
                lastMessageTime: chat.lastMessageTime,
                unreadCount: chat.unreadCounts?.get(req.params.userId) || 0,
                isOnline: false, // TODO: Implement real online status via Socket.IO
                relationshipStatus: 'friend' // Logic for blocked needs to be handled
            };
        }).filter(Boolean);

        res.json(formattedChats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// Get Messages for Chat
router.get('/:chatId/messages', async (req, res) => {
    try {
        const { chatId } = req.params;
        let chat;
        
        // Handle both ObjectId and string chatId formats
        if (/^[0-9a-fA-F]{24}$/.test(chatId)) {
            // It's an ObjectId
            chat = await Chat.findById(chatId);
        } else if (chatId.startsWith('c_')) {
            // Extract participant IDs from chatId format: c_user1_user2
            const parts = chatId.split('_');
            if (parts.length === 3) {
                const user1 = parts[1];
                const user2 = parts[2];
                chat = await Chat.findOne({ 
                    participants: { $all: [user1, user2] }
                });
            }
        }
        
        if (!chat) {
            return res.json([]); // Return empty array if chat not found
        }
        
        const messages = await Message.find({ chatId: chat._id }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// Send Message
router.post('/message', async (req, res) => {
    const { chatId, senderId, text, image } = req.body;
    try {
        console.log('Received message request:', { chatId, senderId, text });
        
        // Check if chat exists, if not create it
        let chat;
        
        // Only try findById if chatId is a valid ObjectId (24 hex characters)
        if (/^[0-9a-fA-F]{24}$/.test(chatId)) {
            console.log('Looking for existing chat by ObjectId');
            chat = await Chat.findById(chatId);
        }
        
        if (!chat) {
            console.log('Chat not found, trying to find/create by participants');
            // Try to find by participants if chatId is not ObjectId or chat not found
            if (chatId.startsWith('c_')) {
                // Extract participant IDs from chatId format: c_user1_user2
                const parts = chatId.split('_');
                if (parts.length === 3) {
                    const user1 = parts[1];
                    const user2 = parts[2];
                    console.log('Looking for chat with participants:', user1, user2);
                    chat = await Chat.findOne({ 
                        participants: { $all: [user1, user2] }
                    });
                    
                    if (!chat) {
                        console.log('Creating new chat');
                        chat = new Chat({
                            participants: [user1, user2],
                            lastMessage: image ? '📷 Photo' : text,
                            lastMessageTime: new Date()
                        });
                        await chat.save();
                        console.log('Chat created with ID:', chat._id);
                    }
                }
            }
        }

        if (!chat) {
            console.log('Chat not found and could not be created');
            return res.status(404).json({ message: 'Chat not found and could not be created' });
        }

        console.log('Using chat:', chat._id);
        const newMessage = new Message({
            chatId: chat._id.toString(),
            senderId,
            text,
            image,
            isOwn: true // This is relative, frontend handles it
        });
        await newMessage.save();
        console.log('Message saved:', newMessage._id);

        // Update Chat
        chat.lastMessage = image ? '📷 Photo' : text;
        chat.lastMessageTime = new Date();
        await chat.save();
        console.log('Chat updated');

        res.json(newMessage);
    } catch (error: any) {
        console.error('Error in /message:', error);
        res.status(500).json({ message: error.message });
    }
});

export default router;

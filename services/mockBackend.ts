// This file simulates a Backend + Database + Socket.IO environment
import { User, Chat, Message, FriendRequest, Post, Comment, Reaction } from '../types';
import emailjs from '@emailjs/browser';

// --- CONFIGURATION FOR REAL EMAIL (EMAILJS - Fallback) ---
const EMAILJS_SERVICE_ID = 'service_ifnxg0c'; // Replace with your EmailJS Service ID
const EMAILJS_TEMPLATE_ID = 'template_vmmmjim'; 
const EMAILJS_PUBLIC_KEY = 'Wmgo04Qkgt1wKuRuI';   

// --- MOCK DATABASE (PostgreSQL simulation) ---
const loadData = <T>(key: string, defaults: T): T => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaults;
};

const DEFAULT_USERS: User[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@gmail.com', password: '123456', avatar: 'https://picsum.photos/id/64/200/200', blockedUsers: [] },
  { id: 'u2', name: 'Alice Wonderland', email: 'alice@gmail.com', password: '123456', avatar: 'https://picsum.photos/id/1011/200/200', blockedUsers: [] },
  { id: 'u3', name: 'Bob Builder', email: 'bob@gmail.com', password: '123456', avatar: 'https://picsum.photos/id/1025/200/200', blockedUsers: [] },
  { id: 'u4', name: 'John Doe', email: 'john@gmail.com', password: '123456', avatar: 'https://picsum.photos/id/1005/200/200', blockedUsers: [] },
];

let USERS_DB: User[] = loadData('mock_users', DEFAULT_USERS);

// Ensure dangcute@gmail.com exists
if (!USERS_DB.find(u => u.email === 'dangcute@gmail.com')) {
    USERS_DB.push({
        id: 'u_dangcute',
        name: 'Dang Cute',
        email: 'dangcute@gmail.com',
        password: '123456',
        avatar: 'https://picsum.photos/seed/dangcute/200/200',
        blockedUsers: []
    });
    localStorage.setItem('mock_users', JSON.stringify(USERS_DB));
}

let FRIEND_REQUESTS_DB: FriendRequest[] = loadData('mock_requests', []);
let CHATS_DB: { userId: string, partnerId: string, chatId: string, type?: 'direct'|'group'|'channel'|'saved', isSecret?: boolean, name?: string, avatar?: string, memberCount?: number, adminIds?: string[], pinnedMessageIds?: string[] }[] = loadData('mock_chats', []);
let MESSAGES_DB: Message[] = loadData('mock_messages', []);
let POSTS_DB: Post[] = loadData('mock_posts', []);
let NOTIFICATIONS_DB: AppNotification[] = loadData('mock_notifications', []);

// Online Status: Map<UserId, Timestamp>
let ONLINE_STATUS: Record<string, number> = loadData('mock_online_status', {});

// --- MOCK REDIS FOR OTP (Persistence & Expiry) ---
interface OTPRecord {
    code: string;
    expiresAt: number; // Unix timestamp
}
// Load pending OTPs from "Redis" (LocalStorage)
let OTP_REDIS: Record<string, OTPRecord> = loadData('mock_redis_otp', {});

// Initialize friendship for demo if first time
if (!localStorage.getItem('mock_init')) {
    CHATS_DB.push({ userId: 'u1', partnerId: 'u2', chatId: 'c_u1_u2', type: 'direct' });
    CHATS_DB.push({ userId: 'u2', partnerId: 'u1', chatId: 'c_u1_u2', type: 'direct' });
    
    // Add Saved Messages (Cloud)
    CHATS_DB.push({ userId: 'u1', partnerId: 'u1', chatId: 'c_saved_u1', type: 'saved' });

    // Add a massive group
    CHATS_DB.push({ userId: 'u1', partnerId: 'g1', chatId: 'c_g1', type: 'group', name: 'Global Community', avatar: 'https://picsum.photos/seed/group/200/200', memberCount: 154320, adminIds: ['u1'] });

    // Add a channel
    CHATS_DB.push({ userId: 'u1', partnerId: 'ch1', chatId: 'c_ch1', type: 'channel', name: 'Tech News Daily', avatar: 'https://picsum.photos/seed/channel/200/200', memberCount: 2500000, adminIds: ['u2'] });

    localStorage.setItem('mock_init', 'true');
    localStorage.setItem('mock_chats', JSON.stringify(CHATS_DB));
}

const saveData = () => {
    localStorage.setItem('mock_users', JSON.stringify(USERS_DB));
    localStorage.setItem('mock_requests', JSON.stringify(FRIEND_REQUESTS_DB));
    localStorage.setItem('mock_chats', JSON.stringify(CHATS_DB));
    localStorage.setItem('mock_messages', JSON.stringify(MESSAGES_DB));
    localStorage.setItem('mock_posts', JSON.stringify(POSTS_DB));
    localStorage.setItem('mock_notifications', JSON.stringify(NOTIFICATIONS_DB));
    localStorage.setItem('mock_online_status', JSON.stringify(ONLINE_STATUS));
    
    // Save Redis state
    localStorage.setItem('mock_redis_otp', JSON.stringify(OTP_REDIS));
};

// Sync across tabs
window.addEventListener('storage', (e) => {
    if (e.key === 'mock_users' && e.newValue) USERS_DB = JSON.parse(e.newValue);
    if (e.key === 'mock_requests' && e.newValue) FRIEND_REQUESTS_DB = JSON.parse(e.newValue);
    if (e.key === 'mock_chats' && e.newValue) CHATS_DB = JSON.parse(e.newValue);
    if (e.key === 'mock_messages' && e.newValue) MESSAGES_DB = JSON.parse(e.newValue);
    if (e.key === 'mock_posts' && e.newValue) POSTS_DB = JSON.parse(e.newValue);
    if (e.key === 'mock_notifications' && e.newValue) NOTIFICATIONS_DB = JSON.parse(e.newValue);
    if (e.key === 'mock_online_status' && e.newValue) ONLINE_STATUS = JSON.parse(e.newValue);
    if (e.key === 'mock_redis_otp' && e.newValue) OTP_REDIS = JSON.parse(e.newValue);
});

// --- BACKEND API SIMULATION ---

export const mockEnsureAllUsersHaveKeys = async () => {
    let updated = false;
    for (const u of USERS_DB) {
        if (!u.publicKey) {
            const { generateRSAKeyPair } = await import('../utils/crypto');
            const keys = await generateRSAKeyPair();
            u.publicKey = keys.publicKey;
            localStorage.setItem(`privKey_${u.id}`, keys.privateKey);
            updated = true;
        }
    }
    if (updated) {
        saveData();
    }
};

export const mockLogin = async (email: string, password: string): Promise<User | null> => {
    await new Promise(resolve => setTimeout(resolve, 500)); 
    const user = USERS_DB.find(u => (u.email === email || u.email === `${email}@gmail.com`) && u.password === password);
    return user || null;
};

// Send Verification Code (NODE.JS SERVER -> EMAILJS -> ALERT FALLBACK)
export const mockSendVerificationCode = async (email: string): Promise<boolean> => {
    // 1. Check if email already exists
    const exists = USERS_DB.find(u => u.email === email);
    if (exists) {
        alert(`Email ${email} is already registered!`);
        return false;
    }

    // 2. Generate random 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 3. Set Expiry (5 minutes from now)
    const TTL = 5 * 60 * 1000; 
    const expiresAt = Date.now() + TTL;

    // 4. Save to "Redis"
    OTP_REDIS[email] = { code, expiresAt };
    saveData();

    console.log(`[SYSTEM] Generated Code for ${email}: ${code} (Expires in 5 mins)`);

    // --- STRATEGY 1: TRY LOCAL NODE.JS SERVER (Nodemailer) ---
    try {
        console.log("[SYSTEM] Attempting to contact Node.js server...");
        // Use relative path since backend is now served on the same port (3000) via Vite middleware
        const response = await fetch('/api/send-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, code }),
        });

        if (response.ok) {
            console.log(`[Node Server] Success! Email sent to ${email}`);
            return true;
        } else {
            console.warn("[Node Server] Server responded with error, falling back...");
        }
    } catch (err) {
        console.warn("[Node Server] Connection failed. Falling back to EmailJS/Alert.");
    }

    // --- STRATEGY 2: TRY EMAILJS (Client-side) ---
    const isConfigured = 
        EMAILJS_SERVICE_ID !== 'service_ifnxg0c' && 
        EMAILJS_PUBLIC_KEY !== 'Wmgo04Qkgt1wKuRuI';

    if (isConfigured) {
        try {
            await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                {
                    to_email: email,
                    otp_code: code,
                    otp: code,
                    message: code,
                    reply_to: 'noreply@chatapp.com'
                },
                EMAILJS_PUBLIC_KEY
            );
            console.log(`[EmailJS] Email sent successfully to ${email}`);
            return true;
        } catch (error) {
            console.error('[EmailJS Error]', error);
        }
    }

    // --- STRATEGY 3: FALLBACK (Dev Mode) ---
    await new Promise(resolve => setTimeout(resolve, 600)); 
    console.log(`[DEV MODE] Could not connect to Node.js backend nor EmailJS. Your Verification Code is: ${code}`);
    return true;
};

export const mockCheckEmail = async (email: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return !!USERS_DB.find(u => u.email === email);
};

export const mockRegister = async (email: string, password: string, name: string, publicKey?: string): Promise<User | null> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if email already exists
    const exists = USERS_DB.find(u => u.email === email);
    if (exists) {
        return null;
    }

    const isAdmin = email === 'dang0945392289@gmail.com' || email === 'admin@chatapp.com';

    const newUser: User = {
        id: `u_${Date.now()}`,
        name,
        email,
        password, 
        avatar: `https://picsum.photos/seed/${name}/200/200`,
        publicKey,
        role: isAdmin ? 'admin' : 'user'
    };
    USERS_DB.push(newUser);
    saveData();
    return newUser;
};

export const mockUpdateUser = async (userId: string, name: string, avatar: string, publicKey?: string): Promise<User | null> => {
    const idx = USERS_DB.findIndex(u => u.id === userId);
    if (idx !== -1) {
        USERS_DB[idx] = { ...USERS_DB[idx], name, avatar, ...(publicKey && { publicKey }) };
        saveData();
        return USERS_DB[idx];
    }
    return null;
};

export const mockSearchUser = async (email: string): Promise<User | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return USERS_DB.find(u => u.email === email || u.email === `${email}@gmail.com`) || null;
};

export const mockGetUserById = async (id: string): Promise<User | null> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return USERS_DB.find(u => u.id === id) || null;
};

export const mockGetAllUsers = async (currentUserId: string): Promise<User[]> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const now = Date.now();
    const isUserOnline = (uid: string) => {
        const lastSeen = ONLINE_STATUS[uid];
        return lastSeen && (now - lastSeen < 20000); // 20 seconds
    };
    return USERS_DB.filter(u => u.id !== currentUserId).map(u => ({
        ...u,
        isOnline: !!isUserOnline(u.id)
    }));
};

export const mockDeleteUser = async (adminId: string, targetUserId: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const admin = USERS_DB.find(u => u.id === adminId);
    if (!admin || admin.role !== 'admin') return false;

    const idx = USERS_DB.findIndex(u => u.id === targetUserId);
    if (idx !== -1) {
        USERS_DB.splice(idx, 1);
        saveData();
        return true;
    }
    return false;
};

export const mockUpdateUserRole = async (adminId: string, targetUserId: string, newRole: 'user' | 'admin'): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const admin = USERS_DB.find(u => u.id === adminId);
    if (!admin || admin.role !== 'admin') return false;

    const idx = USERS_DB.findIndex(u => u.id === targetUserId);
    if (idx !== -1) {
        USERS_DB[idx].role = newRole;
        saveData();
        return true;
    }
    return false;
};

// Heartbeat to keep user online
export const mockHeartbeat = (userId: string) => {
    ONLINE_STATUS[userId] = Date.now();
    saveData(); // Persist timestamp
};

export const mockBlockUser = async (currentUserId: string, targetUserId: string): Promise<void> => {
    const userIndex = USERS_DB.findIndex(u => u.id === currentUserId);
    if (userIndex !== -1) {
        const user = USERS_DB[userIndex];
        if (!user.blockedUsers) user.blockedUsers = [];
        if (!user.blockedUsers.includes(targetUserId)) {
            user.blockedUsers.push(targetUserId);
            saveData();
        }
    }
};

export const mockUnblockUser = async (currentUserId: string, targetUserId: string): Promise<void> => {
    const userIndex = USERS_DB.findIndex(u => u.id === currentUserId);
    if (userIndex !== -1) {
        const user = USERS_DB[userIndex];
        if (user.blockedUsers) {
            user.blockedUsers = user.blockedUsers.filter(id => id !== targetUserId);
            saveData();
        }
    }
};

export const mockGetChats = async (currentUserId: string): Promise<Chat[]> => {
    // Determine who is online (active in last 20 seconds)
    const now = Date.now();
    const isUserOnline = (uid: string) => {
        const lastSeen = ONLINE_STATUS[uid];
        return lastSeen && (now - lastSeen < 20000);
    };

    const currentUser = USERS_DB.find(u => u.id === currentUserId);
    const myChats = CHATS_DB.filter(c => c.userId === currentUserId);
    
    const chats: Chat[] = myChats.map(c => {
        let partnerName = '';
        let partnerAvatar = '';
        let isOnline = false;
        let lastSeenTimestamp: number | undefined = undefined;
        let relStatus: 'friend' | 'blocked' | 'blocked_by_partner' | 'none' = 'friend';

        let members: string[] = [];

        if (c.type === 'saved') {
            partnerName = 'Saved Messages';
            partnerAvatar = 'https://picsum.photos/seed/saved/200/200'; // Or a cloud icon
        } else if (c.type === 'group' || c.type === 'channel') {
            partnerName = c.name || 'Group';
            partnerAvatar = c.avatar || 'https://picsum.photos/seed/group/200/200';
            relStatus = 'none';
            members = CHATS_DB.filter(chat => chat.chatId === c.chatId).map(chat => chat.userId);
        } else {
            const partner = USERS_DB.find(u => u.id === c.partnerId);
            if (!partner) return null;
            partnerName = partner.name;
            partnerAvatar = partner.avatar;
            isOnline = isUserOnline(partner.id);
            lastSeenTimestamp = ONLINE_STATUS[partner.id];

            if (currentUser?.blockedUsers?.includes(partner.id)) {
                relStatus = 'blocked';
            } else if (partner?.blockedUsers?.includes(currentUser.id)) {
                relStatus = 'blocked_by_partner';
            }
        }

        // Get last message for this chat
        const chatMsgs = MESSAGES_DB.filter(m => m.chatId === c.chatId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const lastMsg = chatMsgs[0];

        let lastMessageText = 'Start chatting';
        if (lastMsg) {
            if (lastMsg.fileUrl) lastMessageText = '📁 File';
            else if (lastMsg.image) lastMessageText = '📷 Photo';
            else lastMessageText = lastMsg.text;
        }

        return {
            id: c.chatId,
            partnerId: c.partnerId,
            name: partnerName,
            avatar: partnerAvatar,
            lastMessage: lastMessageText,
            lastMessageTime: lastMsg ? new Date(lastMsg.timestamp) : new Date(),
            unreadCount: 0, 
            isOnline: isOnline,
            lastSeen: lastSeenTimestamp ? new Date(lastSeenTimestamp) : undefined,
            relationshipStatus: relStatus,
            type: c.type || 'direct',
            isSecret: c.isSecret,
            memberCount: c.memberCount,
            members: members,
            adminIds: c.adminIds,
            pinnedMessageIds: c.pinnedMessageIds
        } as Chat;
    }).filter(c => c !== null) as Chat[];

    return chats.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
};

export const mockSendFriendRequestById = async (senderId: string, receiverId: string): Promise<{ success: boolean, message: string }> => {
    const receiver = USERS_DB.find(u => u.id === receiverId);
    if (!receiver) return { success: false, message: 'User not found.' };
    if (receiver.id === senderId) return { success: false, message: 'Cannot add yourself.' };

    const existing = FRIEND_REQUESTS_DB.find(r => 
        (r.senderId === senderId && r.receiverId === receiver.id) || 
        (r.senderId === receiver.id && r.receiverId === senderId)
    );
    if (existing) {
        if (existing.status === 'pending') return { success: false, message: 'Request already pending.' };
        if (existing.status === 'accepted') return { success: false, message: 'Already friends.' };
    }

    const sender = USERS_DB.find(u => u.id === senderId)!;
    const newReq: FriendRequest = {
        id: `fr_${Date.now()}`,
        senderId,
        senderName: sender.name,
        senderAvatar: sender.avatar,
        receiverId: receiver.id,
        status: 'pending',
        timestamp: new Date()
    };
    FRIEND_REQUESTS_DB.push(newReq);

    // Create notification
    NOTIFICATIONS_DB.push({
        id: `notif_${Date.now()}`,
        userId: receiver.id,
        actorId: sender.id,
        actorName: sender.name,
        actorAvatar: sender.avatar,
        type: 'friend_request',
        isRead: false,
        timestamp: new Date()
    });

    saveData();
    return { success: true, message: 'Request sent!' };
};

export const mockSendFriendRequest = async (senderId: string, receiverEmail: string): Promise<{ success: boolean, message: string }> => {
    const receiver = USERS_DB.find(u => u.email === receiverEmail || u.email === `${receiverEmail}@gmail.com`);
    if (!receiver) return { success: false, message: 'User not found.' };
    if (receiver.id === senderId) return { success: false, message: 'Cannot add yourself.' };

    const existing = FRIEND_REQUESTS_DB.find(r => 
        (r.senderId === senderId && r.receiverId === receiver.id) || 
        (r.senderId === receiver.id && r.receiverId === senderId)
    );
    if (existing) {
        if (existing.status === 'pending') return { success: false, message: 'Request already pending.' };
        if (existing.status === 'accepted') return { success: false, message: 'Already friends.' };
    }

    const sender = USERS_DB.find(u => u.id === senderId)!;
    const newReq: FriendRequest = {
        id: `fr_${Date.now()}`,
        senderId,
        senderName: sender.name,
        senderAvatar: sender.avatar,
        receiverId: receiver.id,
        status: 'pending',
        timestamp: new Date()
    };
    FRIEND_REQUESTS_DB.push(newReq);
    saveData();
    return { success: true, message: 'Request sent!' };
};

export const mockGetFriendRequests = async (userId: string): Promise<FriendRequest[]> => {
    return FRIEND_REQUESTS_DB.filter(r => r.receiverId === userId && r.status === 'pending').map(r => ({
        ...r,
        timestamp: new Date(r.timestamp)
    }));
};

export const mockGetOutgoingFriendRequests = async (userId: string): Promise<FriendRequest[]> => {
    return FRIEND_REQUESTS_DB.filter(r => r.senderId === userId && r.status === 'pending').map(r => ({
        ...r,
        timestamp: new Date(r.timestamp)
    }));
};

export const mockCancelFriendRequest = async (senderId: string, receiverId: string): Promise<{ success: boolean, message: string }> => {
    const reqIndex = FRIEND_REQUESTS_DB.findIndex(r => r.senderId === senderId && r.receiverId === receiverId && r.status === 'pending');
    if (reqIndex === -1) return { success: false, message: 'Request not found.' };

    const req = FRIEND_REQUESTS_DB[reqIndex];
    
    // Remove the friend request
    FRIEND_REQUESTS_DB.splice(reqIndex, 1);

    // Remove the associated notification
    NOTIFICATIONS_DB = NOTIFICATIONS_DB.filter(n => !(n.type === 'friend_request' && n.userId === receiverId && n.actorId === senderId));

    saveData();
    return { success: true, message: 'Request cancelled.' };
};

export const mockRespondFriendRequest = async (requestId: string, action: 'accept' | 'reject'): Promise<void> => {
    const reqIndex = FRIEND_REQUESTS_DB.findIndex(r => r.id === requestId);
    if (reqIndex === -1) return;

    if (action === 'accept') {
        FRIEND_REQUESTS_DB[reqIndex].status = 'accepted';
        const req = FRIEND_REQUESTS_DB[reqIndex];
        
        const sortedIds = [req.senderId, req.receiverId].sort();
        const chatId = `c_${sortedIds[0]}_${sortedIds[1]}`;
        
        // Ensure not duplicate
        if (!CHATS_DB.find(c => c.userId === req.senderId && c.partnerId === req.receiverId)) {
            CHATS_DB.push({ userId: req.senderId, partnerId: req.receiverId, chatId, type: 'direct' });
        }
        if (!CHATS_DB.find(c => c.userId === req.receiverId && c.partnerId === req.senderId)) {
            CHATS_DB.push({ userId: req.receiverId, partnerId: req.senderId, chatId, type: 'direct' });
        }

        const receiver = USERS_DB.find(u => u.id === req.receiverId);
        if (receiver) {
            NOTIFICATIONS_DB.push({
                id: `notif_${Date.now()}`,
                userId: req.senderId,
                actorId: receiver.id,
                actorName: receiver.name,
                actorAvatar: receiver.avatar,
                type: 'friend_accept',
                isRead: false,
                timestamp: new Date()
            });
        }
    } else {
        FRIEND_REQUESTS_DB[reqIndex].status = 'rejected';
    }
    saveData();
};

// Message Handling
export const mockCreateGroup = async (userId: string, name: string, isChannel: boolean = false, memberIds: string[] = []): Promise<void> => {
    const chatId = `c_g_${Date.now()}`;
    const allMembers = [userId, ...memberIds];
    
    // Add chat relation for all members
    allMembers.forEach(memberId => {
        CHATS_DB.push({
            userId: memberId,
            partnerId: chatId,
            chatId,
            type: isChannel ? 'channel' : 'group',
            name,
            avatar: `https://picsum.photos/seed/${chatId}/200/200`,
            memberCount: allMembers.length,
            adminIds: [userId]
        });
    });
    saveData();
};

export const mockCreateDirectChat = async (userId: string, partnerId: string): Promise<void> => {
    const sortedIds = [userId, partnerId].sort();
    const chatId = `c_${sortedIds[0]}_${sortedIds[1]}`;
    
    const existingUserChat = CHATS_DB.find(c => c.chatId === chatId && c.userId === userId);
    if (!existingUserChat) {
        CHATS_DB.push({ userId, partnerId, chatId, type: 'direct' });
    }
    
    const existingPartnerChat = CHATS_DB.find(c => c.chatId === chatId && c.userId === partnerId);
    if (!existingPartnerChat) {
        CHATS_DB.push({ userId: partnerId, partnerId: userId, chatId, type: 'direct' });
    }
    
    saveData();
};

export const mockCreateSecretChat = async (userId: string, partnerId: string): Promise<string> => {
    const chatId = `c_sec_${Date.now()}`;
    CHATS_DB.push({ userId, partnerId, chatId, type: 'direct', isSecret: true });
    CHATS_DB.push({ userId: partnerId, partnerId: userId, chatId, type: 'direct', isSecret: true });
    saveData();
    return chatId;
};

export const mockPinMessage = async (chatId: string, messageId: string): Promise<void> => {
    CHATS_DB.forEach(c => {
        if (c.chatId === chatId) {
            if (!c.pinnedMessageIds) c.pinnedMessageIds = [];
            if (!c.pinnedMessageIds.includes(messageId)) {
                c.pinnedMessageIds.push(messageId);
            } else {
                c.pinnedMessageIds = c.pinnedMessageIds.filter(id => id !== messageId);
            }
        }
    });
    saveData();
};

export const mockSendMessage = async (msg: Message): Promise<void> => {
    // Check for block
    const sender = USERS_DB.find(u => u.id === msg.senderId);
    
    // We need to find the partnerId. Since chatId is usually c_u1_u2, we can extract it, 
    // or we can find it from existing CHATS_DB or FRIEND_REQUESTS_DB.
    // A simpler way is to find any existing chat relation for this chatId to get the partnerId.
    const existingChat = CHATS_DB.find(c => c.chatId === msg.chatId);
    let partnerId = '';
    
    if (existingChat) {
        partnerId = existingChat.userId === msg.senderId ? existingChat.partnerId : existingChat.userId;
    } else {
        // If no relation exists at all, try to extract from chatId (format: c_id1_id2)
        const parts = msg.chatId.split('_');
        if (parts.length === 3) {
            partnerId = parts[1] === msg.senderId ? parts[2] : parts[1];
        }
    }

    if (partnerId) {
        const partner = USERS_DB.find(u => u.id === partnerId);
        
        // If sender blocked partner, or partner blocked sender
        if (sender?.blockedUsers?.includes(partnerId) || partner?.blockedUsers?.includes(msg.senderId)) {
            console.log("Message blocked");
            return;
        }

        // Recreate chat relation if it was deleted (only for direct non-secret chats)
        const existingChatForSender = CHATS_DB.find(c => c.chatId === msg.chatId && c.userId === msg.senderId);
        if (!existingChatForSender && !msg.chatId.includes('sec') && !msg.chatId.includes('saved')) {
            CHATS_DB.push({ userId: msg.senderId, partnerId: partnerId, chatId: msg.chatId, type: 'direct' });
        }
        const existingChatForPartner = CHATS_DB.find(c => c.chatId === msg.chatId && c.userId === partnerId);
        if (!existingChatForPartner && !msg.chatId.includes('sec') && !msg.chatId.includes('saved')) {
            CHATS_DB.push({ userId: partnerId, partnerId: msg.senderId, chatId: msg.chatId, type: 'direct' });
        }
    }

    MESSAGES_DB.push(msg);
    saveData();
};

export const mockGetMessages = async (chatId: string, currentUserId?: string): Promise<Message[]> => {
    let messages = MESSAGES_DB.filter(m => m.chatId === chatId);
    
    if (currentUserId) {
        const currentUser = USERS_DB.find(u => u.id === currentUserId);
        if (currentUser && currentUser.blockedUsers) {
            // Filter out messages from users that the current user has blocked
            messages = messages.filter(m => !currentUser.blockedUsers!.includes(m.senderId));
        }
    }
    
    return messages.map(m => ({
        ...m,
        isOwn: currentUserId ? m.senderId === currentUserId : m.isOwn,
        timestamp: new Date(m.timestamp)
    }));
};

export const mockDeleteMessage = async (msgId: string): Promise<void> => {
    MESSAGES_DB = MESSAGES_DB.filter(m => m.id !== msgId);
    saveData();
};

export const mockClearHistory = async (chatId: string): Promise<void> => {
    MESSAGES_DB = MESSAGES_DB.filter(m => m.chatId !== chatId);
    saveData();
};

export const mockDeleteChat = async (chatId: string, currentUserId: string): Promise<void> => {
    // Delete the chat relation for the current user
    CHATS_DB = CHATS_DB.filter(c => !(c.chatId === chatId && c.userId === currentUserId));
    // Also clear history for this user (optional, but usually deleting chat hides it)
    saveData();
};

// --- POSTS API SIMULATION ---

export const mockGetNotifications = async (userId: string): Promise<AppNotification[]> => {
    return NOTIFICATIONS_DB.filter(n => n.userId === userId).map(n => ({
        ...n,
        timestamp: new Date(n.timestamp)
    })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

export const mockMarkNotificationRead = async (notificationId: string): Promise<void> => {
    const notif = NOTIFICATIONS_DB.find(n => n.id === notificationId);
    if (notif) {
        notif.isRead = true;
        saveData();
    }
};

export const mockGetPosts = async (): Promise<Post[]> => {
    return POSTS_DB.map(p => ({
        ...p,
        timestamp: new Date(p.timestamp),
        comments: p.comments.map(c => ({ ...c, timestamp: new Date(c.timestamp) }))
    })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

export const mockCreatePost = async (userId: string, text: string, image?: string, feeling?: string): Promise<Post | null> => {
    const user = USERS_DB.find(u => u.id === userId);
    if (!user) return null;

    const newPost: Post = {
        id: `p_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        text,
        image,
        feeling,
        timestamp: new Date(),
        reactions: [],
        comments: []
    };

    POSTS_DB.push(newPost);
    saveData();
    return newPost;
};

export const mockAddComment = async (postId: string, userId: string, text: string): Promise<Comment | null> => {
    const user = USERS_DB.find(u => u.id === userId);
    const post = POSTS_DB.find(p => p.id === postId);
    if (!user || !post) return null;

    const newComment: Comment = {
        id: `c_${Date.now()}`,
        postId,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        text,
        timestamp: new Date()
    };

    post.comments.push(newComment);

    if (post.userId !== userId) {
        NOTIFICATIONS_DB.push({
            id: `notif_${Date.now()}`,
            userId: post.userId,
            actorId: user.id,
            actorName: user.name,
            actorAvatar: user.avatar,
            type: 'comment',
            postId: post.id,
            text: text.substring(0, 50),
            isRead: false,
            timestamp: new Date()
        });
    }

    saveData();
    return newComment;
};

export const mockToggleReaction = async (postId: string, userId: string, type: Reaction['type']): Promise<void> => {
    const post = POSTS_DB.find(p => p.id === postId);
    if (!post) return;

    const existingReactionIndex = post.reactions.findIndex(r => r.userId === userId);
    if (existingReactionIndex !== -1) {
        if (post.reactions[existingReactionIndex].type === type) {
            // Remove reaction if clicking the same one
            post.reactions.splice(existingReactionIndex, 1);
        } else {
            // Change reaction type
            post.reactions[existingReactionIndex].type = type;
        }
    } else {
        // Add new reaction
        post.reactions.push({ userId, type });
        
        if (post.userId !== userId) {
            const user = USERS_DB.find(u => u.id === userId);
            if (user) {
                NOTIFICATIONS_DB.push({
                    id: `notif_${Date.now()}`,
                    userId: post.userId,
                    actorId: user.id,
                    actorName: user.name,
                    actorAvatar: user.avatar,
                    type: 'reaction',
                    postId: post.id,
                    isRead: false,
                    timestamp: new Date()
                });
            }
        }
    }
    saveData();
};

export const mockToggleCommentReaction = async (postId: string, commentId: string, userId: string, type: Reaction['type']): Promise<void> => {
    const post = POSTS_DB.find(p => p.id === postId);
    if (!post) return;

    const comment = post.comments.find(c => c.id === commentId);
    if (!comment) return;

    if (!comment.reactions) {
        comment.reactions = [];
    }

    const existingReactionIndex = comment.reactions.findIndex(r => r.userId === userId);
    if (existingReactionIndex !== -1) {
        if (comment.reactions[existingReactionIndex].type === type) {
            comment.reactions.splice(existingReactionIndex, 1);
        } else {
            comment.reactions[existingReactionIndex].type = type;
        }
    } else {
        comment.reactions.push({ userId, type });
    }
    saveData();
};

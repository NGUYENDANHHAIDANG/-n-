import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { useAuth } from '../context/AuthContext';
import { Chat, Message, FriendRequest } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import { 
    mockGetChats, 
    mockGetFriendRequests, 
    mockSendFriendRequest, 
    mockRespondFriendRequest,
    mockSendMessage,
    mockGetMessages,
    mockHeartbeat,
    mockDeleteMessage,
    mockClearHistory,
    mockDeleteChat,
    mockBlockUser,
    mockUnblockUser,
    mockCreateGroup,
    mockCreateDirectChat,
    mockGetAllUsers
} from '../services/mockBackend';
import { User } from '../types';
import { encapsulateKyber, encryptMessage as pqcEncrypt } from '../utils/pqc';
import { socket } from '../utils/socket';

const ChatPage: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(location.state?.activeChatId || null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(!location.state?.activeChatId);
  
  // Friend Requests Data
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [outgoingFriendRequests, setOutgoingFriendRequests] = useState<FriendRequest[]>([]);
  
  // Modals state
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false); 
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSecretChatModal, setShowSecretChatModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    if ((showGroupModal || showSecretChatModal) && user) {
        mockGetAllUsers(user.id).then(setAllUsers);
    }
  }, [showGroupModal, showSecretChatModal, user]);

  // Form states for Add Friend
  const [addFriendError, setAddFriendError] = useState('');
  const [addFriendSuccess, setAddFriendSuccess] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  useEffect(() => {
    if (location.state?.activeChatId) {
      setActiveChatId(location.state.activeChatId);
      setIsMobileMenuOpen(false);
      
      // Clear the state so it doesn't re-trigger on reload
      window.history.replaceState({}, document.title)
    }
  }, [location.state]);

  // Polling / Heartbeat Interval & Socket
  useEffect(() => {
    if (!user) return;

    // Initial Load
    fetchData();
    
    // Heartbeat & Poll loop (Simulate Socket.IO Real-time fallback)
    const interval = setInterval(() => {
        mockHeartbeat(user.id);
        fetchData();
    }, 2000);

    // Socket.IO Setup
    socket.on('receive_message', (data) => {
      setMessages(prev => {
        const chatMsgs = prev[data.chatId] || [];
        // Prevent duplicates
        if (chatMsgs.find(m => m.id === data.id || (m.id === data._id && data._id))) return prev;
        
        // Map the received message with correct properties
        const receivedMessage: Message = {
          ...data,
          id: data._id || data.id, // Use MongoDB _id if available
          isOwn: data.senderId === user?.id,
          status: data.status || 'delivered',
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
        };
        
        return {
          ...prev,
          [data.chatId]: [...chatMsgs, receivedMessage]
        };
      });
    });

    return () => {
      clearInterval(interval);
      socket.off('receive_message');
    };
  }, [user, activeChatId]);

  useEffect(() => {
    if (activeChatId) {
      socket.emit('join_chat', activeChatId);
      // Load messages for the selected chat
      loadChatMessages(activeChatId);
    }
  }, [activeChatId]);

  const fetchData = async () => {
      if (!user) return;

      // Load Friend Requests
      const reqs = await mockGetFriendRequests(user.id);
      setFriendRequests(reqs);
      
      const { mockGetOutgoingFriendRequests } = await import('../services/mockBackend');
      const outgoingReqs = await mockGetOutgoingFriendRequests(user.id);
      setOutgoingFriendRequests(outgoingReqs);

      // Load Chats (includes online status)
      const fetchedChats = await mockGetChats(user.id);
      
      // Bot is client-side only for this demo, usually would be backend too
      const botChat: Chat = {
        id: 'c1',
        partnerId: 'gemini',
        name: 'Gemini AI Assistant',
        avatar: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT6f8q6h1F4dI6-wX6q2_4o_2o_2o_2o_2o&s',
        lastMessage: 'Hello! I am your AI assistant.',
        lastMessageTime: new Date(),
        unreadCount: 0,
        isBot: true,
        isOnline: true,
        isMuted: false,
        relationshipStatus: 'friend'
      };

      const allChats = [botChat, ...fetchedChats];
      setChats(allChats);

      // Load all users for online sidebar
      const users = await mockGetAllUsers(user.id);
      setAllUsers(users);
  };

  const loadChatMessages = async (chatId: string) => {
    if (!user || chatId === 'c1') return; // Skip for bot chat
    
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (response.ok) {
        const msgs = await response.json();
        // Map messages and set isOwn based on current user
        const mappedMsgs = msgs.map((msg: any) => {
          const isOwn = msg.senderId === user.id;
          return {
            ...msg,
            id: msg._id, // MongoDB uses _id
            isOwn,
            status: msg.status || 'sent',
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
          };
        });
        setMessages(prev => ({
          ...prev,
          [chatId]: mappedMsgs
        }));
        console.log('[MongoDB] Messages loaded for chat:', chatId, mappedMsgs.length, 'messages');
      } else {
        console.error('[MongoDB] Failed to load messages for chat:', chatId);
        // Fallback to mock backend
        const msgs = await mockGetMessages(chatId, user.id);
        setMessages(prev => ({
          ...prev,
          [chatId]: msgs
        }));
      }
    } catch (error) {
      console.error('[MongoDB] Error loading messages for chat:', chatId, error);
      // Fallback to mock backend
      const msgs = await mockGetMessages(chatId, user.id);
      setMessages(prev => ({
        ...prev,
        [chatId]: msgs
      }));
    }
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setIsMobileMenuOpen(false); 
    setChats(prevChats => 
      prevChats.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c)
    );
  };

  const handleBackToSidebar = () => {
    setIsMobileMenuOpen(true);
    setActiveChatId(null);
  };

  const handleDeleteChat = async () => {
    if (activeChatId && user) {
        await mockDeleteChat(activeChatId, user.id);
        setChats(prev => prev.filter(c => c.id !== activeChatId));
        setActiveChatId(null);
        setIsMobileMenuOpen(true);
        fetchData();
    }
  };

  const handleClearHistory = async () => {
    if (activeChatId) {
        await mockClearHistory(activeChatId);
        setMessages(prev => ({
            ...prev,
            [activeChatId]: []
        }));
        fetchData(); // Refresh chat list last message
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessageToDelete(messageId);
  };

  const confirmDeleteMessage = async () => {
    if (activeChatId && messageToDelete) {
        await mockDeleteMessage(messageToDelete);
        setMessages(prev => ({
            ...prev,
            [activeChatId]: prev[activeChatId].filter(m => m.id !== messageToDelete)
        }));
        setMessageToDelete(null);
        fetchData(); // Update last message in sidebar
    }
  };

  const handleMuteChat = () => {
    if (activeChatId) {
        setChats(prev => prev.map(c => 
            c.id === activeChatId ? { ...c, isMuted: !c.isMuted } : c
        ));
    }
  };

  const handleBlockUser = async () => {
    if (activeChatId && user) {
        const chat = chats.find(c => c.id === activeChatId);
        if (chat) {
            await mockBlockUser(user.id, chat.partnerId);
            fetchData();
        }
    }
  };

  const handleUnblockUser = async () => {
    if (activeChatId && user) {
        const chat = chats.find(c => c.id === activeChatId);
        if (chat) {
            await mockUnblockUser(user.id, chat.partnerId);
            fetchData();
        }
    }
  };

  const handleSendMessage = async (text: string, image?: string) => {
    if (!activeChatId || !user) return;

    const currentChat = chats.find(c => c.id === activeChatId);
    
    let pqcData;
    let messageText = text;

    // Encrypt if it's a secret chat and both users have public keys
    if (currentChat?.isSecret && user.publicKey) {
        const partner = allUsers.find(u => u.id === currentChat.partnerId);
        if (partner && partner.publicKey) {
            try {
                // 1. Kyber Encapsulation to get Shared Secret
                const { cipherText: kyberCipherText, sharedSecret } = encapsulateKyber(partner.publicKey);
                
                // 2. AES-GCM Encryption using Shared Secret
                const { cipherText: aesCipherText, nonce } = pqcEncrypt(text, sharedSecret);
                
                pqcData = { kyberCipherText, aesCipherText, nonce };
                messageText = "[PQC Encrypted Message]"; // Hide plaintext in DB
            } catch (err) {
                console.error("PQC Encryption failed", err);
            }
        }
    }

    const newMessage: Message = {
      id: `m_${Date.now()}`,
      chatId: activeChatId,
      senderId: user.id,
      text: messageText,
      image: image,
      timestamp: new Date(),
      isOwn: true,
      status: 'sent',
      ...(pqcData && { pqcData })
    };

    // Optimistic UI update
    setMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMessage]
    }));

    // Emit via Socket.IO
    socket.emit('send_message', newMessage);

    // ✅ Save to MongoDB (primary storage)
    let savedMessage = newMessage;
    let mongoSaveSuccess = false;
    try {
      const response = await fetch('/api/chats/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeChatId,
          senderId: user.id,
          text: messageText,
          image: image
        })
      });
      
      if (response.ok) {
        const mongoMessage = await response.json();
        savedMessage = {
          ...mongoMessage,
          id: mongoMessage._id, // Map MongoDB _id to id
          isOwn: true,
          timestamp: mongoMessage.timestamp ? new Date(mongoMessage.timestamp) : new Date()
        };
        
        // Update UI with the MongoDB message (replacing temporary ID)
        setMessages(prev => {
          const msgs = prev[activeChatId] || [];
          return {
            ...prev,
            [activeChatId]: msgs.map(m => m.id === newMessage.id ? savedMessage : m)
          };
        });
        
        // Emit via Socket.IO with the saved message (now with MongoDB _id)
        socket.emit('send_message', savedMessage);
        
        mongoSaveSuccess = true;
        console.log('[MongoDB] Message saved successfully:', mongoMessage._id);
      }
    } catch (error) {
      console.error('[MongoDB] Failed to save message:', error);
    }

    // Persist to Mock Backend (localStorage fallback) - only if MongoDB save failed
    if (activeChatId !== 'c1' && !mongoSaveSuccess) {
        await mockSendMessage(newMessage);
    }

    if (currentChat?.isBot && text) { 
        try {
            const responseText = await sendMessageToGemini(text);
            const botMessage: Message = {
                id: `m_bot_${Date.now()}`,
                chatId: activeChatId,
                senderId: currentChat.id,
                text: responseText,
                timestamp: new Date(),
                isOwn: false,
                status: 'read'
            };

            setMessages(prev => ({
                ...prev,
                [activeChatId]: [...(prev[activeChatId] || []), botMessage]
            }));
            // We don't persist bot messages to DB in this demo to keep mockDB simple, 
            // but they exist in React State until refresh.
        } catch (error) {
            console.error("Bot failed", error);
        }
    }
  };

  // Handle Send Friend Request
  const handleSendRequest = async (receiverId: string) => {
      if (!user) return;
      
      setAddFriendError('');
      setAddFriendSuccess('');

      const isPending = outgoingFriendRequests.some(r => r.receiverId === receiverId);

      if (isPending) {
          // Cancel request
          const { mockCancelFriendRequest } = await import('../services/mockBackend');
          const result = await mockCancelFriendRequest(user.id, receiverId);
          if (result.success) {
              setAddFriendSuccess('Request cancelled.');
              fetchData(); // Refresh outgoing requests
          } else {
              setAddFriendError(result.message);
          }
      } else {
          // Send request
          const { mockSendFriendRequestById } = await import('../services/mockBackend');
          const result = await mockSendFriendRequestById(user.id, receiverId);
          if (result.success) {
              setAddFriendSuccess('Request sent.');
              fetchData(); // Refresh outgoing requests
          } else {
              setAddFriendError(result.message);
          }
      }
  };

  // Handle Response to Friend Request
  const handleRespondRequest = async (requestId: string, action: 'accept' | 'reject') => {
      await mockRespondFriendRequest(requestId, action);
      fetchData();
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || selectedUsers.length === 0) return;
    
    if (selectedUsers.length === 1) {
        await mockCreateDirectChat(user.id, selectedUsers[0]);
    } else {
        if (!groupName.trim()) return;
        await mockCreateGroup(user.id, groupName, false, selectedUsers);
    }
    
    setShowGroupModal(false);
    setGroupName('');
    setSelectedUsers([]);
    fetchData();
  };

  const handleCreateSecretChat = async (partnerId: string) => {
    if (!user) return;
    const { mockCreateSecretChat } = await import('../services/mockBackend');
    const newChatId = await mockCreateSecretChat(user.id, partnerId);
    setShowSecretChatModal(false);
    setActiveChatId(newChatId);
    setIsMobileMenuOpen(false);
    fetchData();
  };

  const handleToggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeMessages = activeChatId ? (messages[activeChatId] || []) : [];

  return (
    <div className="flex h-screen bg-black overflow-hidden relative">
      {/* Sidebar */}
      <div className={`
          fixed md:relative w-full md:w-auto h-full z-20 
          transition-transform duration-300
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
          <Sidebar 
            chats={chats} 
            activeChatId={activeChatId} 
            onSelectChat={handleSelectChat}
            onLogout={() => setShowLogoutDialog(true)}
            onOpenSettings={() => navigate('/profile')}
            onOpenContacts={() => setShowContactsModal(true)}
            onOpenRequests={() => setShowRequestsModal(true)}
            onCreateGroup={() => setShowGroupModal(true)}
            onCreateSecretChat={() => setShowSecretChatModal(true)}
            pendingRequestCount={friendRequests.length}
            isOpen={isMobileMenuOpen}
          />
      </div>

      {/* Chat Window */}
      <div className={`
          flex-1 flex flex-col h-full w-full absolute md:relative z-10 bg-messenger-bg
          transition-transform duration-300
          ${isMobileMenuOpen ? 'translate-x-full md:translate-x-0' : 'translate-x-0'}
      `}>
         <ChatWindow 
            chat={activeChat} 
            messages={activeMessages} 
            allUsers={user ? [...allUsers, user] : allUsers}
            onSendMessage={handleSendMessage}
            onBack={handleBackToSidebar}
            onDeleteChat={handleDeleteChat}
            onClearHistory={handleClearHistory}
            onDeleteMessage={handleDeleteMessage}
            onMuteChat={handleMuteChat}
            onViewProfile={() => setShowProfileModal(true)}
            onBlockUser={handleBlockUser}
            onUnblockUser={handleUnblockUser}
         />
      </div>

      {/* Logout Modal */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-black w-full max-w-sm rounded-2xl p-8 shadow-2xl border border-gray-800">
                <h3 className="text-2xl font-serif font-light text-white mb-2 tracking-wide">Log Out</h3>
                <p className="text-gray-500 mb-8 text-sm tracking-wide">Are you sure you want to log out of your account?</p>
                <div className="flex justify-end space-x-4">
                    <button onClick={() => setShowLogoutDialog(false)} className="px-6 py-2.5 text-gray-400 hover:text-white transition-colors text-sm tracking-widest uppercase">Cancel</button>
                    <button onClick={() => { setShowLogoutDialog(false); logout(); }} className="px-6 py-2.5 bg-white text-black hover:bg-gray-200 transition-colors rounded-full text-sm tracking-widest uppercase font-medium">Log Out</button>
                </div>
            </div>
        </div>
      )}

      {/* Delete Message Confirmation Modal */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-black w-full max-w-sm rounded-2xl p-8 shadow-2xl border border-gray-800">
                <h3 className="text-2xl font-serif font-light text-white mb-2 tracking-wide">Delete Message</h3>
                <p className="text-gray-500 mb-8 text-sm tracking-wide">Are you sure you want to delete this message? This action cannot be undone.</p>
                <div className="flex justify-end space-x-4">
                    <button onClick={() => setMessageToDelete(null)} className="px-6 py-2.5 text-gray-400 hover:text-white transition-colors text-sm tracking-widest uppercase">Cancel</button>
                    <button onClick={confirmDeleteMessage} className="px-6 py-2.5 bg-red-600 text-white hover:bg-red-700 transition-colors rounded-full text-sm tracking-widest uppercase font-medium">Delete</button>
                </div>
            </div>
        </div>
      )}

      {/* Add Friend Modal */}
      {showContactsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-black w-full max-w-md rounded-2xl shadow-2xl border border-gray-800 p-8 relative max-h-[80vh] flex flex-col">
                <button onClick={() => { setShowContactsModal(false); setUserSearchQuery(''); }} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg></button>
                <h2 className="text-2xl font-serif font-light text-white mb-6 tracking-wide">People You May Know</h2>
                
                <div className="relative mb-6">
                    <input 
                        type="text" 
                        placeholder="Search by name or email..." 
                        className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-messenger-primary focus:ring-1 focus:ring-messenger-primary transition-all text-sm"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                    />
                    <svg className="w-4 h-4 text-gray-500 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {addFriendError && <p className="text-red-400 text-xs tracking-wide mb-4">{addFriendError}</p>}
                {addFriendSuccess && <p className="text-messenger-primary text-xs tracking-wide mb-4">{addFriendSuccess}</p>}
                
                <div className="overflow-y-auto custom-scrollbar flex-1 space-y-4 pr-2">
                    {allUsers.filter(u => 
                        u.id !== user?.id && 
                        !chats.some(c => c.partnerId === u.id) &&
                        (u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                         u.email.toLowerCase().includes(userSearchQuery.toLowerCase()))
                    ).length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-8">No people found.</p>
                    ) : (
                        allUsers
                            .filter(u => 
                                u.id !== user?.id && 
                                !chats.some(c => c.partnerId === u.id) &&
                                (u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                                 u.email.toLowerCase().includes(userSearchQuery.toLowerCase()))
                            )
                            .map(u => {
                                const isPending = outgoingFriendRequests.some(r => r.receiverId === u.id);
                                return (
                                <div key={u.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                                    <div className="flex items-center space-x-3">
                                        <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-full object-cover border border-gray-700" />
                                        <div>
                                            <p className="text-white font-medium">{u.name}</p>
                                            <p className="text-xs text-gray-500">{u.email}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleSendRequest(u.id)}
                                        className={`${isPending ? 'bg-gray-700 hover:bg-red-600' : 'bg-messenger-primary hover:bg-blue-600'} text-white px-4 py-2 rounded-full text-xs font-medium transition-colors flex items-center space-x-1`}
                                    >
                                        {isPending ? (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                <span>Cancel</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                                <span>Add</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )})
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-[#1c1c1d] w-full max-w-md rounded-2xl shadow-2xl border border-gray-800 p-6 relative max-h-[80vh] flex flex-col">
                <button onClick={() => { setShowGroupModal(false); setGroupName(''); setSelectedUsers([]); }} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg></button>
                <h2 className="text-xl font-medium text-white mb-6 tracking-wide">New Chat</h2>
                <form onSubmit={handleCreateGroup} className="flex flex-col flex-1 overflow-hidden">
                    {selectedUsers.length > 1 && (
                        <div className="mb-4">
                            <input 
                                type="text" 
                                placeholder="Group Name" 
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                className="w-full bg-transparent border-b border-blue-500 px-0 py-2 text-white placeholder-gray-500 focus:outline-none transition-colors text-lg" 
                                required 
                                autoFocus
                            />
                        </div>
                    )}
                    <div className="mb-2 text-sm text-gray-400 font-medium">Select Users</div>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {allUsers.map(u => (
                            <div 
                                key={u.id} 
                                onClick={() => handleToggleUserSelection(u.id)}
                                className="flex items-center justify-between p-2 hover:bg-gray-800 rounded-xl cursor-pointer transition-colors"
                            >
                                <div className="flex items-center space-x-3">
                                    <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                                    <span className="text-white font-medium">{u.name}</span>
                                </div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedUsers.includes(u.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-500'}`}>
                                    {selectedUsers.includes(u.id) && (
                                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                                    )}
                                </div>
                            </div>
                        ))}
                        {allUsers.length === 0 && (
                            <div className="text-center text-gray-500 py-4 text-sm">No users available to add.</div>
                        )}
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-800 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={selectedUsers.length === 0 || (selectedUsers.length > 1 && !groupName.trim())}
                            className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {selectedUsers.length > 1 ? 'Create Group' : 'Start Chat'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Secret Chat Modal */}
      {showSecretChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-[#1c1c1d] w-full max-w-md rounded-2xl shadow-2xl border border-gray-800 p-6 relative max-h-[80vh] flex flex-col">
                <button onClick={() => setShowSecretChatModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg></button>
                <div className="flex items-center space-x-2 mb-6">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    <h2 className="text-xl font-medium text-white tracking-wide">New Secret Chat</h2>
                </div>
                <p className="text-sm text-gray-400 mb-4">Secret chats are end-to-end encrypted. Select a user to start.</p>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {allUsers.map(u => (
                        <div 
                            key={u.id} 
                            onClick={() => handleCreateSecretChat(u.id)}
                            className="flex items-center space-x-3 p-2 hover:bg-gray-800 rounded-xl cursor-pointer transition-colors"
                        >
                            <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                            <div className="flex flex-col">
                                <span className="text-white font-medium">{u.name}</span>
                                {u.publicKey ? (
                                    <span className="text-xs text-green-500 flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> E2EE Ready</span>
                                ) : (
                                    <span className="text-xs text-yellow-500 flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> No Public Key</span>
                                )}
                            </div>
                        </div>
                    ))}
                    {allUsers.length === 0 && (
                        <div className="text-center text-gray-500 py-4 text-sm">No users available.</div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Friend Requests Modal */}
      {showRequestsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-black w-full max-w-md rounded-2xl shadow-2xl border border-gray-800 p-8 relative h-[500px] flex flex-col">
                <button onClick={() => setShowRequestsModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg></button>
                <h2 className="text-2xl font-serif font-light text-white mb-6 tracking-wide">Pending Requests</h2>
                <div className="flex-1 overflow-y-auto pr-2">
                    {friendRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                            <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            <p className="text-sm tracking-wide">No pending requests.</p>
                        </div>
                    ) : (
                        friendRequests.map(req => (
                            <div key={req.id} className="flex items-center justify-between bg-gray-900/50 p-4 rounded-xl mb-3 border border-gray-800/50">
                                <div className="flex items-center">
                                    <img src={req.senderAvatar} className="w-12 h-12 rounded-full mr-4 object-cover border border-gray-800" alt="" />
                                    <div>
                                        <p className="font-medium text-white text-sm tracking-wide">{req.senderName}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">wants to connect</p>
                                    </div>
                                </div>
                                <div className="flex space-x-3">
                                    <button onClick={() => handleRespondRequest(req.id, 'accept')} className="text-messenger-primary hover:text-white transition-colors p-2" title="Accept">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                                    </button>
                                    <button onClick={() => handleRespondRequest(req.id, 'reject')} className="text-gray-500 hover:text-red-400 transition-colors p-2" title="Decline">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}
      
       {/* Profile Modal (For Viewing Other Users) */}
       {showProfileModal && activeChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-black w-full max-w-md rounded-2xl p-8 shadow-2xl border border-gray-800 relative">
                 <button onClick={() => setShowProfileModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg></button>
                 <div className="flex flex-col items-center mt-4">
                    <div className="relative mb-6">
                        <img src={activeChat.avatar} className="w-32 h-32 rounded-full object-cover border border-gray-800" alt="" />
                        {activeChat.isOnline && <div className="absolute bottom-2 right-2 w-4 h-4 bg-messenger-primary rounded-full border-2 border-black"></div>}
                    </div>
                    <h3 className="text-3xl font-serif font-light text-white tracking-wide mb-1">{activeChat.name}</h3>
                    <p className="text-xs text-gray-500 tracking-widest uppercase mb-8">{activeChat.isBot ? 'AI Assistant' : 'Connection'}</p>
                    
                    <div className="w-full space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-gray-800">
                            <span className="text-gray-500 text-sm tracking-wide">Status</span>
                            <span className="text-white text-sm tracking-wide">{activeChat.isOnline ? 'Online' : (activeChat.isBot ? 'Always Online' : 'Offline')}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-800">
                            <span className="text-gray-500 text-sm tracking-wide">Relationship</span>
                            <span className="text-white text-sm tracking-wide capitalize">{activeChat.relationshipStatus.replace('_', ' ')}</span>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
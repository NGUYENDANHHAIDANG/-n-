import React, { useRef, useEffect, useState } from 'react';
import { Message, Chat, User } from '../types';
import { EncryptedMessageContent } from './EncryptedMessageContent';

interface ChatWindowProps {
  chat: Chat | undefined;
  messages: Message[];
  allUsers?: User[];
  onSendMessage: (text: string, image?: string) => void;
  onBack: () => void;
  onDeleteChat: () => void;
  onClearHistory: () => void;
  onDeleteMessage: (messageId: string) => void;
  onMuteChat: () => void;
  onViewProfile: () => void;
  onBlockUser: () => void;
  onUnblockUser: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  chat, 
  messages, 
  allUsers = [],
  onSendMessage, 
  onBack,
  onDeleteChat,
  onClearHistory,
  onDeleteMessage,
  onMuteChat,
  onViewProfile,
  onBlockUser,
  onUnblockUser
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isCalling, setIsCalling] = useState<'voice' | 'video' | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSearchOpen]); 

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          onSendMessage("", ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatLastSeen = (date?: Date) => {
    if (!date) return 'Last seen recently';
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Last seen just now';
    if (diffMins < 60) return `Last seen ${diffMins} minutes ago`;
    if (diffHours < 24) return `Last seen ${diffHours} hours ago`;
    return `Last seen ${new Date(date).toLocaleDateString()}`;
  };

  // Filter messages based on search
  const displayedMessages = searchQuery 
    ? messages.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  if (!chat) {
    return (
      <div className="hidden md:flex flex-col items-center justify-center flex-1 bg-black text-center p-4">
        <div className="border border-gray-800 p-6 rounded-full mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        </div>
        <h2 className="text-sm font-medium text-white bg-gray-900/80 px-4 py-1.5 rounded-full tracking-wide">Select a chat to start messaging</h2>
      </div>
    );
  }

  const isFriend = chat.relationshipStatus === 'friend' || chat.isBot || chat.type === 'saved' || chat.type === 'group' || chat.type === 'channel';
  const isBlocked = chat.relationshipStatus === 'blocked';
  const isBlockedByPartner = chat.relationshipStatus === 'blocked_by_partner';
  const isChannel = chat.type === 'channel';
  const isGroup = chat.type === 'group';
  const isSecret = chat.isSecret;

  // Mock pinned messages logic
  const pinnedMessages = chat.pinnedMessageIds 
    ? messages.filter(m => chat.pinnedMessageIds?.includes(m.id))
    : [];

  return (
    <div className="flex flex-row h-full flex-1 bg-[#0e1621] relative w-full overflow-hidden">
      
      {/* Main Chat Area */}
      <div className="flex flex-col h-full flex-1 relative w-full">
          {/* Header */}
          <div className="bg-[#1c1c1d] p-3 px-4 flex items-center justify-between border-b border-gray-800 z-10 relative shadow-sm">
              <div className="flex items-center">
                  <button onClick={onBack} className="md:hidden mr-4 text-gray-400 hover:text-white transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <img src={chat.avatar} alt={chat.name} className="w-10 h-10 rounded-full mr-4 object-cover border border-gray-800" />
                  <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                          {isSecret && <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                          <span className={`font-medium tracking-wide text-sm ${isSecret ? 'text-green-500' : 'text-white'}`}>{chat.name}</span>
                      </div>
                      <span className={`text-[11px] tracking-wider uppercase mt-0.5 ${chat.isOnline ? 'text-messenger-primary' : 'text-gray-500'}`}>
                          {chat.type === 'saved' 
                              ? 'Cloud Storage'
                              : chat.type === 'channel'
                                  ? `${chat.memberCount?.toLocaleString() || 0} subscribers`
                                  : chat.type === 'group'
                                      ? `${chat.memberCount?.toLocaleString() || 0} members`
                                      : chat.isBot 
                                          ? 'Bot' 
                                          : isBlocked
                                              ? 'Blocked'
                                              : chat.isOnline 
                                                  ? 'Online' 
                                                  : formatLastSeen(chat.lastSeen)}
                      </span>
                  </div>
              </div>
              
              <div className="flex items-center space-x-2 text-gray-400">
                   {isSecret && (
                       <button className="p-2 rounded-full hover:text-white hover:bg-gray-900 transition-colors flex items-center space-x-1" title="Self-destruct timer">
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           <span className="text-xs">Off</span>
                       </button>
                   )}
                   {(isGroup || isChannel) && (
                       <button onClick={() => setIsCalling('video')} className="p-2 rounded-full hover:text-white hover:bg-gray-900 transition-colors flex items-center space-x-1" title="Start Stream">
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                           <span className="text-xs hidden md:inline">Stream</span>
                       </button>
                   )}
                   {!isGroup && !isChannel && !isSecret && (
                       <>
                           <button onClick={() => setIsCalling('voice')} className="p-2 rounded-full hover:text-white hover:bg-gray-900 transition-colors" title="Voice Call">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                               </svg>
                           </button>
                           <button onClick={() => setIsCalling('video')} className="p-2 rounded-full hover:text-white hover:bg-gray-900 transition-colors" title="Video Call">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                               </svg>
                           </button>
                       </>
                   )}
                   <button 
                       onClick={() => setIsInfoOpen(!isInfoOpen)}
                       className={`p-2 rounded-full transition-colors ${isInfoOpen ? 'text-white bg-gray-900' : 'hover:text-white hover:bg-gray-900'}`}
                       title="Chat Info"
                   >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                   </button>
              </div>

              {/* Search Bar Overlay */}
              {isSearchOpen && (
                  <div className="absolute inset-0 bg-black flex items-center px-4 z-20 border-b border-gray-800">
                      <button 
                          onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                          className="p-2 text-gray-400 hover:text-white mr-2"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <div className="flex-1 bg-black border border-gray-800 rounded-lg flex items-center px-4 py-2">
                          <svg className="w-4 h-4 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                          <input 
                              type="text" 
                              autoFocus
                              placeholder="Search in this chat..." 
                              className="bg-transparent text-white w-full focus:outline-none text-sm tracking-wide"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                          />
                      </div>
                      <div className="ml-4 text-xs text-gray-500 uppercase tracking-widest whitespace-nowrap">
                         {searchQuery ? `${displayedMessages.length} found` : ''}
                      </div>
                  </div>
              )}
          </div>

          {/* Pinned Messages */}
          {pinnedMessages.length > 0 && (
              <div className="bg-[#1c1c1d]/95 backdrop-blur-sm border-b border-gray-800 p-2 px-4 flex items-center cursor-pointer hover:bg-gray-800/80 transition-colors z-10 shadow-sm">
                  <div className="w-1 h-8 bg-blue-500 rounded-full mr-3"></div>
                  <div className="flex-1 overflow-hidden">
                      <p className="text-blue-500 text-sm font-medium tracking-wide">Pinned Message</p>
                      <p className="text-gray-300 text-xs truncate tracking-wide">{pinnedMessages[pinnedMessages.length - 1].text}</p>
                  </div>
              </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 z-10 space-y-3">
            {displayedMessages.map((msg, index) => {
              const isNextSameSender = displayedMessages[index + 1]?.senderId === msg.senderId;
              const isPrevSameSender = displayedMessages[index - 1]?.senderId === msg.senderId;
              
              let borderRadiusClass = 'rounded-2xl';
              if (msg.isOwn) {
                  if (isPrevSameSender && isNextSameSender) borderRadiusClass = 'rounded-2xl rounded-tr-sm rounded-br-sm';
                  else if (isPrevSameSender) borderRadiusClass = 'rounded-2xl rounded-tr-sm';
                  else if (isNextSameSender) borderRadiusClass = 'rounded-2xl rounded-br-sm';
              } else {
                  if (isPrevSameSender && isNextSameSender) borderRadiusClass = 'rounded-2xl rounded-tl-sm rounded-bl-sm';
                  else if (isPrevSameSender) borderRadiusClass = 'rounded-2xl rounded-tl-sm';
                  else if (isNextSameSender) borderRadiusClass = 'rounded-2xl rounded-bl-sm';
              }

              return (
              <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'} items-center group relative mb-${isNextSameSender ? '1' : '4'}`}>
                {!msg.isOwn && !isNextSameSender && (
                    <img 
                      src={allUsers.find(u => u.id === msg.senderId)?.avatar || chat.avatar} 
                      alt="avatar" 
                      className="w-8 h-8 rounded-full mr-3 self-end mb-1 border border-gray-800 object-cover" 
                      title={allUsers.find(u => u.id === msg.senderId)?.name || 'User'}
                    />
                )}
                {!msg.isOwn && isNextSameSender && (
                    <div className="w-8 mr-3"></div>
                )}
                
                {msg.isOwn && (
                    <button
                        onClick={() => onDeleteMessage(msg.id)}
                        className="mr-2 p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-800 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0"
                        title="Delete message"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                )}

                <div className="flex flex-col max-w-[85%] md:max-w-[65%]">
                    {isGroup && !msg.isOwn && !isPrevSameSender && (
                        <span className="text-xs text-gray-400 mb-1 ml-1">
                            {allUsers.find(u => u.id === msg.senderId)?.name || 'User'}
                        </span>
                    )}
                    <div 
                        className={`px-4 py-2 relative ${borderRadiusClass} shadow-sm ${
                            msg.isOwn 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-800 text-white'
                        }`}
                    >
                      {msg.image && (
                        <div className="mb-3 rounded-xl overflow-hidden border border-gray-800/20">
                            <img src={msg.image} alt="attachment" className="w-full h-auto object-cover max-h-64" />
                        </div>
                      )}
                      
                      {msg.fileUrl && (
                          <div className="flex items-center space-x-3 bg-black/20 p-3 rounded-xl mb-2">
                              <div className="p-3 bg-messenger-primary/20 text-messenger-primary rounded-full">
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              </div>
                              <div className="flex-1 overflow-hidden">
                                  <p className="text-sm font-medium truncate">{msg.fileName || 'Document'}</p>
                                  <p className="text-xs opacity-70">{msg.fileSize || 'Unknown size'}</p>
                              </div>
                          </div>
                      )}
                      
                      <EncryptedMessageContent msg={msg} />

                      <div className="flex justify-end items-center mt-1 space-x-1 float-right ml-3">
                         <span className={`text-[11px] ${msg.isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                         {msg.isOwn && (
                             <svg className={`w-3.5 h-3.5 ${msg.status === 'read' ? 'text-blue-300' : 'text-blue-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                         )}
                      </div>
                      <div className="clear-both"></div>
                    </div>
                </div>
              </div>
              )})}
            <div ref={messagesEndRef} />
          </div>

          {/* Input or Block Message */}
          {isBlocked ? (
            <div className="bg-black p-6 z-10 text-center border-t border-gray-800 flex flex-col items-center justify-center space-y-3">
                <p className="text-red-400 text-xs tracking-widest uppercase">You have blocked this user.</p>
                <button 
                    onClick={onUnblockUser}
                    className="text-white text-xs tracking-widest uppercase hover:text-messenger-primary transition-colors border-b border-transparent hover:border-messenger-primary pb-0.5"
                >
                    Unblock to send messages
                </button>
            </div>
          ) : isBlockedByPartner ? (
            <div className="bg-black p-6 z-10 text-center border-t border-gray-800 flex flex-col items-center justify-center space-y-2">
                <p className="text-gray-500 text-xs tracking-widest uppercase">You cannot reply to this conversation.</p>
            </div>
          ) : isChannel ? (
              <div className="bg-black p-4 z-10 flex items-center justify-center border-t border-gray-800">
                  <button className="text-messenger-primary font-medium tracking-wide hover:underline">Mute Channel</button>
              </div>
          ) : isFriend ? (
              <div className="bg-[#1c1c1d] p-3 z-10 flex items-end space-x-2 border-t border-gray-800">
                <form onSubmit={handleSend} className="flex items-end space-x-2 w-full max-w-4xl mx-auto">
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileSelect}
                    />
                    <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors flex-shrink-0"
                        title="Attach file"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    </button>
                    <div className="flex-1 bg-gray-900 rounded-2xl flex items-center px-4 focus-within:ring-1 focus-within:ring-gray-700 transition-shadow">
                        <textarea
                            rows={1}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Write a message..."
                            className="w-full bg-transparent text-white py-3 focus:outline-none resize-none overflow-hidden text-[15px] placeholder-gray-500"
                            style={{ minHeight: '44px', maxHeight: '120px' }}
                        />
                    </div>
                    {inputText.trim() ? (
                        <button 
                            type="submit" 
                            className="p-2.5 text-white bg-blue-600 hover:bg-blue-500 rounded-full transition-colors flex-shrink-0 shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    ) : (
                        <button 
                            type="button" 
                            className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors flex-shrink-0"
                            title="Voice message"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </button>
                    )}
                </form>
              </div>
          ) : (
              <div className="bg-black p-6 z-10 text-center border-t border-gray-800">
                  <p className="text-gray-500 text-xs tracking-widest uppercase">You are not friends with this user. Add them to start chatting.</p>
              </div>
          )}
      </div>

      {/* Right Sidebar (Chat Info) */}
      {isInfoOpen && (
          <div className="w-80 bg-[#1c1c1d] border-l border-gray-800 flex flex-col h-full absolute right-0 z-40 md:relative transform transition-transform shadow-xl">
              <div className="p-4 px-6 flex items-center justify-between border-b border-gray-800">
                  <h3 className="text-lg font-medium text-white tracking-wide">User Info</h3>
                  <button onClick={() => setIsInfoOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                  <div className="flex flex-col items-center mb-8">
                      <img src={chat.avatar} className="w-24 h-24 rounded-full mb-4 object-cover border border-gray-800" />
                      <h4 className="text-xl font-medium text-white tracking-wide">{chat.name}</h4>
                      <p className="text-xs text-gray-500 uppercase tracking-widest mt-2">{chat.isOnline ? 'Active now' : formatLastSeen(chat.lastSeen)}</p>
                  </div>
                  
                  <div className="space-y-1">
                      <button onClick={onViewProfile} className="w-full flex items-center justify-between p-4 hover:bg-gray-900 rounded-xl transition-colors">
                          <div className="flex items-center text-white">
                              <svg className="w-5 h-5 mr-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              <span className="text-sm tracking-wide">Profile</span>
                          </div>
                      </button>
                      
                      <button onClick={onMuteChat} className="w-full flex items-center justify-between p-4 hover:bg-gray-900 rounded-xl transition-colors">
                          <div className="flex items-center text-white">
                              <svg className="w-5 h-5 mr-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                              <span className="text-sm tracking-wide">{chat.isMuted ? 'Unmute Notifications' : 'Mute Notifications'}</span>
                          </div>
                      </button>

                      <button onClick={() => { setIsInfoOpen(false); setIsSearchOpen(true); }} className="w-full flex items-center justify-between p-4 hover:bg-gray-900 rounded-xl transition-colors">
                          <div className="flex items-center text-white">
                              <svg className="w-5 h-5 mr-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                              <span className="text-sm tracking-wide">Search in Conversation</span>
                          </div>
                      </button>

                      <button onClick={onClearHistory} className="w-full flex items-center justify-between p-4 hover:bg-gray-900 rounded-xl transition-colors">
                          <div className="flex items-center text-white">
                              <svg className="w-5 h-5 mr-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              <span className="text-sm tracking-wide">Clear History</span>
                          </div>
                      </button>

                      {chat.type === 'group' && chat.members && chat.members.length > 0 && (
                          <div className="mt-6">
                              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3 px-4">Group Members ({chat.members.length})</h4>
                              <div className="space-y-2">
                                  {chat.members.map(memberId => {
                                      const member = allUsers.find(u => u.id === memberId);
                                      if (!member) return null;
                                      return (
                                          <div key={member.id} className="flex items-center p-2 hover:bg-gray-900 rounded-xl transition-colors">
                                              <div className="relative">
                                                  <img src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} alt={member.name} className="w-10 h-10 rounded-full object-cover border border-gray-800" />
                                                  {member.isOnline && (
                                                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#1c1c1d] rounded-full"></div>
                                                  )}
                                              </div>
                                              <div className="ml-3 flex-1 overflow-hidden">
                                                  <p className="text-sm font-medium text-white truncate">{member.name}</p>
                                                  <p className="text-xs text-gray-500 truncate">{member.isOnline ? 'Online' : 'Offline'}</p>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      )}

                      <div className="h-px bg-gray-800 my-4"></div>

                      <button onClick={isBlocked ? onUnblockUser : onBlockUser} className="w-full flex items-center justify-between p-4 hover:bg-gray-900 rounded-xl transition-colors">
                          <div className="flex items-center text-red-400">
                              <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                              <span className="text-sm tracking-wide">{isBlocked ? 'Unblock User' : 'Block User'}</span>
                          </div>
                      </button>

                      <button onClick={onDeleteChat} className="w-full flex items-center justify-between p-4 hover:bg-gray-900 rounded-xl transition-colors">
                          <div className="flex items-center text-red-400">
                              <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              <span className="text-sm tracking-wide">Delete Chat</span>
                          </div>
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Calling Overlay */}
      {isCalling && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center text-white">
            <img src={chat.avatar} className="w-32 h-32 rounded-full mb-8 animate-pulse object-cover border border-gray-800" alt="Calling" />
            <h2 className="text-3xl font-serif font-light mb-3 tracking-wide">{chat.name}</h2>
            <p className="text-gray-500 mb-16 text-xs tracking-widest uppercase">{isCalling === 'video' ? 'Video calling...' : 'Calling...'}</p>
            
            <div className="flex space-x-8">
                <button className="p-5 bg-gray-900 border border-gray-800 rounded-full hover:bg-gray-800 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
                <button onClick={() => setIsCalling(null)} className="p-5 bg-white text-black rounded-full hover:bg-gray-200 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
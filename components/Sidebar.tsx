import React, { useState, useRef, useEffect } from 'react';
import { Chat } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenContacts: () => void;
  onOpenRequests: () => void; // New prop
  onCreateGroup: () => void; // New prop
  onCreateSecretChat?: () => void;
  pendingRequestCount: number; // New prop
  isOpen: boolean; 
}

const Sidebar: React.FC<SidebarProps> = ({ 
  chats, 
  activeChatId, 
  onSelectChat, 
  onLogout, 
  onOpenSettings,
  onOpenContacts,
  onOpenRequests,
  onCreateGroup,
  onCreateSecretChat,
  pendingRequestCount,
  isOpen 
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'groups'>('all');

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (chat.type === 'channel') return false; // Hide channels completely

    if (activeTab === 'personal') return chat.type === 'direct' || chat.type === 'saved';
    if (activeTab === 'groups') return chat.type === 'group';
    return true;
  });

  const formatTime = (date: Date | string | number) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <div className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transform transition-transform duration-300 absolute md:relative z-20 w-full md:w-80 lg:w-96 h-full flex flex-col bg-[#1c1c1d] border-r border-gray-800 shadow-xl md:shadow-none`}>
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
            {/* Hamburger / Menu Button */}
            <div className="relative" ref={menuRef}>
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="text-white hover:text-messenger-primary transition-colors p-1 relative"
                >
                     {pendingRequestCount > 0 && !isMenuOpen && (
                        <span className="absolute top-0 right-0 w-2 h-2 bg-messenger-primary rounded-full"></span>
                     )}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                    <div className="absolute left-0 top-full mt-4 w-64 bg-[#2c2c2e] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden py-2">
                        <button 
                            onClick={() => { setIsMenuOpen(false); window.location.hash = '#/'; }}
                            className="w-full text-left px-5 py-3 hover:bg-gray-900 flex items-center space-x-4 text-white transition-colors"
                        >
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                            <span className="text-sm tracking-wide">Home Feed</span>
                        </button>

                        <button 
                            onClick={() => { setIsMenuOpen(false); onOpenContacts(); }}
                            className="w-full text-left px-5 py-3 hover:bg-gray-900 flex items-center space-x-4 text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            <span className="text-sm tracking-wide">Add Connection</span>
                        </button>
                        
                        <button 
                            onClick={() => { setIsMenuOpen(false); onOpenRequests(); }}
                            className="w-full text-left px-5 py-3 hover:bg-gray-900 flex items-center space-x-4 text-white transition-colors justify-between"
                        >
                            <div className="flex items-center space-x-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                <span className="text-sm tracking-wide">Requests</span>
                            </div>
                            {pendingRequestCount > 0 && (
                                <span className="bg-messenger-primary text-black text-xs font-bold px-2 py-0.5 rounded-full">{pendingRequestCount}</span>
                            )}
                        </button>

                        <div className="h-px bg-gray-800 my-2"></div>

                        <button 
                            onClick={() => { setIsMenuOpen(false); onCreateGroup(); }}
                            className="w-full text-left px-5 py-3 hover:bg-gray-900 flex items-center space-x-4 text-white transition-colors"
                        >
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            <span className="text-sm tracking-wide">New Group</span>
                        </button>

                        <button 
                            onClick={() => { setIsMenuOpen(false); /* Mock Create Channel */ }}
                            className="w-full text-left px-5 py-3 hover:bg-gray-900 flex items-center space-x-4 text-white transition-colors"
                        >
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                            <span className="text-sm tracking-wide">New Channel</span>
                        </button>

                        {user?.role === 'admin' && (
                            <>
                                <div className="h-px bg-gray-800 my-2"></div>
                                <button 
                                    onClick={() => { setIsMenuOpen(false); window.location.hash = '#/admin'; }}
                                    className="w-full text-left px-5 py-3 hover:bg-gray-900 flex items-center space-x-4 text-red-400 transition-colors"
                                >
                                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    <span className="text-sm tracking-wide">Admin Dashboard</span>
                                </button>
                            </>
                        )}

                        <button 
                            onClick={() => { setIsMenuOpen(false); onCreateSecretChat?.(); }}
                            className="w-full text-left px-5 py-3 hover:bg-gray-900 flex items-center space-x-4 text-green-500 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            <span className="text-sm tracking-wide">New Secret Chat</span>
                        </button>

                        <div className="h-px bg-gray-800 my-2"></div>

                        <button 
                            onClick={() => { setIsMenuOpen(false); onOpenSettings(); }}
                            className="w-full text-left px-5 py-3 hover:bg-gray-900 flex items-center space-x-4 text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span className="text-sm tracking-wide">Settings</span>
                        </button>
                        <div className="h-px bg-gray-800 my-2"></div>
                        <button 
                            onClick={() => { setIsMenuOpen(false); onLogout(); }}
                            className="w-full text-left px-5 py-3 hover:bg-gray-900 flex items-center space-x-4 text-red-400 hover:text-red-300 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            <span className="text-sm tracking-wide">Log Out</span>
                        </button>
                    </div>
                )}
            </div>
          <h1 className="text-xl font-semibold text-white tracking-wide">Messages</h1>
        </div>
        <div className="flex items-center space-x-2">
            <button 
                onClick={() => window.location.hash = '#/'}
                className="p-2 hover:text-messenger-primary text-gray-400 transition-colors" 
                title="Home Feed"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </button>
            <button onClick={onCreateGroup} className="p-2 hover:text-messenger-primary text-gray-400 transition-colors" title="New Group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
            </button>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="px-6 pb-2">
        <div className="relative mb-4">
          <input 
            type="text" 
            placeholder="Search" 
            className="w-full bg-gray-900 border-none text-white rounded-full py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg className="w-4 h-4 text-gray-500 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-hide">
            {['all', 'personal', 'groups'].map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-colors ${
                        activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-10 text-gray-500 px-6 text-center">
                <p className="font-medium text-lg">No chats found</p>
                <button onClick={onOpenContacts} className="mt-4 text-xs tracking-widest uppercase text-white hover:text-messenger-primary transition-colors border-b border-transparent hover:border-messenger-primary pb-0.5">Start a chat</button>
            </div>
        ) : (
            filteredChats.map((chat) => (
            <div 
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`flex items-center p-3 mb-1 rounded-xl cursor-pointer transition-all duration-200 ${activeChatId === chat.id ? 'bg-blue-600' : 'hover:bg-gray-900'}`}
            >
                <div className="relative">
                    <img 
                    src={chat.avatar} 
                    alt={chat.name} 
                    className="w-12 h-12 rounded-full object-cover border border-gray-800"
                    />
                    {chat.type === 'saved' && (
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                        </div>
                    )}
                    {chat.isOnline && chat.type === 'direct' && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-messenger-primary border-2 border-black rounded-full"></span>
                    )}
                </div>
                
                <div className="ml-4 flex-1 overflow-hidden">
                <div className="flex justify-between items-baseline mb-1">
                    <div className="flex items-center space-x-2 overflow-hidden">
                        {chat.isSecret && (
                            <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        )}
                        {chat.type === 'channel' && (
                            <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                        )}
                        <h3 className={`font-medium text-sm tracking-wide truncate ${chat.isSecret && activeChatId !== chat.id ? 'text-green-500' : 'text-white'}`}>{chat.name}</h3>
                        {chat.isMuted && (
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${activeChatId === chat.id ? 'text-blue-200' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            </svg>
                        )}
                    </div>
                    <span className={`text-xs ${activeChatId === chat.id ? 'text-blue-200' : 'text-gray-500'}`}>{formatTime(chat.lastMessageTime)}</span>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                    <p className={`text-sm truncate w-5/6 ${activeChatId === chat.id ? 'text-blue-100' : (chat.unreadCount > 0 ? 'text-white font-medium' : 'text-gray-400')}`}>
                        {chat.lastMessage.startsWith('data:image') ? 'Photo' : chat.lastMessage}
                    </p>
                    {chat.unreadCount > 0 && (
                    <span className="w-2 h-2 bg-messenger-primary rounded-full"></span>
                    )}
                </div>
                </div>
            </div>
            ))
        )}
      </div>
    </div>
  );
};

export default Sidebar;
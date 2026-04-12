import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { mockGetUserById, mockBlockUser, mockUnblockUser } from '../services/mockBackend';

const ProfilePage: React.FC = () => {
  const { user: currentUser, updateProfile, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedUsersList, setBlockedUsersList] = useState<User[]>([]);

  const isOwnProfile = !id || id === currentUser?.id;

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      if (isOwnProfile) {
        setProfileUser(currentUser);
        setName(currentUser?.name || '');
      } else if (id) {
        const fetchedUser = await mockGetUserById(id);
        setProfileUser(fetchedUser);
        setName(fetchedUser?.name || '');
        if (currentUser && currentUser.blockedUsers?.includes(id)) {
          setIsBlocked(true);
        } else {
          setIsBlocked(false);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [id, currentUser, isOwnProfile]);

  const loadBlockedUsers = async () => {
    console.log("loadBlockedUsers called", currentUser?.blockedUsers);
    if (currentUser && currentUser.blockedUsers) {
      const blockedUsersPromises = currentUser.blockedUsers.map(id => mockGetUserById(id));
      const blockedUsers = await Promise.all(blockedUsersPromises);
      console.log("blockedUsers resolved", blockedUsers);
      setBlockedUsersList(blockedUsers.filter((u): u is User => u !== null));
    }
  };

  useEffect(() => {
    if (isOwnProfile && currentUser) {
      loadBlockedUsers();
    }
  }, [isOwnProfile, currentUser]);

  useEffect(() => {
    if (showBlockedModal) {
      loadBlockedUsers();
    }
  }, [showBlockedModal]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-black text-white"><p>Loading...</p></div>;
  }

  if (!profileUser) {
    return (
        <div className="flex items-center justify-center h-screen bg-black text-white">
            <p>User not found.</p>
        </div>
    );
  }

  const handleSave = () => {
    if (name.trim() && isOwnProfile && currentUser) {
        updateProfile(name, currentUser.avatar);
        setIsEditing(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!currentUser || !profileUser || isOwnProfile) return;
    
    if (isBlocked) {
      await mockUnblockUser(currentUser.id, profileUser.id);
      setIsBlocked(false);
      await refreshUser();
    } else {
      await mockBlockUser(currentUser.id, profileUser.id);
      setIsBlocked(true);
      await refreshUser();
    }
  };

  const handleUnblockFromList = async (userIdToUnblock: string) => {
    if (!currentUser) return;
    await mockUnblockUser(currentUser.id, userIdToUnblock);
    await refreshUser();
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-black p-6 flex items-center border-b border-gray-800">
        <button 
            onClick={() => navigate(-1)} 
            className="mr-6 text-gray-500 hover:text-white transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
        </button>
        <h1 className="text-2xl font-serif font-light tracking-wide">{isOwnProfile ? 'Profile' : `${profileUser.name}'s Profile`}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 max-w-3xl mx-auto w-full">
        <div className="bg-black rounded-3xl p-10 shadow-2xl border border-gray-800 flex flex-col items-center">
            
            {/* Avatar */}
            <div className="relative mb-10 group">
                <img 
                    src={profileUser.avatar} 
                    alt="Profile" 
                    className="w-40 h-40 rounded-full object-cover border border-gray-800 shadow-2xl" 
                />
                {isOwnProfile && (
                  <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                      <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                      if (typeof reader.result === 'string' && currentUser) {
                                          updateProfile(currentUser.name, reader.result);
                                          setProfileUser({ ...profileUser, avatar: reader.result });
                                      }
                                  };
                                  reader.readAsDataURL(file);
                              }
                          }}
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                  </label>
                )}
            </div>

                {/* User Info */}
            <div className="w-full space-y-6">
                
                {/* Actions (Only for other profiles) */}
                {!isOwnProfile && (
                    <div className="flex space-x-4 mb-4">
                        <button 
                            onClick={() => {
                                // In a real app, this would ensure a chat exists and navigate to it
                                navigate('/chat');
                            }}
                            className="flex-1 bg-white text-black py-3 rounded-xl font-medium tracking-widest uppercase text-sm hover:bg-gray-200 transition-colors"
                        >
                            Message
                        </button>
                        <button 
                            onClick={handleBlockToggle}
                            className={`flex-1 py-3 rounded-xl font-medium tracking-widest uppercase text-sm transition-colors border ${isBlocked ? 'bg-red-900/20 text-red-500 border-red-900/50 hover:bg-red-900/40' : 'bg-transparent text-red-500 border-red-900/50 hover:bg-red-900/20'}`}
                        >
                            {isBlocked ? 'Unblock User' : 'Block User'}
                        </button>
                    </div>
                )}

                {/* Name Field */}
                <div className="bg-black p-6 rounded-2xl border border-gray-800">
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-xs text-gray-500 uppercase tracking-widest">Display Name</label>
                        {isOwnProfile && !isEditing && (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="text-messenger-primary text-xs tracking-widest uppercase hover:text-white transition-colors border-b border-transparent hover:border-white pb-0.5"
                            >
                                Edit
                            </button>
                        )}
                    </div>
                    
                    {isEditing && isOwnProfile ? (
                        <div className="flex items-center space-x-3 mt-2">
                            <input 
                                className="bg-transparent text-white p-3 rounded-xl w-full border border-gray-800 focus:border-messenger-primary focus:outline-none transition-colors text-lg tracking-wide" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                            <button 
                                onClick={handleSave}
                                className="bg-white p-3 rounded-xl text-black hover:bg-gray-200 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                             <button 
                                onClick={() => { setIsEditing(false); setName(profileUser.name); }}
                                className="bg-gray-900 p-3 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <div className="text-2xl font-serif font-light tracking-wide">{profileUser.name}</div>
                    )}
                </div>

                {/* Email Field (Read-only) */}
                <div className="bg-black p-6 rounded-2xl border border-gray-800">
                    <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">Email Address</label>
                    <div className="text-gray-300 tracking-wide">{profileUser.email}</div>
                </div>

                {/* User ID Field (Read-only) */}
                <div className="bg-black p-6 rounded-2xl border border-gray-800">
                    <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">User ID</label>
                    <div className="text-gray-500 font-mono text-sm tracking-widest">{profileUser.id}</div>
                </div>

                 {/* Blocked Users Count (Only for own profile) */}
                 {isOwnProfile && (
                   <div className="bg-black p-6 rounded-2xl border border-gray-800 flex justify-between items-center">
                      <div>
                          <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">Blocked Users</label>
                          <div className="text-gray-300 tracking-wide">{blockedUsersList.length} users blocked</div>
                      </div>
                      <button 
                        onClick={() => setShowBlockedModal(true)}
                        className="text-messenger-primary text-xs tracking-widest uppercase hover:text-white transition-colors border-b border-transparent hover:border-white pb-0.5"
                      >
                        Manage
                      </button>
                  </div>
                 )}

            </div>
        </div>
      </div>

      {/* Blocked Users Modal */}
      {showBlockedModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c1d] rounded-2xl w-full max-w-md overflow-hidden border border-gray-800 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/50">
              <h2 className="text-lg font-medium text-white">Blocked Users</h2>
              <button onClick={() => setShowBlockedModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {blockedUsersList.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No blocked users.
                </div>
              ) : (
                <div className="space-y-4">
                  {blockedUsersList.map(user => (
                    <div key={user.id} className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-gray-800/50">
                      <div className="flex items-center space-x-3">
                        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <p className="text-white font-medium">{user.name}</p>
                          <p className="text-gray-500 text-xs">{user.email}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleUnblockFromList(user.id)}
                        className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

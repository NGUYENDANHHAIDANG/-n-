import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Post, Reaction, Comment, User } from "../types";
import {
  mockGetPosts,
  mockCreatePost,
  mockAddComment,
  mockToggleReaction,
  mockToggleCommentReaction,
  mockGetAllUsers,
  mockCreateDirectChat,
  mockHeartbeat,
  mockGetNotifications,
  mockMarkNotificationRead
} from "../services/mockBackend";
import { AppNotification } from "../types";
import OnlineUsersSidebar from "../components/OnlineUsersSidebar";

const FEELINGS = [
  { emoji: '😀', label: 'happy' },
  { emoji: '😢', label: 'sad' },
  { emoji: '😡', label: 'angry' },
  { emoji: '😎', label: 'cool' },
  { emoji: '🤔', label: 'thinking' },
  { emoji: '😴', label: 'sleepy' },
  { emoji: '🥳', label: 'celebrating' },
  { emoji: '❤️', label: 'loved' },
  { emoji: '💪', label: 'motivated' },
  { emoji: '🤒', label: 'sick' },
];

const FeedPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostText, setNewPostText] = useState("");
  const [newPostImage, setNewPostImage] = useState<string | undefined>(
    undefined,
  );
  const [feeling, setFeeling] = useState<{ emoji: string, label: string } | undefined>(undefined);
  const [showFeelingModal, setShowFeelingModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {},
  );
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchUsers();
    fetchNotifications();
    if (user) {
      mockHeartbeat(user.id);
    }
    const interval = setInterval(() => {
      fetchPosts();
      fetchUsers();
      fetchNotifications();
      if (user) {
        mockHeartbeat(user.id);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    const notifs = await mockGetNotifications(user.id);
    setNotifications(notifs);
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await mockMarkNotificationRead(notif.id);
      fetchNotifications();
    }
    setShowNotifications(false);
    if (notif.type === 'friend_request' || notif.type === 'friend_accept') {
      navigate('/chat');
    } else if ((notif.type === 'comment' || notif.type === 'reaction') && notif.postId) {
      // Scroll to post
      setTimeout(() => {
        const element = document.getElementById(`post-${notif.postId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight effect
          element.classList.add('ring-2', 'ring-messenger-primary', 'transition-all', 'duration-500');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-messenger-primary');
          }, 2000);
        }
      }, 100);
    }
  };

  const fetchUsers = async () => {
    if (!user) return;
    const users = await mockGetAllUsers(user.id);
    setAllUsers(users);
  };

  const fetchPosts = async () => {
    const fetchedPosts = await mockGetPosts();
    setPosts(fetchedPosts);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!newPostText.trim() && !newPostImage && !feeling)) return;

    await mockCreatePost(user.id, newPostText, newPostImage, feeling ? `${feeling.emoji} ${feeling.label}` : undefined);
    setNewPostText("");
    setNewPostImage(undefined);
    setFeeling(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fetchPosts();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setNewPostImage(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleReaction = async (
    postId: string,
    type: Reaction["type"],
  ) => {
    if (!user) return;
    await mockToggleReaction(postId, user.id, type);
    fetchPosts();
  };

  const handleToggleCommentReaction = async (
    postId: string,
    commentId: string,
    type: Reaction["type"],
  ) => {
    if (!user) return;
    await mockToggleCommentReaction(postId, commentId, user.id, type);
    fetchPosts();
  };

  const handleReply = (postId: string, userName: string) => {
    const replyText = `@${userName} `;
    setCommentInputs((prev) => ({
      ...prev,
      [postId]: prev[postId] ? prev[postId] + replyText : replyText,
    }));
    setTimeout(() => {
      commentInputRefs.current[postId]?.focus();
    }, 0);
  };

  const handleAddComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!user) return;
    const text = commentInputs[postId];
    if (!text?.trim()) return;

    await mockAddComment(postId, user.id, text);
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    fetchPosts();
  };

  const formatTime = (date: Date | string | number) => {
    const dateObj = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const getReactionEmoji = (type: Reaction["type"]) => {
    switch (type) {
      case "like":
        return "👍";
      case "love":
        return "❤️";
      case "haha":
        return "😂";
      case "wow":
        return "😮";
      case "sad":
        return "😢";
      case "angry":
        return "😡";
      default:
        return "👍";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Navbar */}
      <nav className="bg-black border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-light tracking-wide text-messenger-primary">
            LuxNet
          </h1>
          <div className="flex items-center space-x-6">
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate("/admin")}
                className="text-red-500 hover:text-red-400 transition-colors"
                title="Admin Dashboard"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </button>
            )}
            <button
              onClick={() => navigate("/")}
              className="text-messenger-primary border-b-2 border-messenger-primary pb-1"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </button>
            <button
              onClick={() => navigate("/chat")}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="text-gray-500 hover:text-white transition-colors relative"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-gray-800">
                    <h3 className="text-white font-medium tracking-wide">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">No notifications yet.</div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-4 border-b border-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer flex items-start space-x-3 ${!notif.isRead ? 'bg-gray-800/30' : ''}`}
                        >
                          <img src={notif.actorAvatar} alt={notif.actorName} className="w-10 h-10 rounded-full object-cover border border-gray-700" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-300">
                              <span className="font-medium text-white">{notif.actorName}</span>
                              {notif.type === 'comment' && ' commented on your post.'}
                              {notif.type === 'reaction' && ' reacted to your post.'}
                              {notif.type === 'friend_request' && ' sent you a friend request.'}
                              {notif.type === 'friend_accept' && ' accepted your friend request.'}
                            </p>
                            {notif.text && <p className="text-xs text-gray-500 mt-1 truncate">"{notif.text}"</p>}
                            <p className="text-[10px] text-gray-500 mt-1">{formatTime(notif.timestamp)}</p>
                          </div>
                          {!notif.isRead && <div className="w-2 h-2 bg-messenger-primary rounded-full mt-2"></div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate("/profile")}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <img
                src={user?.avatar}
                alt="Profile"
                className="w-8 h-8 rounded-full border border-gray-800 object-cover"
              />
            </button>
            <button
              onClick={() => setShowLogoutDialog(true)}
              className="text-gray-500 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Logout Modal */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
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

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Feed Content */}
        <main className="flex-1 w-full py-8 px-4 overflow-y-auto custom-scrollbar">
          <div className="max-w-2xl mx-auto">
            {/* Create Post */}
            <div className="bg-[#1c1c1d] border border-gray-800 rounded-2xl p-5 mb-8 shadow-xl">
              <div className="flex space-x-4">
            <img
              src={user?.avatar}
              alt="Profile"
              className="w-12 h-12 rounded-full border border-gray-700 object-cover"
            />
            <form onSubmit={handleCreatePost} className="flex-1">
              <textarea
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full bg-transparent text-white text-lg resize-none focus:outline-none placeholder-gray-500 min-h-[80px] pt-2"
              />
              {newPostImage && (
                <div className="relative mb-4 rounded-xl overflow-hidden border border-gray-700">
                  <img
                    src={newPostImage}
                    alt="Upload preview"
                    className="w-full h-auto max-h-96 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setNewPostImage(undefined)}
                    className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-full hover:bg-black transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-gray-800/80 mt-2">
                <div className="flex space-x-2">
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
                    className="text-gray-400 hover:text-blue-400 transition-colors flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-800"
                  >
                    <svg
                      className="w-6 h-6 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-sm font-medium">Photo/Video</span>
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowFeelingModal(!showFeelingModal)}
                      className={`text-gray-400 hover:text-blue-400 transition-colors flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-800 hidden sm:flex ${feeling ? 'bg-gray-800 text-blue-400' : ''}`}
                    >
                      <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-sm font-medium">{feeling ? `Feeling ${feeling.label}` : 'Feeling/Activity'}</span>
                    </button>
                    
                    {showFeelingModal && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 p-2 grid grid-cols-2 gap-1">
                        {FEELINGS.map(f => (
                          <button
                            key={f.label}
                            type="button"
                            onClick={() => {
                              setFeeling(f);
                              setShowFeelingModal(false);
                            }}
                            className="flex items-center space-x-2 p-2 hover:bg-gray-800 rounded-lg text-left"
                          >
                            <span className="text-xl">{f.emoji}</span>
                            <span className="text-sm text-gray-300 capitalize">{f.label}</span>
                          </button>
                        ))}
                        {feeling && (
                          <button
                            type="button"
                            onClick={() => {
                              setFeeling(undefined);
                              setShowFeelingModal(false);
                            }}
                            className="col-span-2 flex items-center justify-center space-x-2 p-2 hover:bg-gray-800 rounded-lg text-red-400 mt-1 border-t border-gray-800"
                          >
                            <span className="text-sm">Clear Feeling</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!newPostText.trim() && !newPostImage && !feeling}
                  className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Post
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Feed */}
        <div className="space-y-6">
          {posts.map((post) => (
            <div
              key={post.id}
              id={`post-${post.id}`}
              className="bg-black border border-gray-800 rounded-2xl shadow-xl overflow-hidden"
            >
              {/* Post Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={post.userAvatar}
                    alt={post.userName}
                    className="w-10 h-10 rounded-full border border-gray-800 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate(`/profile/${post.userId}`)}
                  />
                  <div>
                    <h3
                      className="font-medium text-white tracking-wide cursor-pointer hover:underline"
                      onClick={() => navigate(`/profile/${post.userId}`)}
                    >
                      {post.userName}
                    </h3>
                    <p className="text-xs text-gray-500 tracking-wider">
                      {formatTime(post.timestamp)}
                    </p>
                  </div>
                </div>
                <button className="text-gray-500 hover:text-white p-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                    />
                  </svg>
                </button>
              </div>

              {/* Post Content */}
              {post.feeling && (
                <div className="px-4 pb-2">
                  <span className="inline-flex items-center space-x-1.5 bg-gray-900 text-gray-300 px-3 py-1 rounded-full text-sm border border-gray-800">
                    <span>is feeling</span>
                    <span className="font-medium">{post.feeling}</span>
                  </span>
                </div>
              )}
              {post.text && (
                <div className="px-4 pb-3">
                  <p className="text-gray-200 tracking-wide leading-relaxed whitespace-pre-wrap">
                    {post.text.split(/(\s+)/).map((word, i) =>
                      word.startsWith("@") ? (
                        <span
                          key={i}
                          className="text-messenger-primary font-medium"
                        >
                          {word}
                        </span>
                      ) : (
                        word
                      ),
                    )}
                  </p>
                </div>
              )}
              {post.image && (
                <div className="w-full border-y border-gray-800/50">
                  <img
                    src={post.image}
                    alt="Post content"
                    className="w-full h-auto max-h-[600px] object-cover"
                  />
                </div>
              )}

              {/* Post Stats */}
              <div className="px-4 py-3 flex items-center justify-between text-xs text-gray-500 border-b border-gray-800/50">
                <div className="flex items-center space-x-1">
                  {post.reactions.length > 0 && (
                    <>
                      <span className="flex -space-x-1">
                        {Array.from(new Set(post.reactions.map((r) => r.type)))
                          .slice(0, 3)
                          .map((type, i) => (
                            <span
                              key={i}
                              className="w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center border border-black text-[10px]"
                            >
                              {getReactionEmoji(type as Reaction["type"])}
                            </span>
                          ))}
                      </span>
                      <span className="ml-2 tracking-wide">
                        {post.reactions.length}
                      </span>
                    </>
                  )}
                </div>
                <div className="tracking-wide">
                  {post.comments.length > 0 && (
                    <span>{post.comments.length} comments</span>
                  )}
                </div>
              </div>

              {/* Post Actions */}
              <div className="px-2 py-1 flex items-center justify-between border-b border-gray-800/50">
                <div className="relative group flex-1">
                  <button
                    onClick={() => handleToggleReaction(post.id, "like")}
                    className={`w-full py-2 flex items-center justify-center space-x-2 rounded-lg hover:bg-gray-900 transition-colors ${post.reactions.some((r) => r.userId === user?.id) ? "text-messenger-primary" : "text-gray-400"}`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.514"
                      />
                    </svg>
                    <span className="text-sm font-medium tracking-wide">
                      Like
                    </span>
                  </button>
                  {/* Reaction Popover */}
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex bg-gray-900 border border-gray-800 rounded-full p-1 shadow-2xl space-x-1 z-10">
                    {["like", "love", "haha", "wow", "sad", "angry"].map(
                      (type) => (
                        <button
                          key={type}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleReaction(
                              post.id,
                              type as Reaction["type"],
                            );
                          }}
                          className="w-10 h-10 hover:scale-125 transition-transform flex items-center justify-center text-2xl"
                        >
                          {getReactionEmoji(type as Reaction["type"])}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <button className="flex-1 py-2 flex items-center justify-center space-x-2 text-gray-400 hover:bg-gray-900 rounded-lg transition-colors">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <span className="text-sm font-medium tracking-wide">
                    Comment
                  </span>
                </button>
              </div>

              {/* Comments Section */}
              <div className="p-4 bg-black/50">
                {post.comments.length > 0 && (
                  <div className="space-y-4 mb-4">
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="flex space-x-2">
                        <img
                          src={comment.userAvatar}
                          alt={comment.userName}
                          className="w-8 h-8 rounded-full border border-gray-800 object-cover mt-1 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => navigate(`/profile/${comment.userId}`)}
                        />
                        <div className="flex-1">
                          <div className="bg-gray-900 rounded-2xl px-4 py-2 inline-block">
                            <p
                              className="font-medium text-sm text-white tracking-wide cursor-pointer hover:underline"
                              onClick={() =>
                                navigate(`/profile/${comment.userId}`)
                              }
                            >
                              {comment.userName}
                            </p>
                            <p className="text-sm text-gray-300 tracking-wide whitespace-pre-wrap">
                              {comment.text.split(/(\s+)/).map((word, i) =>
                                word.startsWith("@") ? (
                                  <span
                                    key={i}
                                    className="text-messenger-primary font-medium"
                                  >
                                    {word}
                                  </span>
                                ) : (
                                  word
                                ),
                              )}
                            </p>
                          </div>
                          <div className="flex items-center space-x-3 text-[11px] text-gray-500 mt-1 ml-2 tracking-wider">
                            <span>{formatTime(comment.timestamp)}</span>

                            {/* Comment Reaction Popover */}
                            <div className="relative group/comment">
                              <button
                                onClick={() =>
                                  handleToggleCommentReaction(
                                    post.id,
                                    comment.id,
                                    "like",
                                  )
                                }
                                className={`font-medium hover:underline ${comment.reactions?.some((r) => r.userId === user?.id) ? "text-messenger-primary" : ""}`}
                              >
                                Like
                              </button>
                              <div className="absolute bottom-full left-0 mb-1 hidden group-hover/comment:flex bg-gray-900 border border-gray-800 rounded-full p-1 shadow-2xl space-x-1 z-10">
                                {[
                                  "like",
                                  "love",
                                  "haha",
                                  "wow",
                                  "sad",
                                  "angry",
                                ].map((type) => (
                                  <button
                                    key={type}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleCommentReaction(
                                        post.id,
                                        comment.id,
                                        type as Reaction["type"],
                                      );
                                    }}
                                    className="w-8 h-8 hover:scale-125 transition-transform flex items-center justify-center text-xl"
                                  >
                                    {getReactionEmoji(type as Reaction["type"])}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={() =>
                                handleReply(post.id, comment.userName)
                              }
                              className="font-medium hover:underline"
                            >
                              Reply
                            </button>

                            {/* Comment Reactions Display */}
                            {comment.reactions &&
                              comment.reactions.length > 0 && (
                                <div className="flex items-center space-x-1 bg-gray-900 px-1.5 py-0.5 rounded-full border border-gray-800">
                                  <span className="flex -space-x-1">
                                    {Array.from(
                                      new Set(
                                        comment.reactions.map((r) => r.type),
                                      ),
                                    )
                                      .slice(0, 3)
                                      .map((type, i) => (
                                        <span
                                          key={i}
                                          className="w-3.5 h-3.5 bg-black rounded-full flex items-center justify-center border border-gray-800 text-[8px]"
                                        >
                                          {getReactionEmoji(
                                            type as Reaction["type"],
                                          )}
                                        </span>
                                      ))}
                                  </span>
                                  <span className="text-[10px]">
                                    {comment.reactions.length}
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment */}
                <div className="flex space-x-2">
                  <img
                    src={user?.avatar}
                    alt="Profile"
                    className="w-8 h-8 rounded-full border border-gray-800 object-cover"
                  />
                  <form
                    onSubmit={(e) => handleAddComment(e, post.id)}
                    className="flex-1 relative"
                  >
                    <input
                      type="text"
                      ref={(el) => (commentInputRefs.current[post.id] = el)}
                      placeholder="Write a comment..."
                      value={commentInputs[post.id] || ""}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      className="w-full bg-gray-900 text-white rounded-full py-2 pl-4 pr-10 focus:outline-none focus:ring-1 focus:ring-messenger-primary text-sm tracking-wide border border-gray-800"
                    />
                    <button
                      type="submit"
                      disabled={!commentInputs[post.id]?.trim()}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-messenger-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
          {posts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg font-serif tracking-wide">No posts yet.</p>
              <p className="text-sm tracking-wide mt-2">
                Be the first to share something!
              </p>
            </div>
          )}
          </div>
          </div>
        </main>

        {/* Online Users Sidebar */}
        <OnlineUsersSidebar 
          onlineUsers={allUsers.filter(u => u.isOnline)}
          onSelectUser={async (userId) => {
            if (!user) return;
            await mockCreateDirectChat(user.id, userId);
            
            const sortedIds = [user.id, userId].sort();
            const chatId = `c_${sortedIds[0]}_${sortedIds[1]}`;
            
            navigate('/chat', { state: { activeChatId: chatId } });
          }}
        />
      </div>
    </div>
  );
};

export default FeedPage;

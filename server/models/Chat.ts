import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  participants: [{ type: String }], // Array of User IDs
  lastMessage: { type: String },
  lastMessageTime: { type: Date, default: Date.now },
  unreadCounts: { type: Map, of: Number } // Map of UserId -> Count
});

export const Chat = mongoose.model('Chat', chatSchema);

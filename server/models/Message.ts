import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  senderId: { type: String, required: true },
  text: { type: String },
  image: { type: String },
  timestamp: { type: Date, default: Date.now },
  isOwn: { type: Boolean, default: false }, // Note: In a real DB, this is determined at query time relative to user
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' }
});

export const Message = mongoose.model('Message', messageSchema);

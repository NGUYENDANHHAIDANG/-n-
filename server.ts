import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

import authRoutes from './server/routes/auth';
import userRoutes from './server/routes/users';
import chatRoutes from './server/routes/chats';
import friendRoutes from './server/routes/friends';
import { User } from './server/models/User';

dotenv.config();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  const PORT = 3000; // Platform constraint: MUST be 3000

  // Middleware
  app.use(cors());
  app.use(bodyParser.json());

  // Database Connection
  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log(`[DB] Connected to MongoDB at: ${process.env.MONGO_URI}`);
    } else {
      console.log(`[DB] No MONGO_URI provided. Skipping MongoDB connection for preview.`);
    }
  } catch (err) {
    console.error('[DB] Failed to connect to MongoDB', err);
  }

  // Socket.IO Logic
  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
      console.log(`[Socket] User ${socket.id} joined chat ${chatId}`);
    });

    socket.on('send_message', (data) => {
      // Broadcast to everyone in the room except sender
      socket.to(data.chatId).emit('receive_message', data);
    });

    // PQC Key Exchange Events
    socket.on('pqc_public_key', (data) => {
      // data: { chatId, senderId, publicKey }
      socket.to(data.chatId).emit('pqc_public_key', data);
    });

    socket.on('pqc_ciphertext', (data) => {
      // data: { chatId, senderId, cipherText }
      socket.to(data.chatId).emit('pqc_ciphertext', data);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/chats', chatRoutes);
  app.use('/api/friends', friendRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

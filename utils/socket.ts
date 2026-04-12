import { io } from 'socket.io-client';

// Connect to the same host that serves the frontend
export const socket = io(window.location.origin);

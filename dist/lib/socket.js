"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io;
const initSocket = (httpServer) => {
    const allowedOrigins = [
        'http://localhost:3000',
        'https://frontendrei.vercel.app'
    ];
    if (process.env.FRONTEND_URL) {
        const envOrigin = process.env.FRONTEND_URL;
        if (!allowedOrigins.includes(envOrigin)) {
            allowedOrigins.push(envOrigin);
        }
    }
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            credentials: true
        }
    });
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
exports.getIO = getIO;

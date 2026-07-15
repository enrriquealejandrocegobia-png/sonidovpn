import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createServer as createHttpServer } from "http";
import { Server } from "socket.io";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createHttpServer(app);

  // Set up Socket.IO
  const io = new Server(httpServer, {
    cors: { origin: '*' },
    maxHttpBufferSize: 1e8 // 100 MB, just in case
  });

  io.on('connection', (socket) => {
    // Both sender and receiver join via a PIN
    socket.on('join-room', (pin) => {
      socket.join(pin);
      socket.to(pin).emit('peer-joined');
    });

    socket.on('audio-chunk', ({ pin, chunk }) => {
      // Broadcast the audio chunk to all other clients in the room (the receiver)
      socket.to(pin).emit('audio-chunk', chunk);
    });

    socket.on('stop-audio', (pin) => {
      socket.to(pin).emit('stop-audio');
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

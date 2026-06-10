/*
  ================================================
  SAFETALK — Node.js Backend Server (server/index.js)
  ================================================

  This is the SERVER — think of it like a post office.
  
  When User A sends a message:
    1. React app sends it to THIS server
    2. Server receives it
    3. Server immediately forwards it to User B
    4. User B sees it instantly (no page refresh!)
  
  This uses:
  - Express   → sets up the server
  - Socket.io → handles real-time connections
  - CORS      → lets the React app talk to this server
  ================================================
*/

const express = require('express');       // Web server framework
const http = require('http');             // Built into Node.js
const { Server } = require('socket.io'); // Real-time library
const cors = require('cors');             // Allows cross-origin requests

const app = express();
app.use(cors()); // Allow React (port 5173) to talk to server (port 3001)
app.use(express.json());

// Create HTTP server (needed for Socket.io)
const server = http.createServer(app);

// Attach Socket.io to the server
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // React dev server URL or production Vercel URL
    methods: ["GET", "POST"]
  }
});

/* ================================================
   IN-MEMORY STORAGE
   For the demo we store everything in memory.
   (In a real app this would be a database like MongoDB)
   
   Think of this like a whiteboard — it works great
   but gets erased when the server restarts.
================================================ */
const users = new Map();        // username → user info
const onlineUsers = new Map();  // socketId → username
const messages = new Map();     // conversationId → messages array

/* ================================================
   REST API ROUTES
   These handle login/register (HTTP requests,
   not real-time)
================================================ */

// POST /api/register — Create a new account
app.post('/api/register', (req, res) => {
  const { username, displayName, password } = req.body;

  // Check if username is taken
  if (users.has(username)) {
    return res.status(400).json({ error: 'Username already taken' });
  }

  // Assign a random avatar color
  const colors = ['#7c3aed', '#00c9a7', '#f59e0b', '#ef4444', '#06b6d4', '#22c55e', '#f43f5e'];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];

  // Save the user
  const newUser = { username, displayName, password, avatarColor, joinedAt: new Date() };
  users.set(username, newUser);

  console.log(`✅ New user registered: @${username}`);

  // Return user info (without password)
  const { password: _, ...safeUser } = newUser;
  res.json({ success: true, user: safeUser });
});

// POST /api/login — Check credentials
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  console.log(`🔑 User logged in: @${username}`);
  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// GET /api/users — Get list of all registered users (for "New Chat")
app.get('/api/users', (req, res) => {
  const userList = Array.from(users.values()).map(({ password: _, ...u }) => ({
    ...u,
    online: Array.from(onlineUsers.values()).includes(u.username)
  }));
  res.json(userList);
});

// GET /api/messages/:convId — Get message history for a conversation
app.get('/api/messages/:convId', (req, res) => {
  const msgs = messages.get(req.params.convId) || [];
  res.json(msgs);
});

// Health check
app.get('/', (req, res) => res.send('SafeTalk Server is running! 🚀'));


/* ================================================
   SOCKET.IO — REAL-TIME EVENTS
   
   Think of Socket.io like a phone call:
   - "connect"    → user picks up the phone
   - "join"       → user tells us their name
   - "sendMessage"→ user speaks into the phone
   - "disconnect" → user hangs up
================================================ */

io.on('connection', (socket) => {
  console.log(`🔌 New connection: ${socket.id}`);

  /* ---- User joins (tells server who they are) ---- */
  socket.on('join', (username) => {
    onlineUsers.set(socket.id, username);
    socket.username = username;
    console.log(`👤 @${username} is now online`);

    // Tell everyone this user is now online
    io.emit('userOnline', username);

    // Send back the list of online users
    socket.emit('onlineUsers', Array.from(onlineUsers.values()));
  });

  /* ---- User sends a message ---- */
  socket.on('sendMessage', (data) => {
    /*
      data = {
        to: 'recipient_username',
        from: 'sender_username',
        text: 'Hello!',
        conversationId: 'alex_priya' (sorted usernames)
      }
    */
    const message = {
      id: Date.now().toString(),
      from: data.from,
      to: data.to,
      text: data.text,
      time: new Date().toISOString(),
      read: false
    };

    // Save message to conversation history
    const convId = data.conversationId;
    if (!messages.has(convId)) messages.set(convId, []);
    messages.get(convId).push(message);

    console.log(`💬 Message from @${data.from} to @${data.to}: "${data.text}"`);

    // Send to the SENDER (confirm delivery)
    socket.emit('messageDelivered', message);

    // Find recipient's socket and send to them
    const recipientSocketId = [...onlineUsers.entries()]
      .find(([_, uname]) => uname === data.to)?.[0];

    if (recipientSocketId) {
      io.to(recipientSocketId).emit('newMessage', message);
      console.log(`📨 Delivered to @${data.to}`);
    } else {
      console.log(`📭 @${data.to} is offline — message saved`);
    }
  });

  /* ---- User is typing ---- */
  socket.on('typing', (data) => {
    // Find recipient and tell them someone is typing
    const recipientSocketId = [...onlineUsers.entries()]
      .find(([_, uname]) => uname === data.to)?.[0];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('userTyping', { from: data.from });
    }
  });

  /* ---- User stopped typing ---- */
  socket.on('stopTyping', (data) => {
    const recipientSocketId = [...onlineUsers.entries()]
      .find(([_, uname]) => uname === data.to)?.[0];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('userStoppedTyping', { from: data.from });
    }
  });

  /* ---- Message read ---- */
  socket.on('messageRead', (data) => {
    const recipientSocketId = [...onlineUsers.entries()]
      .find(([_, uname]) => uname === data.from)?.[0];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('messageReadReceipt', data);
    }
  });

  /* ---- User disconnects (closes tab/browser) ---- */
  socket.on('disconnect', () => {
    const username = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);
    if (username) {
      console.log(`👋 @${username} went offline`);
      io.emit('userOffline', username);
    }
  });
});


/* ================================================
   START THE SERVER
   Listen on port 3001.
================================================ */
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 SafeTalk Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for real-time connections`);
  console.log(`\nWaiting for users to connect...\n`);
});

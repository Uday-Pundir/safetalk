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

require('dotenv').config();               // Load environment variables from .env
const express = require('express');       // Web server framework
const http = require('http');             // Built into Node.js
const { Server } = require('socket.io'); // Real-time library
const cors = require('cors');             // Allows cross-origin requests
const mongoose = require('mongoose');     // MongoDB driver and modeling tool

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
   DATABASE CONNECTION (MONGODB)
================================================ */
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
} else {
  console.log('⚠️ MONGODB_URI is not set. Database operations will fail. Add MONGODB_URI to your environment variables!');
}

/* ================================================
   SCHEMAS & MODELS
================================================ */
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  displayName: { type: String, required: true },
  password: { type: String, required: true },
  avatarColor: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const messageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  text: { type: String, required: true },
  time: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  conversationId: { type: String, required: true },
  reaction: { type: String, default: null }
});

const Message = mongoose.model('Message', messageSchema);

// Keep onlineUsers in memory since it only tracks transient connected socket IDs
const onlineUsers = new Map();  // socketId → username

/* ================================================
   REST API ROUTES
   These handle login/register (HTTP requests,
   not real-time)
================================================ */

// POST /api/register — Create a new account
app.post('/api/register', async (req, res) => {
  const { username, displayName, password } = req.body;

  try {
    // Check if username is taken
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Assign a random avatar color
    const colors = ['#7c3aed', '#00c9a7', '#f59e0b', '#ef4444', '#06b6d4', '#22c55e', '#f43f5e'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    // Save the user to database
    const newUser = await User.create({ username, displayName, password, avatarColor });

    console.log(`✅ New user registered: @${username}`);

    // Return user info (without password)
    res.json({
      success: true,
      user: {
        username: newUser.username,
        displayName: newUser.displayName,
        avatarColor: newUser.avatarColor,
        joinedAt: newUser.joinedAt
      }
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/login — Check credentials
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    console.log(`🔑 User logged in: @${username}`);
    res.json({
      success: true,
      user: {
        username: user.username,
        displayName: user.displayName,
        avatarColor: user.avatarColor,
        joinedAt: user.joinedAt
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/users — Get list of all registered users (for "New Chat")
app.get('/api/users', async (req, res) => {
  try {
    const allDbUsers = await User.find({}, 'username displayName avatarColor joinedAt');
    const userList = allDbUsers.map(u => ({
      username: u.username,
      displayName: u.displayName,
      avatarColor: u.avatarColor,
      joinedAt: u.joinedAt,
      online: Array.from(onlineUsers.values()).includes(u.username)
    }));
    res.json(userList);
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Server error listing users' });
  }
});

// GET /api/messages/:convId — Get message history for a conversation
app.get('/api/messages/:convId', async (req, res) => {
  try {
    const msgs = await Message.find({ conversationId: req.params.convId }).sort({ time: 1 });
    res.json(msgs);
  } catch (error) {
    console.error('Error loading messages:', error);
    res.status(500).json({ error: 'Server error loading messages' });
  }
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
  socket.on('sendMessage', async (data) => {
    const message = {
      id: Date.now().toString(),
      from: data.from,
      to: data.to,
      text: data.text,
      time: new Date().toISOString(),
      read: false,
      conversationId: data.conversationId
    };

    try {
      // Save message to MongoDB
      const savedMessage = await Message.create(message);

      console.log(`💬 Message from @${data.from} to @${data.to}: "${data.text}"`);

      // Send to the SENDER (confirm delivery)
      socket.emit('messageDelivered', savedMessage);

      // Find recipient's socket and send to them
      const recipientSocketId = [...onlineUsers.entries()]
        .find(([_, uname]) => uname === data.to)?.[0];

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('newMessage', savedMessage);
        console.log(`📨 Delivered to @${data.to}`);
      } else {
        console.log(`📭 @${data.to} is offline — message saved in MongoDB`);
      }
    } catch (error) {
      console.error('Error saving/sending message:', error);
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
  socket.on('messageRead', async (data) => {
    try {
      // Update read status in MongoDB
      await Message.updateOne({ id: data.msgId }, { $set: { read: true } });
      
      const recipientSocketId = [...onlineUsers.entries()]
        .find(([_, uname]) => uname === data.from)?.[0];
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('messageReadReceipt', data);
      }
    } catch (error) {
      console.error('Error updating message read status:', error);
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

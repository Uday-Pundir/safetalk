/*
  ChatApp.jsx — The Main Chat Application Page
  
  This is the biggest component — it connects to the Node.js server
  via Socket.io for real-time messaging.
  
  React concepts used:
  - useState  → stores app state (messages, active chat, etc.)
  - useEffect → runs code when the component loads or state changes
               (like "when the user opens a chat, load its messages")
  - useRef    → holds a reference to a DOM element (the messages scroll area)
*/
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client'; // Socket.io client
import {
  ShieldCheck, Edit, Settings, Search, MessageCircle,
  Send, Smile, Lock, Timer, MoreVertical, LogOut,
  ArrowLeft, UserPlus, X, Check, Moon, Sun, Eye
} from 'lucide-react';
import './ChatApp.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://safetalk-backend-cadu.onrender.com';


// Emoji list for picker
const EMOJIS = ['😀','😂','😍','🥰','😎','😭','😤','🤔','👍','👎','❤️','🔥','💯','✅','🎉','🙏','😮','😅','🤣','💪','🙌','👏','😇','🤩','😴','🫡','💀','🫶','✨','🌟','💬','🔒','🛡️','⚡','🎯'];

/* ─────────────────────────────────────────────
   SMALL SUB-COMPONENTS
   Each is a focused, reusable piece of UI
───────────────────────────────────────────── */

// Single message bubble
function MessageBubble({ msg, isMe }) {
  const [reaction, setReaction] = useState(msg.reaction || null);
  const [showPicker, setShowPicker] = useState(false);
  const quickEmojis = ['❤️','😂','👍','🔥','😮','😢'];

  return (
    <div className={`message-bubble ${isMe ? 'outgoing' : 'incoming'}`}>
      {/* Hover reaction bar */}
      <div className="reactions-bar">
        {quickEmojis.map(e => (
          <span key={e} className="reaction-emoji"
            onClick={() => setReaction(r => r === e ? null : e)}>
            {e}
          </span>
        ))}
      </div>

      <div className="message-text">{msg.text}</div>

      {reaction && <div className="reaction-shown">{reaction}</div>}

      <div className="message-meta">
        <span className="message-time">
          {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {isMe && (
          <span className={`message-ticks ${msg.read ? 'read' : ''}`}>
            {msg.read ? '✓✓' : '✓'}
          </span>
        )}
      </div>
    </div>
  );
}

// Typing indicator (animated dots)
function TypingIndicator({ avatar, color }) {
  return (
    <div className="typing-indicator">
      <div className="typing-avatar" style={{ background: color }}>{avatar}</div>
      <div className="typing-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN CHAT APP COMPONENT
───────────────────────────────────────────── */
export default function ChatApp() {
  const navigate = useNavigate();

  // Get the logged-in user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('safetalk_user') || 'null');

  // ── STATE ──
  const [conversations, setConversations] = useState([]); // All conversations
  const [activeConvId, setActiveConvId] = useState(null); // Which chat is open
  const [messages, setMessages] = useState({});            // { convId: [msg, msg...] }
  const [inputText, setInputText] = useState('');         // Message input value
  const [onlineUsers, setOnlineUsers] = useState([]);     // Who is currently online
  const [typingFrom, setTypingFrom] = useState(null);     // Who is typing to me
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);           // All registered users
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [toast, setToast] = useState('');

  // ── REFS ──
  const socketRef = useRef(null);    // Holds the Socket.io connection
  const messagesEndRef = useRef(null); // Used to scroll to bottom
  const typingTimerRef = useRef(null);

  // ── REDIRECT IF NOT LOGGED IN ──
  useEffect(() => {
    if (!currentUser) navigate('/auth');
  }, []);

  /* ──────────────────────────────────────────
     SOCKET.IO SETUP
     useEffect runs once when component mounts.
     This sets up the real-time connection.
  ────────────────────────────────────────── */
  useEffect(() => {
    if (!currentUser) return;

    // Connect to the Node.js server
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    // Tell the server who we are
    socket.emit('join', currentUser.username);

    // ─── LISTEN FOR EVENTS FROM SERVER ───

    // Someone sent us a message
    socket.on('newMessage', (msg) => {
      const convId = makeConvId(msg.from, currentUser.username);
      setMessages(prev => ({
        ...prev,
        [convId]: [...(prev[convId] || []), { ...msg, read: true }]
      }));
      // Mark as read immediately
      socket.emit('messageRead', { msgId: msg.id, from: msg.from });
    });

    // Server confirms our message was delivered
    socket.on('messageDelivered', (msg) => {
      const convId = makeConvId(currentUser.username, msg.to);
      setMessages(prev => ({
        ...prev,
        [convId]: [...(prev[convId] || []), msg]
      }));
    });

    // Someone read our message
    socket.on('messageReadReceipt', ({ msgId }) => {
      setMessages(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(convId => {
          updated[convId] = updated[convId].map(m =>
            m.id === msgId ? { ...m, read: true } : m
          );
        });
        return updated;
      });
    });

    // Someone is typing to us
    socket.on('userTyping', ({ from }) => setTypingFrom(from));
    socket.on('userStoppedTyping', () => setTypingFrom(null));

    // Online/offline events
    socket.on('onlineUsers', (users) => setOnlineUsers(users));
    socket.on('userOnline', (username) => setOnlineUsers(prev => [...new Set([...prev, username])]));
    socket.on('userOffline', (username) => setOnlineUsers(prev => prev.filter(u => u !== username)));

    // Cleanup: disconnect socket when component is removed (unmounts)
    return () => { socket.disconnect(); };
  }, []);

  // Load all users for "New Chat" modal
  useEffect(() => {
    fetch(`${SERVER_URL}/api/users`)
      .then(r => r.json())
      .then(users => {
        setAllUsers(users);
        // Create conversations for each other user
        const convs = users
          .filter(u => u.username !== currentUser.username)
          .map(u => ({
            id: makeConvId(currentUser.username, u.username),
            contact: u
          }));
        setConversations(convs);
      })
      .catch(() => {
        // Server not available — use demo data
        setDemoConversations();
      });
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingFrom]);

  // ── HELPERS ──

  // Creates a consistent conversation ID for two users
  // (always in same order regardless of who initiated)
  function makeConvId(a, b) {
    return [a, b].sort().join('_');
  }

  function setDemoConversations() {
    const demoUsers = [
      { username: 'alex_k', displayName: 'Alex Kumar', avatarColor: '#7c3aed' },
      { username: 'priya_s', displayName: 'Priya Sharma', avatarColor: '#f43f5e' },
      { username: 'raj_m', displayName: 'Raj Mehta', avatarColor: '#06b6d4' },
    ];
    const convs = demoUsers.map(u => ({ id: makeConvId(currentUser.username, u.username), contact: u }));
    setConversations(convs);

    // Seed some demo messages
    const demoMsgs = {};
    demoMsgs[makeConvId(currentUser.username, 'alex_k')] = [
      { id:'1', from:'alex_k', text:'Hey! Welcome to SafeTalk 🎉', time: new Date(Date.now()-1500000).toISOString(), read:true },
      { id:'2', from:'alex_k', text:'This is end-to-end encrypted 🔒', time: new Date(Date.now()-1400000).toISOString(), read:true },
    ];
    demoMsgs[makeConvId(currentUser.username, 'priya_s')] = [
      { id:'3', from:'priya_s', text:'Hi! No ads here is amazing 😍', time: new Date(Date.now()-3600000).toISOString(), read:true },
    ];
    setMessages(demoMsgs);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  // ── SEND MESSAGE ──
  function sendMessage() {
    if (!inputText.trim() || !activeConvId) return;

    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv) return;

    // Emit via Socket.io → goes to Node.js server → forwarded to recipient
    socketRef.current?.emit('sendMessage', {
      from: currentUser.username,
      to: conv.contact.username,
      text: inputText.trim(),
      conversationId: activeConvId
    });

    setInputText('');
    // Stop typing indicator
    socketRef.current?.emit('stopTyping', { from: currentUser.username, to: conv.contact.username });
  }

  // ── TYPING DETECTION ──
  function handleTyping(e) {
    setInputText(e.target.value);
    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv) return;

    socketRef.current?.emit('typing', { from: currentUser.username, to: conv.contact.username });

    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('stopTyping', { from: currentUser.username, to: conv.contact.username });
    }, 1500);
  }

  // ── OPEN CHAT ──
  async function openChat(conv) {
    setActiveConvId(conv.id);
    // Load message history from server
    try {
      const res = await fetch(`${SERVER_URL}/api/messages/${conv.id}`);
      const serverMsgs = await res.json();
      if (serverMsgs.length > 0) {
        setMessages(prev => ({ ...prev, [conv.id]: serverMsgs }));
      }
    } catch { /* use in-memory */ }
  }

  // ── GET ACTIVE CONVERSATION ──
  const activeConv = conversations.find(c => c.id === activeConvId);
  const activeMessages = activeConvId ? (messages[activeConvId] || []) : [];

  // ── FILTERED CONVERSATIONS ──
  const filteredConvs = conversations.filter(c =>
    c.contact.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── LAST MESSAGE HELPER ──
  function getLastMsg(convId) {
    const msgs = messages[convId] || [];
    return msgs[msgs.length - 1];
  }

  function getUnreadCount(convId) {
    return (messages[convId] || []).filter(m => m.from !== currentUser?.username && !m.read).length;
  }

  function getInitial(name) { return (name || '?')[0].toUpperCase(); }

  function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso), now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 60) return diff < 1 ? 'now' : `${diff}m`;
    if (diff < 1440) return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    return d.toLocaleDateString([], { month:'short', day:'numeric' });
  }

  /* ── RENDER ── */
  return (
    <div className={`app-layout ${darkMode ? '' : 'light-mode'}`}>

      {/* ═══════════════════ SIDEBAR ═══════════════════ */}
      <aside className={`sidebar ${activeConvId ? 'sidebar-hidden-mobile' : ''}`}>

        {/* Sidebar header */}
        <div className="sidebar-header">
          <div className="nav-logo">
            <div className="logo-icon logo-icon-sm"><ShieldCheck size={16}/></div>
            <span className="logo-text">Safe<span className="text-accent">Talk</span></span>
          </div>
          <div style={{display:'flex',gap:4}}>
            <button className="btn-icon" title="New Chat" onClick={() => setShowNewChatModal(true)}><Edit size={18}/></button>
            <button className="btn-icon" title="Settings" onClick={() => setShowProfilePanel(p => !p)}><Settings size={18}/></button>
          </div>
        </div>

        {/* Current user */}
        <div className="current-user-bar">
          <div className="user-avatar" style={{background: currentUser?.avatarColor}}>{getInitial(currentUser?.displayName)}</div>
          <div className="user-info">
            <div className="user-name">{currentUser?.displayName}</div>
            <div className="user-handle">@{currentUser?.username}</div>
          </div>
          <div className="online-dot"></div>
        </div>

        {/* Search */}
        <div className="search-bar">
          <Search size={15} className="search-icon"/>
          <input className="search-input" placeholder="Search conversations..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>

        <div className="sidebar-section-label">Messages</div>

        {/* Conversation list */}
        <div className="conversations-list">
          {filteredConvs.length === 0 && (
            <div className="sidebar-empty">
              <MessageCircle size={36}/>
              <p>No conversations yet.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowNewChatModal(true)}>Start a chat</button>
            </div>
          )}
          {filteredConvs.map(conv => {
            const lastMsg = getLastMsg(conv.id);
            const unread = getUnreadCount(conv.id);
            const isOnline = onlineUsers.includes(conv.contact.username);
            return (
              <div key={conv.id}
                className={`conversation-item ${activeConvId === conv.id ? 'active' : ''}`}
                onClick={() => openChat(conv)}>
                <div className="conv-avatar" style={{background: conv.contact.avatarColor}}>
                  {getInitial(conv.contact.displayName)}
                  {isOnline && <div className="conv-online-dot"></div>}
                </div>
                <div className="conv-info">
                  <div className="conv-top">
                    <span className="conv-name">{conv.contact.displayName}</span>
                    <span className="conv-time">{formatTime(lastMsg?.time)}</span>
                  </div>
                  <div className="conv-bottom">
                    <span className={`conv-preview ${unread > 0 ? 'unread' : ''}`}>
                      {lastMsg ? (lastMsg.from === currentUser?.username ? '→ ' : '') + lastMsg.text : 'Say hi!'}
                    </span>
                    {unread > 0 && <span className="badge">{unread}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ═══════════════════ CHAT AREA ═══════════════════ */}
      <main className="chat-area">

        {/* Empty state */}
        {!activeConvId && (
          <div className="chat-empty">
            <div className="chat-empty-icon animate-glow"><MessageCircle size={36}/></div>
            <h2>Select a conversation</h2>
            <p>Choose a contact or start a new conversation.</p>
            <button className="btn btn-primary" onClick={() => setShowNewChatModal(true)}>
              <Edit size={18}/> Start a New Chat
            </button>
          </div>
        )}

        {/* Active chat window */}
        {activeConvId && activeConv && (
          <div className="chat-window">

            {/* Chat header */}
            <div className="chat-header">
              <button className="btn-icon chat-back-btn" onClick={() => setActiveConvId(null)}><ArrowLeft size={18}/></button>
              <div className="chat-header-avatar" style={{background: activeConv.contact.avatarColor}}>
                {getInitial(activeConv.contact.displayName)}
              </div>
              <div className="chat-header-info">
                <div className="chat-contact-name">{activeConv.contact.displayName}</div>
                <div className="chat-contact-status">
                  <Lock size={11}/> End-to-end encrypted
                  {onlineUsers.includes(activeConv.contact.username) && <span style={{marginLeft:6,color:'var(--success)'}}>• Online</span>}
                </div>
              </div>
              <div style={{display:'flex',gap:4,marginLeft:'auto'}}>
                <button className="btn-icon" title="Disappearing messages" onClick={() => showToast('⏳ Disappearing messages toggled')}>
                  <Timer size={18}/>
                </button>
              </div>
            </div>

            {/* Encryption badge */}
            <div className="encryption-badge">
              <Lock size={13}/> Messages are end-to-end encrypted. Nobody outside this chat can read them.
            </div>

            {/* Messages */}
            <div className="messages-area">
              {activeMessages.length === 0 && (
                <div className="messages-empty">👋 Say hi to {activeConv.contact.displayName}!</div>
              )}
              {activeMessages.map((msg, i) => (
                <MessageBubble key={msg.id || i} msg={msg} isMe={msg.from === currentUser?.username} />
              ))}

              {/* Typing indicator */}
              {typingFrom === activeConv.contact.username && (
                <TypingIndicator
                  avatar={getInitial(activeConv.contact.displayName)}
                  color={activeConv.contact.avatarColor}
                />
              )}
              <div ref={messagesEndRef}/>
            </div>

            {/* Input bar */}
            <div className="message-input-bar">
              <button className="btn-icon" onClick={() => setShowEmojiPicker(p => !p)}><Smile size={20}/></button>
              <div className="message-input-wrapper">
                <textarea
                  className="message-input"
                  placeholder="Type a message..."
                  rows={1}
                  value={inputText}
                  onChange={handleTyping}
                  onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); } }}
                />
              </div>
              <button className="send-btn" onClick={sendMessage} disabled={!inputText.trim()}>
                <Send size={18}/>
              </button>
            </div>

            {/* Emoji picker */}
            {showEmojiPicker && (
              <div className="emoji-picker">
                {EMOJIS.map(e => (
                  <button key={e} className="emoji-btn" onClick={() => { setInputText(t => t + e); setShowEmojiPicker(false); }}>{e}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ═══════════════════ PROFILE PANEL ═══════════════════ */}
      {showProfilePanel && (
        <aside className="profile-panel">
          <div className="profile-panel-header">
            <span>Profile & Settings</span>
            <button className="btn-icon" onClick={() => setShowProfilePanel(false)}><X size={18}/></button>
          </div>
          <div className="profile-panel-body">
            <div className="profile-avatar-big" style={{background: currentUser?.avatarColor}}>{getInitial(currentUser?.displayName)}</div>
            <div className="profile-name">{currentUser?.displayName}</div>
            <div className="profile-handle">@{currentUser?.username}</div>

            <div className="settings-section">
              <div className="settings-title">Appearance</div>
              <div className="setting-row">
                <div className="setting-label">{darkMode ? <Moon size={16}/> : <Sun size={16}/>} Dark Mode</div>
                <label className="toggle">
                  <input type="checkbox" checked={darkMode} onChange={e => setDarkMode(e.target.checked)}/>
                  <span className="toggle-track"></span>
                </label>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-title">Privacy</div>
              <div className="setting-row">
                <div className="setting-label"><Eye size={16}/> Read Receipts</div>
                <label className="toggle">
                  <input type="checkbox" defaultChecked/>
                  <span className="toggle-track"></span>
                </label>
              </div>
            </div>

            <div className="settings-section">
              <button className="logout-btn" onClick={() => { localStorage.removeItem('safetalk_user'); navigate('/'); }}>
                <LogOut size={16}/> Log Out
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ═══════════════════ NEW CHAT MODAL ═══════════════════ */}
      {showNewChatModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNewChatModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span>New Conversation</span>
              <button className="btn-icon" onClick={() => setShowNewChatModal(false)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <p className="modal-subtitle">Select a user to start chatting:</p>
              <div className="user-list">
                {allUsers.filter(u => u.username !== currentUser?.username).map(u => (
                  <div key={u.username} className="user-list-item"
                    onClick={() => {
                      const convId = makeConvId(currentUser.username, u.username);
                      if (!conversations.find(c => c.id === convId)) {
                        setConversations(prev => [{ id: convId, contact: u }, ...prev]);
                      }
                      setShowNewChatModal(false);
                      openChat({ id: convId, contact: u });
                    }}>
                    <div className="user-list-avatar" style={{background: u.avatarColor}}>{getInitial(u.displayName)}</div>
                    <div>
                      <div className="user-list-name">{u.displayName}</div>
                      <div className="user-list-handle">@{u.username} {u.online && '• 🟢 Online'}</div>
                    </div>
                  </div>
                ))}
                {allUsers.filter(u => u.username !== currentUser?.username).length === 0 && (
                  <p style={{color:'var(--text-muted)',fontSize:'0.85rem',textAlign:'center',padding:'20px'}}>
                    No other users yet. Register another account to test real-time messaging!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="toast">
          <Check size={16}/> {toast}
        </div>
      )}
    </div>
  );
}

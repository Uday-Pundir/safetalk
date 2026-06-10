/*
  Landing.jsx — The landing/home page component
  
  In React, a "component" is just a JavaScript function that returns HTML-like code (called JSX).
  JSX looks like HTML but runs in JavaScript — that's the React magic!
  
  This page shows:
  - Navigation bar
  - Hero section (big headline)
  - Features section
  - Privacy section
  - Call to action
*/
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, MessageCircle, Lock, Ban, DatabaseZap, UserCheck, Zap, Timer, PlayCircle, UserPlus } from 'lucide-react';
import './Landing.css';

// ── Small reusable sub-component: Feature Card ──
// Props are like function parameters — data passed into the component
function FeatureCard({ icon: Icon, title, desc, tag, color }) {
  return (
    <div className="feature-card">
      <div className="feature-icon" style={{ '--icon-color': color }}>
        <Icon size={24} />
      </div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-desc">{desc}</p>
      <div className="feature-tag">{tag}</div>
    </div>
  );
}

// ── Small reusable sub-component: Survey Quote Card ──
function QuoteCard({ text, name, role, color }) {
  return (
    <div className="quote-card">
      <p className="quote-text">"{text}"</p>
      <div className="quote-author">
        <div className="quote-avatar" style={{ background: color }}>
          {name[0]}
        </div>
        <div>
          <div className="quote-name">{name}</div>
          <div className="quote-role">{role}</div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN LANDING PAGE COMPONENT ──
export default function Landing() {
  // useNavigate = lets us go to a different page programmatically
  const navigate = useNavigate();

  // Features data — survey-driven
  const features = [
    { icon: Lock,       title: 'End-to-End Encrypted',      color: '#00c9a7', tag: 'Most requested in survey',       desc: 'Your messages are scrambled on your device. Only the recipient can read them — not even we can.' },
    { icon: Ban,        title: 'Zero Ads, Forever',          color: '#7c3aed', tag: 'Top complaint about other apps', desc: 'No banner ads. No sponsored messages. No algorithm pushing products. Just clean chat.' },
    { icon: DatabaseZap,title: 'No Data Collection',         color: '#f59e0b', tag: 'Critical for 90% of respondents',desc: 'We don\'t track what you say, who you talk to, or how long you use the app.' },
    { icon: UserCheck,  title: 'No Phone Number Needed',     color: '#06b6d4', tag: 'Inspired by Telegram users',      desc: 'Sign up with just a username. No personal details required. Stay anonymous if you want.' },
    { icon: Zap,        title: 'Real-Time Messaging',        color: '#22c55e', tag: 'Fast & reliable',                 desc: 'Messages appear instantly via Socket.io. Typing indicators and read receipts included.' },
    { icon: Timer,      title: 'Disappearing Messages',      color: '#f43f5e', tag: 'Extra privacy layer',             desc: 'Set messages to auto-delete. Perfect for extra-sensitive conversations.' },
  ];

  // Real survey quotes
  const quotes = [
    { text: 'Give privacy restriction like Telegram — encryption privacy, no AI environment because AI is also taking our data.', name: 'Student, 18–24', role: 'Survey Respondent', color: '#7c3aed' },
    { text: 'The app should work good on systems with low specifications — fast performance matters.', name: 'Student, 18–24', role: 'Survey Respondent', color: '#00c9a7' },
    { text: 'In a group chat, only allowed people should see the message — better performance, better interface.', name: 'Working Professional, 25–34', role: 'Survey Respondent', color: '#f59e0b' },
    { text: 'Privacy should be a big priority — easy way to move chats from other apps would help a lot.', name: 'Under 18', role: 'Survey Respondent', color: '#06b6d4' },
  ];

  return (
    <div className="landing">

      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="nav-container">
          <a href="/" className="nav-logo">
            <div className="logo-icon"><ShieldCheck size={20} /></div>
            <span className="logo-text">Safe<span className="text-accent">Talk</span></span>
          </a>
          <ul className="nav-links">
            <li><a href="#features" className="nav-link">Features</a></li>
            <li><a href="#privacy" className="nav-link">Privacy</a></li>
            <li><a href="#why" className="nav-link">Why SafeTalk?</a></li>
          </ul>
          <div className="nav-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/auth?mode=login')}>Log In</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth?mode=register')}>Get Started Free</button>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="hero">
        <div className="hero-bg">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>

        <div className="hero-content animate-fadeIn">
          <div className="hero-badge">
            <ShieldCheck size={16} />
            <span>100% Private &amp; Encrypted</span>
          </div>

          <h1 className="hero-title">
            Chat Without <span className="title-gradient">Fear.</span>
            <br />Messaging That <span className="title-gradient">Respects You.</span>
          </h1>

          <p className="hero-subtitle">
            SafeTalk is built around your privacy. No ads. No data collection.
            No surveillance. Just pure, secure conversations.
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/auth?mode=register')}>
              <MessageCircle size={18} /> Start Chatting Free
            </button>
            <a href="#features" className="btn btn-ghost btn-lg">
              <PlayCircle size={18} /> See How It Works
            </a>
          </div>

          <div className="hero-stats">
            {[['E2E','Encrypted'],['0','Ads Ever'],['0','Data Sold'],['Free','Always']].map(([n,l]) => (
              <div key={l} className="stat">
                <span className="stat-number">{n}</span>
                <span className="stat-label">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Phone mockup */}
        <div className="hero-visual animate-fadeIn">
          <div className="phone-mockup">
            <div className="phone-screen">
              <div className="mock-header">
                <div className="mock-avatar">A</div>
                <div className="mock-user-info">
                  <div className="mock-name">Alex</div>
                  <div className="mock-status"><Lock size={10} /> End-to-end encrypted</div>
                </div>
                <Lock size={16} className="mock-lock" />
              </div>
              <div className="mock-messages">
                <div className="mock-msg mock-msg-in">Hey! Is this really private? 🔒</div>
                <div className="mock-msg mock-msg-out">Yes! Encrypted before it leaves your device. <div className="mock-ticks">✓✓</div></div>
                <div className="mock-msg mock-msg-in">No ads? No data selling? 😮</div>
                <div className="mock-msg mock-msg-out">Never. That's our promise. 🛡️ <div className="mock-ticks">✓✓</div></div>
                <div className="mock-typing"><span></span><span></span><span></span></div>
              </div>
              <div className="mock-input">
                <div className="mock-input-field">Type a message...</div>
                <div className="mock-send"><Zap size={14} /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section className="features-section" id="features">
        <div className="section-container">
          <div className="section-header">
            <div className="section-tag">Features</div>
            <h2 className="section-title">Everything You Asked For</h2>
            <p className="section-subtitle">Built directly from 31 real user survey responses.</p>
          </div>
          <div className="features-grid">
            {/* Map turns the features array into FeatureCard components */}
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PRIVACY SECTION ── */}
      <section className="privacy-section-landing" id="privacy">
        <div className="section-container">
          <div className="privacy-inner">
            <div className="privacy-left">
              <div className="section-tag">Our Promise</div>
              <h2 className="section-title">Privacy Is the Foundation.</h2>
              <p className="privacy-desc">
                Every decision we made started with one question:
                <em> "Is this private enough?"</em>
              </p>
              <ul className="privacy-list">
                {[
                  ['No third-party data sharing', 'We never sell or share your data with advertisers or governments.'],
                  ['Messages never stored long-term', 'Once delivered, messages are not retained. Nothing to steal.'],
                  ['No activity tracking', 'We don\'t log who you talk to, when, or how often.'],
                ].map(([title, desc]) => (
                  <li key={title} className="privacy-item">
                    <div className="privacy-check"><ShieldCheck size={14} /></div>
                    <div>
                      <strong>{title}</strong>
                      <p>{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="privacy-right">
              <div className="encryption-demo">
                <div className="enc-label">How Encryption Works</div>
                <div className="enc-step">📝 You type: <em>"Meet at 5pm"</em></div>
                <div className="enc-arrow">↓</div>
                <div className="enc-step enc-locked">🔒 Encrypted: <em className="enc-gibberish">Xk9#mP2!qR$vL</em></div>
                <div className="enc-arrow">↓</div>
                <div className="enc-step">☁️ Travels as gibberish — unreadable</div>
                <div className="enc-arrow">↓</div>
                <div className="enc-step enc-unlocked">🔓 Recipient decrypts: <em>"Meet at 5pm"</em></div>
                <div className="enc-note">Only the recipient has the key 🔑</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SURVEY QUOTES ── */}
      <section className="why-section" id="why">
        <div className="section-container">
          <div className="section-header">
            <div className="section-tag">Real Feedback</div>
            <h2 className="section-title">What People Actually Want</h2>
            <p className="section-subtitle">These are real responses from our 31-person survey.</p>
          </div>
          <div className="quotes-grid">
            {quotes.map((q) => <QuoteCard key={q.name + q.text.slice(0,10)} {...q} />)}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="cta-section-landing">
        <div className="section-container">
          <div className="cta-card animate-glow">
            <div className="cta-blob"></div>
            <div className="cta-content">
              <div className="cta-icon"><ShieldCheck size={30} /></div>
              <h2 className="cta-title">Ready to Chat Privately?</h2>
              <p className="cta-subtitle">No phone number. No ads. No compromise.</p>
              <div className="cta-actions">
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/auth?mode=register')}>
                  <UserPlus size={18} /> Create Free Account
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => navigate('/auth?mode=login')}>
                  Already have an account? Log in
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer-landing">
        <div className="logo-icon" style={{width:28,height:28}}><ShieldCheck size={16}/></div>
        <span className="logo-text">Safe<span className="text-accent">Talk</span></span>
        <p>Privacy-first messaging for everyone. © 2026 SafeTalk.</p>
      </footer>

    </div>
  );
}

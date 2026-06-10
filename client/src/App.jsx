/*
  App.jsx — The MAIN React Component
  
  In React, everything is a "component" — a reusable piece of UI.
  App.jsx is the ROOT component — it contains all other components.
  
  It also handles ROUTING — deciding which page to show:
  - "/" → Landing page
  - "/auth" → Login/Register page
  - "/app" → Chat application
*/
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import ChatApp from './pages/ChatApp';
import './index.css';
import './App.css';

// Helper: check if user is logged in
// (looks in browser's localStorage for saved session)
const isLoggedIn = () => !!localStorage.getItem('safetalk_user');

function App() {
  return (
    // BrowserRouter — enables navigation between pages without full reloads
    <BrowserRouter>
      <Routes>
        {/* Route = "if the URL is X, show component Y" */}
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        
        {/* Protected route — redirect to /auth if not logged in */}
        <Route
          path="/app"
          element={isLoggedIn() ? <ChatApp /> : <Navigate to="/auth" replace />}
        />
        
        {/* Catch-all — redirect unknown URLs to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

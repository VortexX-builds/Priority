import React, { useState } from 'react';
import SmartQueue from './components/SmartQueue';
import PulseDashboard from './components/PulseDashboard';
import Preloader from './components/Preloader';
import logo from './assets/Priority Logo.png';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('queue');
  const [ready, setReady] = useState(false);

  return (
    <>
      {!ready && <Preloader onDone={() => setReady(true)} />}
      <div className={`app-shell${ready ? ' app-ready' : ' app-loading'}`}>
        <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="Priority" className="sidebar-logo-img" />
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-name">Priority</span>
            <span className="sidebar-logo-sub">Task Manager</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            <span className="sidebar-nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </span>
            <span className="sidebar-nav-label">Smart Queue</span>
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="sidebar-nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
            </span>
            <span className="sidebar-nav-label">Pulse Dashboard</span>
          </button>
        </nav>

        </aside>

        <div className="content-area">
          {activeTab === 'queue' ? <SmartQueue /> : <PulseDashboard />}
        </div>
      </div>
    </>
  );
}

export default App;

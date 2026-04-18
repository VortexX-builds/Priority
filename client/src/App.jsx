import React, { useState } from 'react';
import SmartQueue from './components/SmartQueue';
import PulseDashboard from './components/PulseDashboard';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('queue');

  return (
    <div className="app-container">
      <header>
        <div className="logo">
          <h1>Priority</h1>
          <p>Dynamic Multi-Factor Task Scoring Engine</p>
        </div>

        <nav>
          <button
            id="nav-queue"
            className={`nav-btn ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            Smart Queue
          </button>
          <button
            id="nav-dashboard"
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Pulse Dashboard
          </button>
        </nav>
      </header>

      <main>
        {activeTab === 'queue' ? <SmartQueue /> : <PulseDashboard />}
      </main>
    </div>
  );
}

export default App;

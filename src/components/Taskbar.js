import React, { useState } from 'react';
import StartMenu from './StartMenu';
import WalletConnection from './WalletConnection';

function Taskbar({ openWindows, openWindow, restoreWindow }) {
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleStartClick = () => {
    setIsStartMenuOpen(!isStartMenuOpen);
  };

  const handleSelectMenuItem = (id, title, icon) => {
    openWindow({ id, title, icon });
    setIsStartMenuOpen(false);
  };

  const handleTaskbarItemClick = (id) => {
    const window = openWindows.find(w => w.id === id);
    if (window.isMinimized) {
      restoreWindow(id);
    } else {
      openWindow({ id, title: window.title });
    }
  };

  return (
    <div className="taskbar">
      <button className="start-button" onClick={handleStartClick}>
        <img src="/icons/start.png" alt="Start" className="start-icon" />
        Start
      </button>
      {isStartMenuOpen && <StartMenu onSelectMenuItem={handleSelectMenuItem} />}
      <div className="open-windows">
        {openWindows.map(window => (
          <button 
            key={window.id} 
            className={`taskbar-item ${window.isMinimized ? '' : 'active'}`}
            onClick={() => handleTaskbarItemClick(window.id)}
          >
            {window.icon && <img src={window.icon} alt="icon" className="taskbar-icon" />}
            {window.title}
          </button>
        ))}
      </div>
      <div className="taskbar-right">
        <WalletConnection />
        <div className="clock">{currentTime}</div>
      </div>
    </div>
  );
}

export default Taskbar;
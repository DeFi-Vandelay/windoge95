import React, { useState } from 'react';
import Taskbar from './Taskbar';
import Window from './Window';
import AlertWindow from './AlertWindow';
import GameExplorer from './GameExplorer';
import GameListingForm from './GameListingForm';
import DAOVoting from './DAOVoting';
import { gameCategories } from './GameCategories';
import GameWindow from './GameWindow';
import DesktopIcons from './DesktopIcons';

function Desktop({ setCurrentGame, showLoading, hideLoading }) {
  const [openWindows, setOpenWindows] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [alertWindow, setAlertWindow] = useState(null);

  const openWindow = (windowProps) => {
    const newWindow = { ...windowProps, isMinimized: false, isMaximized: false };
    
    // Set content based on window type
    switch (newWindow.id) {
      case 'games':
      case 'action':
      case 'strategy':
      case 'rpg':
        newWindow.content = (
          <GameExplorer
            initialSelectedCategory={newWindow.id === 'games' ? 'all' : newWindow.id}
            onSelectCategory={(id, label) => {
              setSelectedCategory(id);
              const updatedWindow = { ...newWindow, title: `${label}` };
              setOpenWindows(prev => prev.map(w => w.id === 'games' ? updatedWindow : w));
            }}
            openWindow={openWindow}
            showLoading={showLoading}
            hideLoading={hideLoading}
          />
        );
        newWindow.id = 'games'; // Ensure all game explorer windows use the same ID
        break;
      case 'list-game':
        newWindow.content = <GameListingForm onShowAlert={showAlert} showLoading={showLoading} hideLoading={hideLoading} />;
        break;
      case 'dao':
        newWindow.content = <DAOVoting onShowAlert={showAlert} showLoading={showLoading} hideLoading={hideLoading} />;
        break;
      case 'about':
        newWindow.content = (
          <div className="notepad">
            <p><strong>Much nostalgia, such innovation! </strong></p>
            <p>Welcome to Windoge95 ($WIN95), where the iconic Windows 95 vibes meet the playful spirit of Doge. We bring you a web-based decentralized app that feels like a retro throwback but runs on cutting-edge blockchain magic. Hold $WIN95 tokens to unlock our pawsome platform, vote on cool games, and be part of our DAO-tastic community. Together, we decide the future—more features, more fun, more wow! Dust off your floppy disks and join us!</p>
            <p><strong>Such community. Much wow.</strong></p>
            <p><strong>Very Windoge95!</strong></p>
          </div>
        );
        break;
      default:
        break;
    }

    const existingWindowIndex = openWindows.findIndex(w => w.id === newWindow.id);
    if (existingWindowIndex !== -1) {
      // If the window is already open, bring it to the front and unminimize it
      const updatedWindows = [...openWindows];
      updatedWindows[existingWindowIndex] = { ...updatedWindows[existingWindowIndex], isMinimized: false };
      updatedWindows.push(updatedWindows.splice(existingWindowIndex, 1)[0]);
      setOpenWindows(updatedWindows);
    } else {
      setOpenWindows([...openWindows, newWindow]);
    }
  };

  const closeWindow = (id) => {
    setOpenWindows(openWindows.filter(window => window.id !== id));
  };

  const minimizeWindow = (id) => {
    setOpenWindows(openWindows.map(window => 
      window.id === id ? { ...window, isMinimized: true } : window
    ));
  };

  const maximizeWindow = (id) => {
    setOpenWindows(openWindows.map(window => 
      window.id === id ? { ...window, isMaximized: !window.isMaximized } : window
    ));
  };

  const focusWindow = (id) => {
    const windowIndex = openWindows.findIndex(w => w.id === id);
    if (windowIndex !== -1 && windowIndex !== openWindows.length - 1) {
      const updatedWindows = [...openWindows];
      const [focusedWindow] = updatedWindows.splice(windowIndex, 1);
      updatedWindows.push(focusedWindow);
      setOpenWindows(updatedWindows);
    }
  };

  const restoreWindow = (id) => {
    setOpenWindows(openWindows.map(window => 
      window.id === id ? { ...window, isMinimized: false } : window
    ));
    focusWindow(id);
  };

  const showAlert = (title, message) => {
    setAlertWindow({ title, message });
  };

  const closeAlert = () => {
    setAlertWindow(null);
  };

  const handleGameSelect = (gameUrl) => {
    setCurrentGame(gameUrl);
  };

  return (
    <div className="desktop">
      <DesktopIcons openWindow={openWindow} />
      {openWindows.map((window, index) => (
        <Window
          key={window.id}
          {...window}
          onClose={closeWindow}
          onMinimize={minimizeWindow}
          onMaximize={maximizeWindow}
          onFocus={focusWindow}
          zIndex={100 + index}
          showLoading={showLoading}
          hideLoading={hideLoading}
        />
      ))}
      {alertWindow && (
        <AlertWindow
          title={alertWindow.title}
          message={alertWindow.message}
          onClose={closeAlert}
        />
      )}
      <Taskbar 
        openWindows={openWindows} 
        openWindow={openWindow} 
        restoreWindow={restoreWindow}
        showLoading={showLoading}
        hideLoading={hideLoading}
      />
    </div>
  );
}

export default Desktop;
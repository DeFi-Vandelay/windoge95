import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable';

function Window({ id, title, content, onClose, onMinimize, onFocus, zIndex, isMinimized, isMaximized, onMaximize, icon }) {
  const [prevSize, setPrevSize] = useState({ width: '50%', height: '50%' });
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isMaximized) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isMaximized]);

  const windowStyle = {
    zIndex,
    position: 'absolute',
    display: isMinimized ? 'none' : 'block',
    ...(isMaximized
      ? { top: '0', left: '0', right: '0', bottom: '30px', width: '100%', height: 'calc(100% - 30px)' }
      : { ...prevSize, transform: `translate(${position.x}px, ${position.y}px)` }),
  };

  const handleMaximize = () => {
    if (!isMaximized) {
      setPrevSize({ width: windowStyle.width, height: windowStyle.height });
    }
    onMaximize(id);
  };

  const handleDrag = (e, ui) => {
    if (!isMaximized) {
      setPosition({ x: ui.x, y: Math.max(ui.y, 0) });
    }
  };

  return (
    <Draggable
      handle=".title-bar"
      bounds="parent"
      position={position}
      onDrag={handleDrag}
      disabled={isMaximized}
      onMouseDown={() => onFocus(id)}
    >
      <div className={`window ${isMaximized ? 'maximized' : ''}`} style={windowStyle}>
        <div className="title-bar">
          <div className="title">
            {icon && <img src={icon} alt="icon" className="window-icon" />}
            {title}
          </div>
          <div className="window-controls">
            <button className="minimize-button" onClick={() => onMinimize(id)}>_</button>
            <button className="maximize-button" onClick={handleMaximize}>{isMaximized ? '❐' : '□'}</button>
            <button className="close-button" onClick={() => onClose(id)}>X</button>
          </div>
        </div>
        <div className="window-content">
          {content}
        </div>
      </div>
    </Draggable>
  );
}

export default Window;
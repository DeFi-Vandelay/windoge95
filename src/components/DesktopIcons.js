import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable';

const icons = [
  { id: 'x', label: 'X', icon: 'x.png', action: 'url', url: 'https://x.com/windoge95_eth' },
  { id: 'telegram', label: 'Telegram', icon: 'telegram.png', action: 'url', url: 'https://t.me/windoge95_eth' },
  { id: 'games', label: 'Games', icon: 'games.png', action: 'window', windowProps: { id: 'games', title: 'All Games' } },
];

function DesktopIcon({ icon, label, onDoubleClick }) {
  return (
    <div className="desktop-icon" onDoubleClick={onDoubleClick}>
      <img src={`/icons/${icon}`} alt={label} />
      <span>{label}</span>
    </div>
  );
}

function DesktopIcons({ openWindow }) {
  const [positions, setPositions] = useState({});
  const [dragState, setDragState] = useState({ isDragging: false, currentIcon: null });

  useEffect(() => {
    const initialPositions = {};
    icons.forEach((icon, index) => {
      initialPositions[icon.id] = { x: 20, y: 20 + index * 80 };
    });
    setPositions(initialPositions);
    console.log('Initial positions set:', initialPositions);
  }, []);

  const handleDragStart = (id) => {
    console.log('Drag started for icon:', id);
    setDragState({ isDragging: true, currentIcon: id });
  };

  const handleDrag = (id, e, data) => {
    console.log('Dragging icon:', id, 'New position:', data);
    setPositions(prev => {
      const newPositions = { ...prev, [id]: { x: data.x, y: data.y } };
      console.log('Updated positions:', newPositions);
      return newPositions;
    });
  };

  const handleDragStop = (id, e, data) => {
    console.log('Drag stopped for icon:', id, 'Final position:', data);
    setPositions(prev => {
      const newPositions = { ...prev, [id]: { x: data.x, y: data.y } };
      console.log('Final positions:', newPositions);
      return newPositions;
    });
    setDragState({ isDragging: false, currentIcon: null });
  };

  const handleDoubleClick = (icon) => {
    console.log('Double click on icon:', icon.id);
    if (icon.action === 'url') {
      window.open(icon.url, '_blank');
    } else if (icon.action === 'window') {
      openWindow({ ...icon.windowProps, icon: `/icons/${icon.icon}` });
    }
  };

  return (
    <div className="desktop-icons">
      {icons.map((icon) => (
        <Draggable
          key={icon.id}
          bounds="parent"
          position={positions[icon.id] || { x: 0, y: 0 }}
          onStart={() => handleDragStart(icon.id)}
          onDrag={(e, data) => handleDrag(icon.id, e, data)}
          onStop={(e, data) => handleDragStop(icon.id, e, data)}
        >
          <div style={{ position: 'absolute' }}>
            <DesktopIcon
              icon={icon.icon}
              label={icon.label}
              onDoubleClick={() => handleDoubleClick(icon)}
            />
          </div>
        </Draggable>
      ))}
    </div>
  );
}

export default DesktopIcons;
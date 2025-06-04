import React from 'react';

function AlertWindow({ title, message, onClose }) {
  return (
    <div className="alert-window">
      <div className="title-bar">
        <div className="title">{title}</div>
        <button className="close-button" onClick={onClose}>X</button>
      </div>
      <div className="window-content">
        <p>{message}</p>
        <button onClick={onClose}>OK</button>
      </div>
    </div>
  );
}

export default AlertWindow;
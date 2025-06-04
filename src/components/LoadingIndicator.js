import React from 'react';

function LoadingIndicator({ message }) {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <p>{message || 'Loading...'}</p>
      </div>
    </div>
  );
}

export default LoadingIndicator;
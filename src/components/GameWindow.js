import React from 'react';

function GameWindow({ gameUrl }) {
  return (
    <div className="game-window">
      <iframe
        src={gameUrl}
        title="Game Content"
        width="100%"
        height="100%"
        frameBorder="0"
        allowFullScreen
      />
    </div>
  );
}

export default GameWindow;
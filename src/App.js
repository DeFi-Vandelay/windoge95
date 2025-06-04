import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/windows95.css';
import Desktop from './components/Desktop';
import GameWindow from './components/GameWindow';
import LoadingIndicator from './components/LoadingIndicator';

function App() {
  const [currentGame, setCurrentGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const showLoading = (message) => {
    setLoading(true);
    setLoadingMessage(message);
  };

  const hideLoading = () => {
    setLoading(false);
    setLoadingMessage('');
  };

  return (
    <div className="App">
      <Desktop setCurrentGame={setCurrentGame} showLoading={showLoading} hideLoading={hideLoading} />
      {currentGame && <GameWindow gameUrl={currentGame} />}
      {loading && <LoadingIndicator message={loadingMessage} />}
    </div>
  );
}

export default App;
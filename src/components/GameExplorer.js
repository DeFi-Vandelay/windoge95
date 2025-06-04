import React, { useState, useEffect, useCallback } from 'react';
import { BrowserProvider } from 'ethers';
import { getAllGames } from '../contractInteraction';
import { gameCategories } from './GameCategories';
import GameWindow from './GameWindow';
import { openWindow } from './Desktop';

function GameExplorer({ initialSelectedCategory, onSelectCategory, openWindow, showLoading, hideLoading }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('icons'); // 'icons' or 'list'
  const [selectedCategory, setSelectedCategory] = useState(initialSelectedCategory);

  const loadApprovedGames = useCallback(async () => {
    console.log('loadApprovedGames called');
    try {
      showLoading('Loading games...');
      const provider = new BrowserProvider(window.ethereum);
      const allGames = await getAllGames(provider);
      console.log('All games:', allGames); // Log all games before filtering

      const approvedGames = allGames.filter(game => game.approved && (selectedCategory === 'all' || game.category === selectedCategory));
      console.log('Approved games:', approvedGames);
      setGames(approvedGames);
      setLoading(false);
    } catch (error) {
      console.error('Error loading games:', error);
      setLoading(false);
    } finally {
      hideLoading();
    }
  }, [selectedCategory]);

  useEffect(() => {
    console.log('useEffect triggered');
    loadApprovedGames();
  }, [loadApprovedGames]);

  const handleCategoryClick = (category) => {
    onSelectCategory(category.id, category.label);
    setSelectedCategory(category.id);
  };

  const handleGameClick = (game) => {
    openWindow({
      id: `game-${game.id}`,
      title: game.title,
      icon: game.imageUrl,
      content: <GameWindow gameUrl={game.gameUrl} />,
    });
  };

  if (loading) {
    return <div>Loading games...</div>;
  }

  console.log('Rendering games:', games); // Log games being rendered

  return (
    <div className="game-explorer">
      <div className="explorer-toolbar">
        <button onClick={() => setViewMode('icons')} className={viewMode === 'icons' ? 'active' : ''}>
          <img src="/icons/icon-view.png" alt="Large Icons" />
        </button>
        <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'active' : ''}>
          <img src="/icons/list-view.png" alt="List" />
        </button>
      </div>
      <div className="explorer-content">
        <div className="explorer-tree">
          <div
            className={`tree-item ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => handleCategoryClick({ id: 'all', label: 'All Games', icon: 'games.png' })}
          >
            <img src="/icons/games.png" alt="Folder" className="folder-icon" />
            All Games
          </div>
          {gameCategories.map(category => (
            <div
              key={category.id}
              className={`tree-item ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => handleCategoryClick(category)}
            >
              <img src={`/icons/${category.icon}`} alt={category.label} className="folder-icon" />
              {category.label}
            </div>
          ))}
        </div>
        <div className={`explorer-files ${viewMode}`}>
          {games.length === 0 ? (
            <div>No games found</div>
          ) : (
            games.map((game) => (
              <div
                key={game.id}
                className="game-item"
                onClick={() => handleGameClick(game)}
              >
                <img src={game.imageUrl} alt={game.title} className="game-icon" />
                <span className="game-name">{game.title}</span>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="explorer-statusbar">
        {games.length} item{games.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

export default GameExplorer;
import React from 'react';
import { gameCategories } from './GameCategories';

function StartMenu({ onSelectMenuItem }) {
  const otherMenuItems = [
    { id: 'games', label: 'All Games', icon: 'games.png' },
    { id: 'list-game', label: 'List Your Game', icon: 'list-game.png' },
    { id: 'dao', label: 'DAO Management', icon: 'dao.png' },
    { id: 'about', label: 'About', icon: 'about.png' },
  ];

  return (
    <div className="start-menu">
      <div className="start-menu-stripe">Windoge95</div>
      <div className="start-menu-items">
        {gameCategories.map(category => (
          <button
            key={category.id}
            className="start-menu-item"
            onClick={() => onSelectMenuItem(category.id, category.label, `/icons/${category.icon}`)}
          >
            <img src={`/icons/${category.icon}`} alt={category.label} className="start-menu-icon" />
            <span>{category.label}</span>
          </button>
        ))}
        {otherMenuItems.map(item => (
          <button
            key={item.id}
            className="start-menu-item"
            onClick={() => onSelectMenuItem(item.id, item.label, `/icons/${item.icon}`)}
          >
            <img src={`/icons/${item.icon}`} alt={item.label} className="start-menu-icon" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default StartMenu;
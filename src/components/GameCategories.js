import React from 'react';

export const gameCategories = [
  { id: 'action', label: 'Action Games', icon: 'games.png' },
  { id: 'strategy', label: 'Strategy Games', icon: 'games.png' },
  { id: 'rpg', label: 'RPG Games', icon: 'games.png' },
];

function GameCategories({ onSelectCategory }) {
  return (
    <div className="game-categories">
      {gameCategories.map(category => (
        <button
          key={category.id}
          className="category-item"
          onClick={() => onSelectCategory(category.id, category.label)}
        >
          <img src={`/icons/${category.icon}`} alt={category.label} className="category-icon" />
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );
}

export default GameCategories;
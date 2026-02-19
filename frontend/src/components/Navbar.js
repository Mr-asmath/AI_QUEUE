import React from 'react';

function Navbar({ user, onLogout }) {
  const getRoleIcon = () => {
    switch(user.role) {
      case 'admin': return '👑';
      case 'doctor': return '⚕️';
      default: return '👤';
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <span className="brand-icon">🎫</span>
        <span className="brand-name">Smart Queue</span>
      </div>
      
      <div className="nav-user">
        <span className="user-role">{getRoleIcon()} {user.role}</span>
        <span className="user-name">{user.name}</span>
        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaTicketAlt, FaHistory, FaSignOutAlt, FaUser, FaTachometerAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import axios from 'axios';

const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <FaTicketAlt className="text-primary-600 text-2xl" />
            <span className="font-bold text-xl text-gray-800">SmartQueue AI</span>
          </Link>

          <div className="flex items-center space-x-4">
            <Link to="/" className="text-gray-600 hover:text-primary-600 transition">
              Queue Status
            </Link>

            {user ? (
              <>
                <Link to="/dashboard" className="flex items-center space-x-1 text-gray-600 hover:text-primary-600 transition">
                  <FaTachometerAlt />
                  <span>Dashboard</span>
                </Link>

                {user.role === 'user' && (
                  <Link to="/generate-token" className="btn-primary">
                    Get Token
                  </Link>
                )}

                {user.role === 'admin' && (
                  <Link to="/history" className="flex items-center space-x-1 text-gray-600 hover:text-primary-600 transition">
                    <FaHistory />
                    <span>History</span>
                  </Link>
                )}

                <div className="flex items-center space-x-2 ml-4">
                  <div className="flex items-center space-x-1">
                    <FaUser className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{user.name}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-700 transition ml-2"
                  >
                    <FaSignOutAlt />
                    <span className="hidden md:inline">Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login" className="btn-secondary">
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
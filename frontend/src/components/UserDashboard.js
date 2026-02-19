import React, { useState, useEffect } from 'react';

function UserDashboard({ user, onLogout }) {
  const [queueStatus, setQueueStatus] = useState(null);
  const [myTokens, setMyTokens] = useState([]);
  const [mySuggestions, setMySuggestions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('queue');
  const [showNotification, setShowNotification] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is still authenticated
    checkAuth();
    
    fetchQueueStatus();
    fetchMyTokens();
    fetchMySuggestions();
    fetchNotifications();
    
    // Poll for updates
    const interval = setInterval(() => {
      fetchQueueStatus();
      fetchNotifications();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/me', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (!data.success) {
        // Session expired or invalid
        alert('Your session has expired. Please login again.');
        onLogout();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const fetchQueueStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/queue/status', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setQueueStatus(data);
      }
    } catch (error) {
      console.error('Error fetching queue status:', error);
    }
  };

  const fetchMyTokens = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/user/my-tokens', {
        credentials: 'include'
      });
      
      if (response.status === 401) {
        // Unauthorized - session expired
        alert('Your session has expired. Please login again.');
        onLogout();
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setMyTokens(data.tokens);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
    }
  };

  const fetchMySuggestions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/user/my-suggestions', {
        credentials: 'include'
      });
      
      if (response.status === 401) {
        onLogout();
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setMySuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/user/notifications', {
        credentials: 'include'
      });
      
      if (response.status === 401) {
        onLogout();
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
        // Show notification popup for new unread notifications
        const unread = data.notifications.filter(n => !n.is_read);
        if (unread.length > 0) {
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 5000);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/user/notifications/mark-read/${notificationId}`, {
        method: 'PUT',
        credentials: 'include'
      });
      
      if (response.status === 401) {
        onLogout();
        return;
      }
      
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const generateToken = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Generating token for user:', user); // Debug log
      
      const response = await fetch('http://localhost:5000/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({})
      });
      
      console.log('Response status:', response.status); // Debug log
      
      if (response.status === 401) {
        setError('Your session has expired. Please login again.');
        setTimeout(() => {
          onLogout();
        }, 2000);
        return;
      }
      
      const data = await response.json();
      console.log('Response data:', data); // Debug log
      
      if (data.success) {
        alert(`✅ Token #${data.token} generated successfully!`);
        fetchMyTokens();
        fetchQueueStatus();
      } else {
        setError(data.error || 'Error generating token');
      }
    } catch (error) {
      console.error('Error in generateToken:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'waiting': 'badge-warning',
      'with_doctor': 'badge-info',
      'called': 'badge-primary',
      'completed': 'badge-success',
      'cancelled': 'badge-danger'
    };
    return <span className={`badge ${statusClasses[status] || 'badge-secondary'}`}>{status}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="dashboard user-dashboard">
      {showNotification && notifications.filter(n => !n.is_read).length > 0 && (
        <div className="notification-popup">
          <h4>🔔 New Notifications</h4>
          {notifications.filter(n => !n.is_read).slice(0, 3).map(notif => (
            <div key={notif.id} className="notification-item">
              <p>{notif.message}</p>
              <small>{notif.created_at}</small>
            </div>
          ))}
          <button onClick={() => setShowNotification(false)}>Close</button>
        </div>
      )}

      <div className="dashboard-header">
        <div>
          <h1>Welcome, {user.name}!</h1>
          <p className="user-email">{user.email} ({user.role})</p>
        </div>
        <button 
          className="generate-token-btn"
          onClick={generateToken}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Get New Token 🎫'}
        </button>
      </div>

      {error && (
        <div className="error-message" style={{marginBottom: '20px'}}>
          {error}
        </div>
      )}

      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'queue' ? 'active' : ''}
          onClick={() => setActiveTab('queue')}
        >
          Queue Status
        </button>
        <button 
          className={activeTab === 'tokens' ? 'active' : ''}
          onClick={() => setActiveTab('tokens')}
        >
          My Tokens
        </button>
        <button 
          className={activeTab === 'suggestions' ? 'active' : ''}
          onClick={() => setActiveTab('suggestions')}
        >
          My Suggestions
        </button>
        <button 
          className={activeTab === 'notifications' ? 'active' : ''}
          onClick={() => setActiveTab('notifications')}
        >
          Notifications 
          {notifications.filter(n => !n.is_read).length > 0 && (
            <span className="notification-badge">
              {notifications.filter(n => !n.is_read).length}
            </span>
          )}
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'queue' && queueStatus && (
          <div className="queue-status-panel">
            <div className="current-token-large">
              <h3>Now Serving</h3>
              <div className="token-number">#{queueStatus.current_token || '---'}</div>
              {queueStatus.current_token_data && (
                <p className="current-user">
                  {queueStatus.current_token_data.user_name}
                </p>
              )}
            </div>

            <div className="queue-stats">
              <div className="stat-card">
                <label>Waiting</label>
                <span className="stat-value">{queueStatus.waiting_count}</span>
              </div>
              <div className="stat-card">
                <label>Est. Time</label>
                <span className="stat-value">{queueStatus.estimated_waiting_time} min</span>
              </div>
              <div className="stat-card">
                <label>Last Token</label>
                <span className="stat-value">#{queueStatus.last_token}</span>
              </div>
            </div>

            <div className="next-tokens">
              <h4>Next in Queue:</h4>
              <div className="token-list">
                {queueStatus.next_tokens && queueStatus.next_tokens.length > 0 ? (
                  queueStatus.next_tokens.map((token, index) => (
                    <div key={index} className="token-item">
                      <span className="token-position">#{token.token_number}</span>
                      <span className="token-user">{token.user_name}</span>
                    </div>
                  ))
                ) : (
                  <p className="no-data">No tokens in queue</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="tokens-panel">
            <h3>My Tokens</h3>
            {myTokens.length > 0 ? (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Token #</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th>Called At</th>
                      <th>Completed At</th>
                      <th>Doctor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myTokens.map(token => (
                      <tr key={token.token_id}>
                        <td>
                          <span className="token-number-cell">#{token.token_number}</span>
                        </td>
                        <td>
                          {getStatusBadge(token.status)}
                        </td>
                        <td>{formatDate(token.created_at)}</td>
                        <td>{formatDate(token.called_at)}</td>
                        <td>{formatDate(token.completed_at)}</td>
                        <td>{token.doctor_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-data">No tokens found. Click "Get New Token" to generate one.</p>
            )}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="suggestions-panel">
            <h3>Doctor's Suggestions</h3>
            {mySuggestions.length > 0 ? (
              <div className="suggestions-table-container">
                {mySuggestions.map(suggestion => (
                  <div key={suggestion.id} className="suggestion-card">
                    <div className="suggestion-header">
                      <h4>Token #{suggestion.token_number}</h4>
                      <span className="doctor-name">Dr. {suggestion.doctor_name}</span>
                      <span className="suggestion-date">{formatDate(suggestion.created_at)}</span>
                    </div>
                    
                    <div className="suggestion-content">
                      <p><strong>Recommendation:</strong> {suggestion.suggestion_text}</p>
                      
                      {suggestion.medicines && suggestion.medicines.length > 0 && (
                        <div className="medicines-section">
                          <h5>Prescribed Medicines:</h5>
                          <table className="medicines-table">
                            <thead>
                              <tr>
                                <th>Medicine Name</th>
                              </tr>
                            </thead>
                            <tbody>
                              {suggestion.medicines.map((medicine, idx) => (
                                <tr key={idx}>
                                  <td>{medicine}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {suggestion.notes && (
                        <div className="notes-section">
                          <h5>Additional Notes:</h5>
                          <p>{suggestion.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No suggestions found</p>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="notifications-panel">
            <h3>Notifications</h3>
            <div className="notifications-list">
              {notifications.length > 0 ? (
                notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`notification-card ${!notification.is_read ? 'unread' : ''}`}
                    onClick={() => markNotificationRead(notification.id)}
                  >
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">{formatDate(notification.created_at)}</div>
                    {!notification.is_read && <span className="unread-dot">●</span>}
                  </div>
                ))
              ) : (
                <p className="no-data">No notifications</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserDashboard;

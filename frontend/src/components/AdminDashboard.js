import React, { useState, useEffect } from 'react';

function AdminDashboard({ user, onLogout }) {
  const [queueStatus, setQueueStatus] = useState(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueueStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/queue/status');
      const data = await response.json();
      if (data.success) {
        setQueueStatus(data);
      }
    } catch (error) {
      console.error('Error fetching queue status:', error);
    }
  };

  const callNextToken = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/admin/queue/next', {
        method: 'PUT',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Called token #${data.called_token} - ${data.user_name}`);
        fetchQueueStatus();
      } else {
        alert(data.error || 'Error calling next token');
      }
    } catch (error) {
      alert('Error calling next token');
    } finally {
      setLoading(false);
    }
  };

  const resetQueue = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/admin/queue/reset', {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Queue reset successfully! Reset ${data.reset_tokens} tokens.`);
        fetchQueueStatus();
        setShowConfirmReset(false);
      } else {
        alert(data.error || 'Error resetting queue');
      }
    } catch (error) {
      alert('Error resetting queue');
    } finally {
      setLoading(false);
    }
  };

  if (!queueStatus) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <div className="stats-summary">
          <span className="stat">Current: #{queueStatus.current_token || 'None'}</span>
          <span className="stat">Waiting: {queueStatus.waiting_count}</span>
          <span className="stat">With Doctor: {queueStatus.with_doctor_count || 0}</span>
        </div>
      </div>

      <div className="admin-controls">
        <div className="control-panel">
          <h2>Queue Controls</h2>
          
          <div className="current-token-display">
            <h3>Now Serving</h3>
            <div className="token-large">#{queueStatus.current_token || '---'}</div>
            {queueStatus.current_token_data && (
              <p className="current-user">{queueStatus.current_token_data.user_name}</p>
            )}
          </div>

          <div className="action-buttons">
            <button 
              className="call-next-btn"
              onClick={callNextToken}
              disabled={loading || queueStatus.waiting_count === 0}
            >
              {loading ? 'Processing...' : 'Call Next Token ➡️'}
            </button>

            {!showConfirmReset ? (
              <button 
                className="reset-queue-btn"
                onClick={() => setShowConfirmReset(true)}
                disabled={loading}
              >
                Reset Queue 🔄
              </button>
            ) : (
              <div className="confirm-reset">
                <p>Are you sure you want to reset the entire queue?</p>
                <div className="confirm-actions">
                  <button 
                    className="confirm-yes"
                    onClick={resetQueue}
                    disabled={loading}
                  >
                    Yes, Reset
                  </button>
                  <button 
                    className="confirm-no"
                    onClick={() => setShowConfirmReset(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="queue-info-panel">
          <h3>Next in Queue</h3>
          <div className="next-tokens-list">
            {queueStatus.next_tokens && queueStatus.next_tokens.length > 0 ? (
              queueStatus.next_tokens.map((token, index) => (
                <div key={index} className="next-token-item">
                  <span className="token-position">#{token.token_number}</span>
                  <span className="token-user">{token.user_name}</span>
                  <span className="token-time">{token.created_at}</span>
                </div>
              ))
            ) : (
              <p className="no-tokens">No tokens in queue</p>
            )}
          </div>
        </div>
      </div>

      <div className="queue-stats-detailed">
        <h3>Queue Statistics</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <label>Total Tokens Today</label>
            <span className="stat-value">{queueStatus.last_token}</span>
          </div>
          <div className="stat-card">
            <label>Waiting</label>
            <span className="stat-value">{queueStatus.waiting_count}</span>
          </div>
          <div className="stat-card">
            <label>With Doctor</label>
            <span className="stat-value">{queueStatus.with_doctor_count || 0}</span>
          </div>
          <div className="stat-card">
            <label>Est. Wait Time</label>
            <span className="stat-value">{queueStatus.estimated_waiting_time} min</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
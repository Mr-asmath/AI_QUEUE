import React from 'react';

function QueueDisplay({ queueStatus }) {
  return (
    <div className="queue-display">
      <div className="current-token-card">
        <h3>Now Serving</h3>
        <div className="token-display">
          #{queueStatus.current_token || '---'}
        </div>
      </div>
      
      <div className="queue-info">
        <div className="info-card">
          <span className="info-label">Waiting:</span>
          <span className="info-value">{queueStatus.waiting_count}</span>
        </div>
        <div className="info-card">
          <span className="info-label">Est. Time:</span>
          <span className="info-value">{queueStatus.estimated_waiting_time} min</span>
        </div>
        <div className="info-card">
          <span className="info-label">Last Token:</span>
          <span className="info-value">#{queueStatus.last_token}</span>
        </div>
      </div>
      
      {queueStatus.next_tokens.length > 0 && (
        <div className="next-tokens-preview">
          <h4>Next 5 Tokens:</h4>
          <div className="token-pills">
            {queueStatus.next_tokens.map((token, index) => (
              <div key={index} className="token-pill">
                #{token.token_number}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default QueueDisplay;
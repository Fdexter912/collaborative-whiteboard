// client/src/App.jsx
import { useState } from 'react';
import WhiteboardApp from './components/WhiteboardApp';

function App() {
  const [roomId, setRoomId] = useState('');
  const [userId, setUserId] = useState('');
  const [hasJoined, setHasJoined] = useState(false);

  const handleJoin = (e) => {
    e.preventDefault();
    if (roomId.trim() && userId.trim()) {
      setHasJoined(true);
    }
  };

  if (!hasJoined) {
    return (
      <div style={styles.container}>
        <div style={styles.joinCard}>
          <h1 style={styles.title}>Collaborative Whiteboard</h1>
          <p style={styles.subtitle}>Join a room to start drawing together</p>
          
          <form onSubmit={handleJoin} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Room ID</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="e.g., my-whiteboard"
                style={styles.input}
                autoFocus
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Your Name</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g., Alice"
                style={styles.input}
              />
            </div>
            
            <button
              type="submit"
              disabled={!roomId.trim() || !userId.trim()}
              style={{
                ...styles.button,
                ...(!roomId.trim() || !userId.trim() ? styles.buttonDisabled : {})
              }}
            >
              Join Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <WhiteboardApp roomId={roomId} userId={userId} />;
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecf0f1',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  joinCard: {
    maxWidth: '400px',
    width: '100%',
    padding: '40px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: '8px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '14px',
    color: '#7f8c8d',
    marginBottom: '32px',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2c3e50',
  },
  input: {
    padding: '12px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#3498db',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
    cursor: 'not-allowed',
  },
};

export default App;
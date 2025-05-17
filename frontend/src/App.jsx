import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/login';
import Register from './pages/register';
import Dashboard from './pages/dashboard';
import SideMenu from './components/sideMenu';
import Chat from './components/Chat';
import './App.css';

function App() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  // Update user state when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const storedUser = localStorage.getItem('user');
      setUser(storedUser ? JSON.parse(storedUser) : null);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" replace />} />
        <Route 
          path="/dashboard" 
          element={
            user ? (
              <div className="app">
                <SideMenu onSelectUser={setSelectedUser} />
                <main className="mainContent">
                  <Chat selectedUser={selectedUser} />
                </main>
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;

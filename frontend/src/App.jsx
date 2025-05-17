import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login';
import Dashboard from './pages/dashboard';
import SideMenu from './components/sideMenu';
import Chat from './components/Chat';
import './App.css';

function App() {
  const [selectedUser, setSelectedUser] = useState(null);
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <div className="app">
        <SideMenu onSelectUser={setSelectedUser} />
        <main className="mainContent">
          <Chat selectedUser={selectedUser} />
        </main>
      </div>
    </Router>
  );
}

export default App;

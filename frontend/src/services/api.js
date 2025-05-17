// Use the environment variable or fallback to the production URL
const API_URL = import.meta.env.VITE_API_URL || 'https://gamechat-3-backend.onrender.com/api';

// Debug logging
console.log('Current API URL:', API_URL);
console.log('Environment variables:', import.meta.env);

const handleResponse = async (response) => {
  try {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'An error occurred');
    }
    return data;
  } catch (error) {
    console.error('Response handling error:', error);
    throw error;
  }
};

export const login = async (username, password) => {
  try {
    const url = `${API_URL}/auth/login`;
    console.log('Attempting login to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
      mode: 'cors'
    });
    
    const data = await handleResponse(response);
    
    // Store token in localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw new Error(error.message || 'Failed to connect to the server');
  }
};

export const register = async (username, email, password) => {
  try {
    const url = `${API_URL}/auth/register`;
    console.log('Registration request details:', {
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: { username, email, password: '***' }
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ username, email, password }),
      credentials: 'include',
      mode: 'cors'
    });
    
    console.log('Registration response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      url: response.url
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Registration failed:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error(errorData.message || `Registration failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await handleResponse(response);
    
    // Store token in localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw new Error(error.message || 'Failed to connect to the server');
<<<<<<< HEAD
  }
};

export const getOnlineUsers = async () => {
  try {
    const response = await fetch(`${API_URL}/auth/online-users`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    throw error;
=======
>>>>>>> c74dc5aafb1578e74ac5d7528712b380d8eea3f2
  }
};

export const updateStatus = async (status) => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    const response = await fetch(`${API_URL}/auth/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ userId: user.id, status })
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

export const logout = async () => {
  try {
    await updateStatus('offline');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch (error) {
    console.error('Error during logout:', error);
    // Still clear localStorage even if the status update fails
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}; 
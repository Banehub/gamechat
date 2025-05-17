// Use the environment variable or fallback to the production URL
const API_URL = import.meta.env.VITE_API_URL || 'https://gamechat-3-back-end.onrender.com/api';

// Debug logging
console.log('Current API URL:', API_URL);
console.log('Environment variables:', import.meta.env);

const handleResponse = async (response) => {
  try {
    // Check if the response is empty
    const text = await response.text();
    if (!text) {
      throw new Error('Empty response received from server');
    }

    // Parse the response text as JSON
    const data = JSON.parse(text);
    
    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error('Response handling error:', error);
    console.error('Response status:', response.status);
    console.error('Response headers:', Object.fromEntries(response.headers.entries()));
    throw error;
  }
};

export const login = async (username, password) => {
  try {
    const url = `${API_URL}/auth/login`;
    console.log('Login request details:', {
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: { username, password: '***' }
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include'
    });
    
    console.log('Login response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      url: response.url
    });

    const data = await handleResponse(response);
    
    // Store token in localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
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
      credentials: 'include'
    });
    
    console.log('Registration response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      url: response.url
    });

    const data = await handleResponse(response);
    
    // Store token in localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const getOnlineUsers = async () => {
  try {
    const url = `${API_URL}/auth/online-users`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const data = await handleResponse(response);
    return data;
  } catch (error) {
    console.error('Get online users error:', error);
    throw error;
  }
};

export const updateStatus = async (status) => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    const url = `${API_URL}/auth/status`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ userId: user.id, status })
    });
    
    const data = await handleResponse(response);
    return data;
  } catch (error) {
    console.error('Update status error:', error);
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
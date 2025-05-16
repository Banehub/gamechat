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
    console.log('Attempting registration to:', `${API_URL}/auth/register`);
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
      credentials: 'include',
      mode: 'cors'
    });
    
    const data = await handleResponse(response);
    
    // Store token in localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw new Error(error.message || 'Failed to connect to the server');
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}; 
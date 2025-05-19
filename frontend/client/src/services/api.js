import http from '../../http';

// Use the environment variable or fallback to the production URL
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

// Debug logging
console.log('Current API URL:', http.defaults.baseURL);
console.log('Environment variables:', import.meta.env);

const handleResponse = (response) => {
  try {
    if (!response.data) {
      throw new Error('Empty response received from server');
    }
    return response.data;
  } catch (error) {
    console.error('Response handling error:', error);
    console.error('Response status:', error.response?.status);
    console.error('Response headers:', error.response?.headers);
    throw error;
  }
};

export const login = async (username, password) => {
  try {
    const url = '/api/auth/login';
    console.log('Login request details:', {
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: { username, password: '***' }
    });
    
    const response = await http.post(url, { username, password }, {
      withCredentials: true
    });
    
    console.log('Login response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      url: response.config.url
    });

    const data = handleResponse(response);
    
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
    const url = '/api/auth/register';
    console.log('Registration request details:', {
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: { username, email, password: '***' }
    });
    
    const response = await http.post(url, { username, email, password }, {
      withCredentials: true
    });
    
    console.log('Registration response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      url: response.config.url
    });

    const data = handleResponse(response);
    
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
    const url = '/api/auth/online-users';
    const response = await http.get(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    return handleResponse(response);
  } catch (error) {
    console.error('Get online users error:', error);
    throw error;
  }
};

export const updateStatus = async (status) => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    const url = '/api/auth/status';
    const response = await http.put(url, 
      { userId: user.id, status },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    return handleResponse(response);
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
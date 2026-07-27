import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4004',
});

// Request interceptor to attach authentication & RBAC headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sap_token');
  const userId = localStorage.getItem('sap_user_id');
  const role = localStorage.getItem('sap_role');
  
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  if (userId) {
    config.headers['x-user-id'] = userId;
  }
  if (role) {
    config.headers['x-user-role'] = role;
  }
  
  return config;
});

export default api;

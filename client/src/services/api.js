import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
// Response interceptor - fix this:
api.interceptors.response.use(
  (response) => {
    // Return the full response object
    return response; // Don't just return response.data
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
// Auth API
export const registerUser = (userData) => api.post('/user/register', userData);
export const loginUser = (credentials) => api.post('/user/login', credentials);

export const getUserProfile = () => api.get('/user/profile');
export const updateUserProfile = (userData) => api.put('/user/profile', userData);

export const createExpense = (expenseData) => api.post('/expenses', expenseData);
export const getExpenses = () => api.get('/expenses');
export const getExpenseById = (id) => api.get(`/expenses/${id}`);
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);
export const getExpenseReport = () => api.get('/expenses/report');

export const uploadReceipt = (formData) =>
  api.post('/receipts', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
export const processReceipt = (receiptId) => api.post(`/receipts/${receiptId}/process`);
export const getReceipts = () => api.get('/receipts');


// auto refresh on expired token
let refreshing = null;

api.interceptors.response.use(
  r => r,
  async (error) => {
    const original = error.config;

    // If access token expired, try refresh once, then retry original request
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !original._retry
    ) {
      original._retry = true;

      refreshing = refreshing || axios.post(
        (process.env.REACT_APP_API_URL || 'http://localhost:5000/api') + '/user/refresh',
        {},
        { withCredentials: true }
      )
      .then(res => {
        if (res.data?.accessToken) {
          localStorage.setItem('token', res.data.accessToken);
          return res.data.accessToken;
        }
        throw new Error('No access token from refresh');
      })
      .finally(() => { refreshing = null; });

      const newToken = await refreshing;
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    }

    // If still unauthorized (no/invalid refresh), optionally bounce to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // window.location.href = '/login'; // uncomment if you want an auto-redirect
    }

    return Promise.reject(error);
  }
);


export default api;
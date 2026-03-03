import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Redirect to login on 401 responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// --------------- Auth ---------------
export const login = async (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
};

export const logout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
};

// --------------- Portfolios ---------------
export const getPortfolios = async () => {
    const response = await api.get('/portfolios/');
    return response.data;
};

export const getPortfolio = async (id) => {
    const response = await api.get(`/portfolios/${id}`);
    return response.data;
};

export const createPortfolio = async (portfolio) => {
    const response = await api.post('/portfolios/', portfolio);
    return response.data;
};

export const updatePortfolio = async (id, data) => {
    const response = await api.put(`/portfolios/${id}`, data);
    return response.data;
};

export const deletePortfolio = async (id) => {
    const response = await api.delete(`/portfolios/${id}`);
    return response.data;
};

export const getPortfolioPerformance = async (id, period = '2y') => {
    const response = await api.get(`/portfolios/${id}/performance?period=${period}`);
    return response.data;
};

export const checkTicker = async (ticker) => {
    const response = await api.get(`/tickers/${ticker}`);
    return response.data;
};

export const getPortfoliosComparison = async (period = '2y') => {
    const response = await api.get(`/portfolios/compare?period=${period}`);
    return response.data;
};

export const getTickersSummary = async () => {
    const response = await api.get('/tickers/summary');
    return response.data;
};

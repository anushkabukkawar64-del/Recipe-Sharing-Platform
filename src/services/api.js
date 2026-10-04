import axios from 'axios';

// Helper to resolve the backend base URL cleanly without trailing slashes or duplicate /api
const resolveApiBaseUrl = () => {
  // Check if running on localhost / local development
  const isLocal =
    import.meta.env.DEV ||
    (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'));

  const envUrl = import.meta.env.VITE_API_URL;

  let url;
  if (isLocal) {
    // If local, prefer localhost:5005 unless custom local URL is specified
    url =
      envUrl && envUrl.includes('localhost')
        ? envUrl.trim()
        : 'http://localhost:5005/api';
  } else {
    // In production on Render/Vercel
    url =
      envUrl && envUrl.trim() !== ''
        ? envUrl.trim()
        : 'https://recipe-4-c8mu.onrender.com/api';
  }

  // Strip trailing slashes
  url = url.replace(/\/+$/, '');

  // Ensure the base URL ends with /api for Axios
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }

  return url;
};

// Helper to resolve the host origin for static uploads (without /api)
export const resolveImageBaseUrl = () => {
  const isLocal =
    import.meta.env.DEV ||
    (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'));

  if (isLocal) {
    return 'http://localhost:5005';
  }

  const envImageUrl = import.meta.env.VITE_IMAGE_BASE_URL;
  if (envImageUrl && envImageUrl.trim() !== '') {
    return envImageUrl.trim().replace(/\/+$/, '');
  }

  // Automatically derive from API base URL by stripping /api
  const apiBase = resolveApiBaseUrl();
  return apiBase.replace(/\/api$/, '');
};

export const API_BASE_URL = resolveApiBaseUrl();
export const IMAGE_BASE_URL = resolveImageBaseUrl();

// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If request fails due to network or CORS, provide meaningful message
    if (!error.response) {
      console.error('Network / Server Connection Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Helper function to resolve image URLs properly
export const getImageUrl = (imagePath) => {
  if (!imagePath) {
    // Cute culinary placeholder
    return 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80';
  }
  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('data:')
  ) {
    return imagePath;
  }
  // Ensure image starts with slash
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${IMAGE_BASE_URL}${cleanPath}`;
};

// ----------------- Auth API -----------------
export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data.user;
  },
};

// ----------------- Recipe API -----------------
export const recipeService = {
  // Get all recipes with optional search and category filters
  getAllRecipes: async (params = {}) => {
    const response = await api.get('/recipes', { params });
    return response.data;
  },

  // Get a single recipe by its ID
  getRecipeById: async (id) => {
    const response = await api.get(`/recipes/${id}`);
    return response.data;
  },

  // Get recipes created by the current user
  getMyRecipes: async () => {
    const response = await api.get('/recipes/my-recipes');
    return response.data;
  },

  // Create a new recipe (FormData for file upload)
  createRecipe: async (formData) => {
    const response = await api.post('/recipes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update existing recipe (FormData for file upload)
  updateRecipe: async (id, formData) => {
    const response = await api.put(`/recipes/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete a recipe
  deleteRecipe: async (id) => {
    const response = await api.delete(`/recipes/${id}`);
    return response.data;
  },
};

// ----------------- Rating API -----------------
export const ratingService = {
  // Submit a rating (1 to 5)
  rateRecipe: async (recipeId, value) => {
    const response = await api.post(`/recipes/${recipeId}/rate`, { value });
    return response.data;
  },

  // Get dynamically aggregated average rating
  getAverageRating: async (recipeId) => {
    const response = await api.get(`/recipes/${recipeId}/average-rating`);
    return response.data;
  },

  // Get all ratings and check if user has rated
  getRecipeRatings: async (recipeId) => {
    const response = await api.get(`/recipes/${recipeId}/ratings`);
    return response.data;
  },
};

export default api;

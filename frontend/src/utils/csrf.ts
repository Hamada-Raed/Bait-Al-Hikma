const API_BASE_URL = 'http://localhost:8000/api';

// Helper function to get CSRF token from cookies
export const getCsrfToken = (): string | null => {
  const name = 'csrftoken';
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
};

// Helper function to fetch CSRF token from backend
export const fetchCsrfToken = async (): Promise<string | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/csrf_token/`, {
      method: 'GET',
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      return data.csrfToken || null;
    }
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
  }
  return null;
};

// Helper function to get CSRF token, fetching if not available
export const ensureCsrfToken = async (): Promise<string | null> => {
  let token = getCsrfToken();
  if (!token) {
    token = await fetchCsrfToken();
  }
  return token;
};


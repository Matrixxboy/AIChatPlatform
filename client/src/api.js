import axios from "axios";

const api = axios.create();

// Request interceptor to add the access token and handle base URL
api.interceptors.request.use(
  (config) => {
    // Manually handle base URL to prevent dropping subpaths
    if (config.url && !config.url.startsWith("http")) {
      const baseUrl = import.meta.env.VITE_API_URL.replace(/\/+$/, "");
      const path = config.url.startsWith("/") ? config.url : `/${config.url}`;
      config.url = `${baseUrl}${path}`;
    }

    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");

        // If no refresh token exists, logout
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Try to get a new access token
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
          {
            refreshToken: refreshToken,
          },
        );

        const newAccessToken = res.data.token;

        // Save the new token
        localStorage.setItem("token", newAccessToken);

        // Update the authorization header for the original request and retry
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token is expired or invalid
        console.error("Refresh token failed:", refreshError);

        // Clear local storage and dispatch a custom event to force logout
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");

        window.dispatchEvent(new Event("force-logout"));

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;

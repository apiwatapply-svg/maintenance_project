import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api",
  timeout: 10000
});

export function getBackendAssetUrl(path) {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${api.defaults.baseURL.replace(/\/api\/?$/, "")}${path}`;
}

export default api;

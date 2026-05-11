import axios from "axios";
import { getApiBaseUrl } from "./apiBaseUrl";

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000
});

export default api;

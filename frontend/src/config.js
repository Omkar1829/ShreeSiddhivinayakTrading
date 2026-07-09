// Manually toggle this variable to switch between environments:
// 'dev'  => Points to local backend (http://localhost:5050)
// 'prod' => Points to production backend (https://api.shreesiddhivinayaktrading.in)
export const ENVIRONMENT = 'prod'; // Change to 'prod' to use the production API

export const API_BASE_URL = ENVIRONMENT === 'dev'
  ? `http://192.168.10.4:5050`
  : 'https://api.shreesiddhivinayaktrading.in';

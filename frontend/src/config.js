// Manually toggle this variable to switch between environments:
// 'dev'  => Points to local backend (http://localhost:5050)
// 'prod' => Points to production backend (https://api.shreesiddhivinayaktrading.in)
export const ENVIRONMENT = 'dev'; // Set to 'dev' to test local backend server (http://localhost:5050)

export const API_BASE_URL = ENVIRONMENT === 'dev'
  ? `http://localhost:5050`
  : 'https://api.shreesiddhivinayaktrading.in';

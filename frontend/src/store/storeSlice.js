import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  settings: {
    store_name: "SHRI SIDDHIVINAYAK TRADING",
    logo_url: "",
    banner_url: "",
    phone_number: "+918452921123",
    whatsapp_number: "+918452921123",
    address: "Shop No. 4, Opp. Krishna Tower, Uran Naka, Panvel - 410206",
    opening_time: "08:00",
    closing_time: "21:00",
    store_status: "OPEN"
  },
  loading: false,
  error: null
};

const storeSlice = createSlice({
  name: 'store',
  initialState,
  reducers: {
    setSettings: (state, action) => {
      state.settings = action.payload;
      state.loading = false;
      state.error = null;
    },
    setStoreLoading: (state, action) => {
      state.loading = action.payload;
    },
    setStoreError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    }
  }
});

export const { setSettings, setStoreLoading, setStoreError } = storeSlice.actions;

// Selector to check if store is open
export const selectIsStoreOpen = (state) => {
  const settings = state.store.settings;
  if (!settings) return true;

  if (settings.store_status === 'CLOSED') {
    return false;
  }

  const openingTime = settings.opening_time || '08:00';
  const closingTime = settings.closing_time || '21:00';

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

  return currentTimeStr >= openingTime && currentTimeStr <= closingTime;
};

export default storeSlice.reducer;

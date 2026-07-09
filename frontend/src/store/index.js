import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import cartReducer from './cartSlice';
import catalogReducer from './catalogSlice';
import storeReducer from './storeSlice';
import notificationsReducer from './notificationSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    catalog: catalogReducer,
    store: storeReducer,
    notifications: notificationsReducer
  }
});

export default store;

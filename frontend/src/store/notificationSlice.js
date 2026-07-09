import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// Fetch paginated notifications for current admin
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async ({ limit = 20, offset = 0 } = {}, { rejectWithValue }) => {
    try {
      const res = await api.get(`/api/notifications?limit=${limit}&offset=${offset}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || err.message || 'Failed to fetch notifications.');
    }
  }
);

// Mark notification as read
export const markRead = createAsyncThunk(
  'notifications/markRead',
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/api/notifications/${id}/read`);
      return res.data.notification;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || err.message || 'Failed to mark notification as read.');
    }
  }
);

// Mark all notifications as read
export const markAllRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await api.patch('/api/notifications/read-all');
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || err.message || 'Failed to mark all notifications as read.');
    }
  }
);

// Delete notification
export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || err.message || 'Failed to delete notification.');
    }
  }
);

const initialState = {
  notifications: [],
  unreadCount: 0,
  total: 0,
  loading: false,
  error: null
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    receiveRealtimeNotification: (state, action) => {
      const newNotif = action.payload;
      // Prevent duplicates
      if (!state.notifications.some(n => n.id === newNotif.id)) {
        state.notifications.unshift(newNotif);
        state.unreadCount += 1;
        state.total += 1;
      }
    },
    clearNotificationError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        const { notifications, unreadCount, pagination } = action.payload;
        
        // Append or replace based on offset
        if (pagination.offset === 0) {
          state.notifications = notifications;
        } else {
          // Append while preventing duplicates
          const existingIds = new Set(state.notifications.map(n => n.id));
          notifications.forEach(n => {
            if (!existingIds.has(n.id)) {
              state.notifications.push(n);
            }
          });
        }
        
        state.unreadCount = unreadCount;
        state.total = pagination.total;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Mark as Read
      .addCase(markRead.fulfilled, (state, action) => {
        const updated = action.payload;
        const idx = state.notifications.findIndex(n => n.id === updated.id);
        if (idx !== -1) {
          if (!state.notifications[idx].isRead) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.notifications[idx] = updated;
        }
      })
      
      // Mark All Read
      .addCase(markAllRead.fulfilled, (state) => {
        state.notifications = state.notifications.map(n => ({
          ...n,
          isRead: true
        }));
        state.unreadCount = 0;
      })
      
      // Delete Notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const deletedId = action.payload;
        const notif = state.notifications.find(n => n.id === deletedId);
        if (notif) {
          if (!notif.isRead) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.total = Math.max(0, state.total - 1);
          state.notifications = state.notifications.filter(n => n.id !== deletedId);
        }
      });
  }
});

export const { receiveRealtimeNotification, clearNotificationError } = notificationSlice.actions;

export default notificationSlice.reducer;

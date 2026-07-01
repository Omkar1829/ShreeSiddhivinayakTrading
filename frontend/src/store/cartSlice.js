import { createSlice } from '@reduxjs/toolkit';

const loadCartFromStorage = () => {
  try {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    return [];
  }
};

const saveCartToStorage = (items) => {
  try {
    localStorage.setItem('cart', JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save cart to localStorage:', error);
  }
};

const initialState = {
  items: loadCartFromStorage()
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const { variantId, productId, name, variantName, price, quantity, imageUrl, stock } = action.payload;
      const existing = state.items.find(item => item.variantId === variantId);

      if (existing) {
        // Cap quantity at variant stock level
        const updatedQty = existing.quantity + quantity;
        existing.quantity = Math.min(updatedQty, stock);
      } else {
        state.items.push({
          variantId,
          productId,
          name,
          variantName,
          price: Number(price),
          quantity: Math.min(quantity, stock),
          imageUrl,
          stock
        });
      }
      saveCartToStorage(state.items);
    },
    removeFromCart: (state, action) => {
      const variantId = action.payload;
      state.items = state.items.filter(item => item.variantId !== variantId);
      saveCartToStorage(state.items);
    },
    updateQuantity: (state, action) => {
      const { variantId, quantity } = action.payload;
      const existing = state.items.find(item => item.variantId === variantId);

      if (existing) {
        if (quantity <= 0) {
          state.items = state.items.filter(item => item.variantId !== variantId);
        } else {
          // Cap at variant stock limit
          existing.quantity = Math.min(quantity, existing.stock);
        }
      }
      saveCartToStorage(state.items);
    },
    clearCart: (state) => {
      state.items = [];
      saveCartToStorage([]);
    }
  }
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;

// Selector to calculate total amount
export const selectCartTotal = (state) => 
  state.cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

// Selector to calculate total items count
export const selectCartCount = (state) => 
  state.cart.items.reduce((acc, item) => acc + item.quantity, 0);

export default cartSlice.reducer;

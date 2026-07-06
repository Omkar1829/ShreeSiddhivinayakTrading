import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  products: [],
  categories: [],
  brands: [],
  pagination: {
    total: 0,
    limit: 20,
    offset: 0
  },
  filters: {
    search: '',
    category: '',
    subcategory: '',
    brand: '',
    minPrice: '',
    maxPrice: '',
    inStock: ''
  },
  loading: false,
  error: null
};

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    setProducts: (state, action) => {
      state.products = action.payload.products;
      state.pagination = action.payload.pagination;
      state.loading = false;
      state.error = null;
    },
    setCategories: (state, action) => {
      state.categories = action.payload;
    },
    setBrands: (state, action) => {
      state.brands = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    setCatalogLoading: (state, action) => {
      state.loading = action.payload;
    },
    setCatalogError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    }
  }
});

export const { 
  setProducts, 
  setCategories, 
  setBrands, 
  setFilters, 
  resetFilters, 
  setCatalogLoading, 
  setCatalogError 
} = catalogSlice.actions;

export default catalogSlice.reducer;

import { configureStore } from '@reduxjs/toolkit'
import { api } from '../services/api'

import networkReducer from './slices/networkSlice' 

export const store = configureStore({
  reducer: {
    network: networkReducer, 
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
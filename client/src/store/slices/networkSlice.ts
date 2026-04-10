import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NetworkState {
  isOnline: boolean;
}

const initialState: NetworkState = {
  isOnline: true,
};

export const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
  },
});

export const { setOnlineStatus } = networkSlice.actions;
export default networkSlice.reducer;
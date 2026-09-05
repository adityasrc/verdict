import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { type TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { assignmentApi } from '../features/assignments/assignmentApi';
import { authApi } from '../features/auth/authApi';
import authReducer from '../features/auth/authSlice';
import { rubricApi } from '../features/rubrics/rubricApi';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        [authApi.reducerPath]: authApi.reducer,
        [assignmentApi.reducerPath]: assignmentApi.reducer,
        [rubricApi.reducerPath]: rubricApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(
            authApi.middleware,
            assignmentApi.middleware,
            rubricApi.middleware
        ),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
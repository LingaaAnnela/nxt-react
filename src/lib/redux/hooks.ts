import { useDispatch, useSelector, useStore } from "react-redux";
import type { RootState, AppDispatch, AppStore } from "./store";

// Pre-typed hooks ≈ injecting Store<AppState>: the app's state/dispatch types
// are bound once here so components never re-declare them. Always import these
// instead of the raw react-redux hooks.

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();

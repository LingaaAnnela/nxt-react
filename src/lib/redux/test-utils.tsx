import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { makeStore } from './store';

// Returns the store alongside the render result so tests can seed state
// (store.dispatch) and assert on it (store.getState()) — ≈ grabbing the
// Store from TestBed.inject(). Spreading keeps every render() helper
// available to existing callers.
export function renderWithStore(ui: React.ReactElement) {
  const store = makeStore();
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}

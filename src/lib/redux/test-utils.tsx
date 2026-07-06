import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { makeStore } from './store';

export function renderWithStore(ui: React.ReactElement) {
  const store = makeStore();
  return render(<Provider store={store}>{ui}</Provider>);
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductEditForm from './ProductEditForm';
import { renderWithStore } from '@/lib/redux/test-utils';
import { updateProduct } from '@/app/admin/products/actions';
import type { Product } from '@/lib/shop/types';

// Mock the Server Action at the module boundary. In jsdom there is no server
// — the real action would drag in revalidatePath, which only works inside a
// Next request. Everything BETWEEN the form and the action stays real: the
// submit goes through the actual RTK Query mutation (queryFn, dispatch,
// unwrap), so these tests cover that wiring too. ≈ mocking the HTTP layer
// but keeping the NgRx effects real.
// The factory must stub every export api.ts imports — it replaces the whole
// module, and a missing export would surface as undefined at call time.
vi.mock('@/app/admin/products/actions', () => ({
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}));
const updateProductMock = vi.mocked(updateProduct);

// vi.mock calls are hoisted above imports — vi.hoisted lifts the spy
// definition with them so the factory can close over it.
const routerPush = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}));

const product: Product = {
  id: 'p1',
  name: 'Aero Press Go',
  description: 'Portable espresso-style coffee maker for travel.',
  priceCents: 3999,
  category: 'Brewers',
  imageUrl: 'https://picsum.photos/seed/p1/400/300',
};

// The mutation hook needs the store, so this is renderWithStore territory —
// unlike the first version of this form, which rendered bare.
function renderForm() {
  renderWithStore(<ProductEditForm product={product} />);
  return userEvent.setup();
}

beforeEach(() => {
  updateProductMock.mockReset();
  routerPush.mockReset();
});

describe('ProductEditForm', () => {
  it('seeds the fields from the product, with cents formatted as a price string', () => {
    renderForm();
    expect(screen.getByLabelText(/name/i)).toHaveValue('Aero Press Go');
    expect(screen.getByLabelText(/price/i)).toHaveValue('39.99');
    expect(screen.getByLabelText(/category/i)).toHaveValue('Brewers');
  });

  it('keeps Save disabled until a field changes (isDirty)', async () => {
    const user = renderForm();
    const save = screen.getByRole('button', { name: /save/i });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText(/name/i), '!');
    expect(save).toBeEnabled();

    // Reverting to the defaultValues baseline flips it back — dirty means
    // "different from defaults", not "was touched".
    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), 'Aero Press Go');
    expect(save).toBeDisabled();
  });

  it('validates client-side on blur without calling the server', async () => {
    const user = renderForm();
    const price = screen.getByLabelText(/price/i);
    await user.clear(price);
    await user.type(price, 'free');
    await user.tab(); // mode: 'onTouched' — first validation runs on blur

    expect(await screen.findByText(/like 24\.50/i)).toBeInTheDocument();
    expect(price).toHaveAttribute('aria-invalid', 'true');
    expect(updateProductMock).not.toHaveBeenCalled();
  });

  it('submits the raw input strings and navigates to the detail page on success', async () => {
    updateProductMock.mockResolvedValue({
      status: 'success',
      product: { ...product, priceCents: 4500 },
    });
    const user = renderForm();
    const price = screen.getByLabelText(/price/i);
    await user.clear(price);
    await user.type(price, '45.00');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(updateProductMock).toHaveBeenCalledWith(
      'p1',
      // z.input shape: price still a string — the cents transform is the
      // server's job on this path.
      expect.objectContaining({ price: '45.00', name: 'Aero Press Go' }),
    );
    // Navigation is client-side now (the action no longer redirects); the
    // mutation's tag invalidation runs before we leave the page.
    expect(routerPush).toHaveBeenCalledWith('/products/p1');
  });

  it('maps server-rejected fields back onto the form via setError', async () => {
    updateProductMock.mockResolvedValue({
      status: 'error',
      errors: { name: ['That name is taken.'] },
    });
    const user = renderForm();
    await user.type(screen.getByLabelText(/name/i), ' 2');
    await user.click(screen.getByRole('button', { name: /save/i }));

    // Server error renders through the same path as client errors.
    expect(await screen.findByText('That name is taken.')).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('shows a form-level banner for non-field failures', async () => {
    updateProductMock.mockResolvedValue({
      status: 'error',
      message: 'Product not found — it may have been removed.',
    });
    const user = renderForm();
    await user.type(screen.getByLabelText(/name/i), ' 2');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /product not found/i,
    );
  });

  it('shows a generic banner when the action itself fails (transport error)', async () => {
    // A REJECTED promise, not an error payload — this is the path where
    // unwrap() throws and the catch block reports it.
    updateProductMock.mockRejectedValue(new Error('network down'));
    const user = renderForm();
    await user.type(screen.getByLabelText(/name/i), ' 2');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /something went wrong/i,
    );
    expect(routerPush).not.toHaveBeenCalled();
  });
});

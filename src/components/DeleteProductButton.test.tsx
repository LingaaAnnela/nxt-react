import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteProductButton from './DeleteProductButton';
import { renderWithStore } from '@/lib/redux/test-utils';
import { itemAdded, selectCartItems } from '@/lib/redux/features/cartSlice';
import { deleteProduct } from '@/app/admin/products/actions';

// Same module-boundary mock as ProductEditForm.test.tsx: the Server Action
// is stubbed, the RTK Query mutation between the button and it stays real.
vi.mock('@/app/admin/products/actions', () => ({
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}));
const deleteProductMock = vi.mocked(deleteProduct);

const routerPush = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}));

function renderButton() {
  const { store } = renderWithStore(
    <DeleteProductButton productId="p1" productName="Aero Press Go" />,
  );
  return { user: userEvent.setup(), store };
}

beforeEach(() => {
  deleteProductMock.mockReset();
  routerPush.mockReset();
});

describe('DeleteProductButton', () => {
  it('asks for confirmation instead of deleting on the first click', async () => {
    const { user } = renderButton();
    await user.click(screen.getByRole('button', { name: /delete product/i }));

    expect(screen.getByText(/can't be undone/i)).toBeInTheDocument();
    expect(deleteProductMock).not.toHaveBeenCalled();
  });

  it('backs out via Cancel without deleting', async () => {
    const { user } = renderButton();
    await user.click(screen.getByRole('button', { name: /delete product/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(
      screen.getByRole('button', { name: /delete product/i }),
    ).toBeInTheDocument();
    expect(deleteProductMock).not.toHaveBeenCalled();
  });

  it('deletes on confirm, evicts the cart line, and navigates to the list', async () => {
    deleteProductMock.mockResolvedValue({ status: 'success' });
    const { user, store } = renderButton();
    // Seed the cart with the doomed product plus a bystander.
    store.dispatch(itemAdded('p1'));
    store.dispatch(itemAdded('p2'));

    await user.click(screen.getByRole('button', { name: /delete product/i }));
    await user.click(screen.getByRole('button', { name: /yes, delete/i }));

    expect(deleteProductMock).toHaveBeenCalledWith('p1');
    // Only the deleted product's line is evicted.
    expect(selectCartItems(store.getState())).toEqual([
      { productId: 'p2', quantity: 1 },
    ]);
    expect(routerPush).toHaveBeenCalledWith('/products');
  });

  it('shows the server message when the delete is rejected', async () => {
    deleteProductMock.mockResolvedValue({
      status: 'error',
      message: 'Product not found — it may already have been deleted.',
    });
    const { user, store } = renderButton();
    store.dispatch(itemAdded('p1'));

    await user.click(screen.getByRole('button', { name: /delete product/i }));
    await user.click(screen.getByRole('button', { name: /yes, delete/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /product not found/i,
    );
    // A failed delete must not touch the cart or navigate.
    expect(selectCartItems(store.getState())).toEqual([
      { productId: 'p1', quantity: 1 },
    ]);
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('shows a generic banner on transport failure', async () => {
    deleteProductMock.mockRejectedValue(new Error('network down'));
    const { user } = renderButton();

    await user.click(screen.getByRole('button', { name: /delete product/i }));
    await user.click(screen.getByRole('button', { name: /yes, delete/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /something went wrong/i,
    );
  });
});

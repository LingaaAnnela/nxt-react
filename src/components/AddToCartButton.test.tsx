import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithStore } from "@/lib/redux/test-utils";
import AddToCartButton from "./AddToCartButton";

// Component test with a REAL store (renderWithStore wraps the component in
// <Provider store={makeStore()}>). ≈ TestBed with StoreModule.forRoot()
// rather than provideMockStore. Testing Library's philosophy: assert on what
// the user sees (queries by role/text), not on which actions were dispatched
// — the dispatch is an implementation detail.
describe("AddToCartButton", () => {
  it("adds the product and shows a live quantity", async () => {
    const user = userEvent.setup();
    renderWithStore(<AddToCartButton productId="p1" />);

    // Fresh store per test — makeStore() in the helper gives isolation for
    // free, the same reason it exists for SSR.
    expect(screen.queryByText(/in cart/i)).not.toBeInTheDocument();

    const button = screen.getByRole("button", { name: /add to cart/i });

    await user.click(button);
    expect(screen.getByText("In cart: 1")).toBeInTheDocument();

    await user.click(button);
    expect(screen.getByText("In cart: 2")).toBeInTheDocument();
  });
});

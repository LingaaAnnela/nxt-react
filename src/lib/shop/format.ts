// Currency formatting via Intl — the same machinery Angular's CurrencyPipe
// wraps. React has no pipes: a "pipe" is just a function you call in JSX.
export function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100);
}

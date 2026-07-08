---
title: Accessibility — ARIA, Focus Management, and useId
description: How to build accessible React components with ARIA attributes, focus traps, live regions, and the useId hook.
order: 16
---

# Accessibility — ARIA, Focus Management, and useId

Accessibility is a legal requirement for financial applications (WCAG 2.1 AA). React doesn't prevent you from building inaccessible UIs — you have to know what to build. These patterns cover the most common interview topics and the most common production gaps.

## Why semantic HTML first

Before reaching for ARIA, use the HTML element that already has the right semantics. Screen readers, keyboard navigation, and browser built-ins work for free with semantic HTML:

```tsx
// ❌ Div soup — no semantics, no keyboard, no screen reader
<div onClick={handleSubmit} class="button">Submit</div>

// ✓ Native button — keyboard focusable, activatable with Enter/Space,
//   announced as "Submit, button" by screen readers
<button type="submit">Submit</button>
```

**The rule:** use ARIA only when no HTML element exists with the right semantics. ARIA adds semantics to elements that lack them — it never overrides native behaviour.

## aria-label and aria-labelledby

Many interactive elements need a text label that isn't visually present or isn't adequate:

```tsx
// Icon button — no visible text, needs an aria-label
<button type="button" aria-label="Dismiss notification">×</button>

// Input whose label is elsewhere in the DOM
<h2 id="section-title">Products</h2>
<ul aria-labelledby="section-title">...</ul>

// Input with a visible label via htmlFor/id
<label htmlFor="search">Search</label>
<input id="search" type="search" />
```

`aria-labelledby` references an existing element by ID. Use it when the label text already exists in the DOM and you're just connecting it. `aria-label` is for labels that exist only for screen readers.

## aria-live — announcing dynamic content

When content changes without a page navigation, screen readers don't notice unless you use a live region:

```tsx
// Toasts, status messages, count updates:
<ol aria-live="polite">
  {toasts.map(toast => <li key={toast.id}>{toast.message}</li>)}
</ol>
```

- **`"polite"`** — announces after the user finishes their current task. Right for notifications, search result counts, success messages.
- **`"assertive"`** — interrupts immediately. Right for genuine errors that demand immediate attention (session expired, payment declined).

Overusing `"assertive"` is one of the most common accessibility bugs — it interrupts screen reader users mid-sentence.

```tsx
// In Brew Gear — the toast container uses polite
<ol className={styles.container} aria-live="polite" aria-label="Notifications">

// A form submission error should use assertive
<p role="alert">Payment declined. Please try again.</p>
// role="alert" is shorthand for aria-live="assertive" aria-atomic="true"
```

## aria-invalid and aria-describedby — form errors

Form validation errors must be programmatically associated with their inputs so screen readers announce them when the field is focused:

```tsx
<label htmlFor="email">Email</label>
<input
  id="email"
  name="email"
  type="email"
  aria-invalid={errors.email ? true : undefined}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>
{errors.email && (
  <span id="email-error" role="alert">
    {errors.email}
  </span>
)}
```

- `aria-invalid="true"` tells screen readers the field has an error.
- `aria-describedby="email-error"` associates the error message with the input; the screen reader announces the error text when the input receives focus.
- Both attributes must be removed (or set to `undefined`) when the field is valid — leaving `aria-invalid="false"` is technically valid but can confuse some screen readers.

Brew Gear's checkout form (`CheckoutForm.tsx`) uses this pattern. The form also programmatically focuses the first invalid field after a failed submit using:

```tsx
formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
```

## Focus management

Focus management is the most commonly missed accessibility requirement in dynamic UIs.

**Modals / drawers:** when opened, focus must move inside. When closed, focus must return to the trigger.

```tsx
'use client';
function CartDrawer({ isOpen, onClose }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null); // the button that opened it

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus(); // move focus inside on open
    } else {
      triggerRef.current?.focus(); // return focus on close
    }
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <dialog aria-modal="true" aria-label="Shopping cart">
      <button ref={closeButtonRef} onClick={onClose}>Close</button>
      {/* ... */}
    </dialog>
  );
}
```

**Focus trap:** inside a modal, Tab must cycle through focusable elements within the modal, not behind it. Libraries like `focus-trap-react` handle this, or you can implement it manually by intercepting Tab keydown events.

**Escape to close:** modals, drawers, and dropdowns should close on Escape. Brew Gear's cart drawer demonstrates this with a `document.keydown` listener in a `useEffect` (with cleanup).

## useId — stable IDs for accessibility

Pairing a label with its input requires a shared ID. Hard-coding IDs breaks when a component is used multiple times on the same page (two inputs with `id="email"` is invalid HTML):

```tsx
// ❌ Hard-coded ID — breaks with multiple instances
<label htmlFor="email">Email</label>
<input id="email" />

// ✓ useId generates a unique, stable ID per component instance
function EmailField() {
  const id = useId(); // e.g. ":r3:"
  return (
    <>
      <label htmlFor={id}>Email</label>
      <input id={id} />
    </>
  );
}
```

`useId` generates IDs that are:
- Unique per component instance (safe for multiple copies on one page)
- Stable across server and client renders (no hydration mismatch)
- Not suitable as React `key` props (they're for DOM IDs only)

## Keyboard navigation — custom components

Whenever you build a custom interactive widget (tabs, dropdown, combobox), you must implement keyboard navigation. The ARIA Authoring Practices Guide (APG) defines the expected patterns:

```tsx
// Tabs — arrow keys navigate between tabs, Enter/Space selects
function Tabs({ tabs }) {
  const [activeIndex, setActiveIndex] = useState(0);

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === 'ArrowRight') setActiveIndex((index + 1) % tabs.length);
    if (e.key === 'ArrowLeft') setActiveIndex((index - 1 + tabs.length) % tabs.length);
  }

  return (
    <div role="tablist">
      {tabs.map((tab, i) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={i === activeIndex}
          aria-controls={`panel-${tab.id}`}
          tabIndex={i === activeIndex ? 0 : -1}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onClick={() => setActiveIndex(i)}
        >
          {tab.label}
        </button>
      ))}
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          role="tabpanel"
          hidden={i !== activeIndex}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

`tabIndex={-1}` removes non-active tabs from the tab order. `tabIndex={0}` puts the active tab in the natural tab order. Arrow keys navigate within the tablist.

## WCAG 2.1 levels

| Level | Requirement |
|---|---|
| A | Minimum — keyboard access, no colour-only information, captions on video |
| AA | Standard — 4.5:1 colour contrast for text, focus visible, error identification |
| AAA | Enhanced — rarely required by law |

Financial institutions typically target **WCAG 2.1 AA**. The two most commonly failed criteria are colour contrast and missing focus indicators. In React, the focus indicator is often accidentally removed with `outline: none` in global CSS — always replace it with a visible custom focus style rather than removing it.

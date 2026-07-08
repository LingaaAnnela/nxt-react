---
title: List Virtualisation
description: How windowing renders only visible rows, the scroll-position math behind it, and which library to reach for in production.
order: 18
---

# List Virtualisation

A 10,000-row table with all rows in the DOM is one of the most common performance problems in enterprise dashboards. Virtualisation (also called *windowing*) is the fix — it keeps the DOM node count constant regardless of data size.

## The problem — DOM cost

Every DOM node has a cost:
- **Layout:** the browser must calculate position and size for every node
- **Style:** CSS is applied to every node on every repaint
- **Paint:** visible nodes are painted to the screen
- **Memory:** the browser keeps each node in memory

A 10,000-row table with 10 columns has 100,000 cells. Even with CSS `display: none`, the nodes still occupy memory and participate in style calculations. With `overflow: hidden` on a scrollable container, they all still exist — only painting is skipped.

The user only sees ~15 rows at any time. Rendering 9,985 invisible rows is pure waste.

## The mechanism — scroll-position maths

Virtualisation works by replacing all rows with only the visible slice, and using a spacer element to keep the scrollbar proportional:

```
container: 480px tall, overflow-y: auto
item height: 80px
visible items: ceil(480 / 80) = 6

user scrolls to scrollTop = 400px
  startIndex = floor(400 / 80) = 5
  endIndex   = startIndex + visible + overscan = 5 + 6 + 4 = 15

render only items[5..15] — 10 DOM nodes
spacer height = totalItems × 80 = e.g. 500 × 80 = 40,000px
  (makes the scrollbar look right for a 40,000px tall list)
```

Each rendered item is absolutely positioned at `top = index × itemHeight`. As the user scrolls, `scrollTop` changes, the index window shifts, old rows unmount and new ones mount. DOM node count: constant at ~10–15.

```tsx
function useVirtual(count: number, itemHeight: number, containerHeight: number) {
  const [scrollTop, setScrollTop] = useState(0);

  const overscan = 2; // render 2 extra rows above and below the viewport
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visible = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(count - 1, start + visible + overscan * 2);

  return {
    virtualItems: Array.from({ length: end - start + 1 }, (_, i) => ({
      index: start + i,
      top: (start + i) * itemHeight,
    })),
    totalHeight: count * itemHeight,
    onScroll: (e: React.UIEvent<HTMLDivElement>) =>
      setScrollTop(e.currentTarget.scrollTop),
  };
}
```

The Brew Gear `/virtualize` page implements exactly this. The live "Rows in DOM" counter shows the node count — watch it hold steady at ~15 while scrolling through 500 items.

## Overscan — why render slightly beyond the viewport

Without overscan, rows pop into existence exactly at the viewport edge — users can see blank space during fast scrolls. Rendering 2–4 extra rows above and below creates a buffer, so the row is already mounted before it enters the visible area.

The tradeoff: more DOM nodes vs. smoother scrolling. 2–4 items of overscan is the standard compromise.

## Production libraries

The manual implementation above skips several important details:

| Concern | Manual impl | Production library |
|---|---|---|
| Keyboard focus on virtualised rows | Not handled — focus is lost when a row unmounts | react-window: `scrollToItem(index)` |
| `scrollTo(index)` API | Missing | Both libraries support it |
| Variable height rows | Requires estimating / measuring each row | `@tanstack/react-virtual` — measures rows and updates as content loads |
| ResizeObserver | Missing — breaks if container resizes | `@tanstack/react-virtual` — observes container size |
| Horizontal lists, grids | Not shown | react-window: FixedSizeGrid, VariableSizeGrid |

**react-window** (`npm i react-window`) is the classic choice — minimal API, excellent for fixed-height items:

```tsx
import { FixedSizeList } from 'react-window';

function Row({ index, style }: { index: number; style: React.CSSProperties }) {
  // style MUST be applied to the root element — it contains the absolute positioning
  return <div style={style}>{items[index].name}</div>;
}

<FixedSizeList
  height={480}        // visible height of the scroll container
  itemCount={500}     // total number of items
  itemSize={80}       // height of each row in px
  width="100%"
>
  {Row}
</FixedSizeList>
```

**`@tanstack/react-virtual`** (the modern successor) handles variable heights:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80, // initial estimate; measured and corrected on render
});

<div ref={parentRef} style={{ height: 480, overflow: 'auto' }}>
  <div style={{ height: virtualizer.getTotalSize() }}>
    {virtualizer.getVirtualItems().map((row) => (
      <div
        key={row.key}
        style={{ position: 'absolute', top: row.start, height: row.size, width: '100%' }}
      >
        {items[row.index].name}
      </div>
    ))}
  </div>
</div>
```

## When to virtualise

Virtualise when:
- The list has 100+ items in a scrollable container
- Users report scroll jank (DevTools Performance tab confirms long frame times)
- You can measure a difference with the Profiler

Do not virtualise when:
- The list is short (virtualisation adds complexity for zero gain)
- You need all items in the DOM for accessibility (screen reader virtual cursors don't always trigger scroll events)
- You need CSS animations on mount/unmount (items enter and leave the DOM abruptly)

For pagination, infinite scroll, or a search-filtered list, virtualisation is often unnecessary because the visible slice is already small.

## The accessibility caveat

Screen readers have a "virtual cursor" that navigates the DOM independently of scroll position. With virtualisation, rows outside the viewport are not in the DOM — a screen reader at row 200 of a virtualised list may find an empty DOM below row 15. 

`react-window` does not solve this automatically. Options:
- Use `aria-rowcount` on the list and `aria-rowindex` on each row to communicate the total list size to screen readers
- For critical accessible tables, consider server-side pagination instead of virtualisation
- `@tanstack/react-table` + virtualisation has better accessibility primitives built in

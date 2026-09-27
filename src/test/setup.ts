import "@testing-library/jest-dom";

// jsdom implements no ResizeObserver, and recharts' ResponsiveContainer constructs one on
// mount. Any component rendering a chart throws without this — including BudgetOverview,
// whose pie is inline and so cannot be mocked away by the test that renders it.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

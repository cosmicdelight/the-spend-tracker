import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, createEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

// vi.mock factories are hoisted above module scope, so the doubles they close over
// have to be created by vi.hoisted rather than declared as ordinary consts.
const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ signOut: mocks.signOut }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

import DemoBanner, { SIGNUP_PATH } from "@/components/DemoBanner";

/** Stands in for the auth page so navigation is asserted through the real router
 *  rather than a useNavigate spy — a spy would still pass if Link and the handler
 *  disagreed about the destination. */
function Destination() {
  const { pathname, search } = useLocation();
  return <div data-testid="destination">{`${pathname}${search}`}</div>;
}

function renderBanner() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<DemoBanner />} />
        <Route path="/auth" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signOut.mockResolvedValue({ error: null });
});

describe("DemoBanner copy", () => {
  it("warns the account is shared instead of claiming read-only", () => {
    const { container } = renderBanner();

    // The banner used to say "data is read-only" while nothing enforced it: isDemo
    // gates only the banner and the tour, and the demo user has full CRUD via RLS.
    // The comment in the component binds humans; this binds CI.
    expect(container.textContent).not.toMatch(/read[\s-]?only/i);
    expect(container.textContent).toMatch(/shared sample account/i);
    expect(container.textContent).toMatch(/visible to everyone else trying the demo/i);
  });
});

describe("DemoBanner sign-up link", () => {
  it("points at the same route the handler navigates to", () => {
    renderBanner();

    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute("href", SIGNUP_PATH);
  });

  it("signs out and lands on the signup form", async () => {
    renderBanner();

    fireEvent.click(screen.getByRole("link", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByTestId("destination")).toHaveTextContent(SIGNUP_PATH);
    });
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  it("stays put and reports the failure when sign-out errors", async () => {
    mocks.signOut.mockResolvedValue({ error: { name: "AuthApiError", message: "network down" } });
    renderBanner();

    fireEvent.click(screen.getByRole("link", { name: /sign up/i }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledTimes(1));
    // Navigating anyway would leave the visitor authenticated, and Auth bounces
    // authenticated users straight back to "/" — the click would look like a no-op.
    expect(screen.queryByTestId("destination")).toBeNull();
    expect(mocks.toast.mock.calls[0][0]).toMatchObject({ variant: "destructive" });
  });

  it("leaves Cmd-click to the browser instead of destroying the session", () => {
    renderBanner();
    const link = screen.getByRole("link", { name: /sign up/i });

    const event = createEvent.click(link, { metaKey: true, button: 0 });
    fireEvent(link, event);

    expect(event.defaultPrevented).toBe(false);
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(screen.queryByTestId("destination")).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { setSession: vi.fn() } },
}));

import Auth from "@/pages/Auth";

/** Mounted outside <Routes> so it survives the navigation it triggers — the point is
 *  to change the query string while Auth stays mounted, which is what happens when
 *  the demo banner pushes ?mode=signup onto a page Index already redirected to. */
function ModePusher() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/auth?mode=signup")}>push signup mode</button>;
}

function renderAuth(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ModePusher />
      <Routes>
        <Route path="/auth" element={<Auth />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Auth mode from the URL", () => {
  it("starts on the signup form when the URL already asks for it", () => {
    renderAuth("/auth?mode=signup");

    expect(screen.getByText("Create Account")).toBeInTheDocument();
  });

  it("starts on the signin form with no mode param", () => {
    renderAuth("/auth");

    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
  });

  it("switches to signup when ?mode=signup arrives after mount", async () => {
    // Signing out of the demo redirects to a bare /auth first (Index sends every
    // signed-out visitor there the moment `user` goes null), and only then does the
    // banner push ?mode=signup. Same route, so React keeps the mount and a one-shot
    // useState initializer would never re-read the param — handing someone who
    // clicked "Sign up" the sign-in form instead.
    renderAuth("/auth");
    expect(screen.getByText("Welcome Back")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /push signup mode/i }));

    await waitFor(() => expect(screen.getByText("Create Account")).toBeInTheDocument());
  });
});

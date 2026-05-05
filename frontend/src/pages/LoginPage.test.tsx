import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LoginPage } from "@/pages/LoginPage";
import { AuthProvider } from "@/context/AuthContext";

// Mock the auth API
vi.mock("@/api", () => ({
  authApi: {
    login: vi.fn(),
    refresh: vi.fn().mockRejectedValue(new Error("no token")),
  },
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  it("renders email and password fields", () => {
    renderLoginPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("shows validation error for empty email", async () => {
    renderLoginPage();
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it("shows error on failed login", async () => {
    const { authApi } = await import("@/api");
    vi.mocked(authApi.login).mockRejectedValueOnce(new Error("401"));
    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/email/i), "bad@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/invalid email or password/i);
    });
  });
});

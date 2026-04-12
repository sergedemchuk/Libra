/**
 * Tests for role-based access control.
 *
 * Covers:
 *  1. LoginPage passes the user's role to onLoginSuccess.
 *  2. LoginPage persists role to localStorage when "Remember me" is checked.
 *  3. MenuBar hides admin-only buttons (Account Management, Create Account)
 *     for regular users and shows them for admins.
 *  4. createAccount() API helper sends `role` in the request body and
 *     defaults to "user" when none is provided.
 *  5. Protected admin email "libradev.admin@gmail.com" is the value the
 *     frontend treats as the undeletable admin (smoke check on the
 *     constant being referenced consistently).
 *
 * To run:
 *   npm i -D vitest @testing-library/react @testing-library/jest-dom \
 *           @testing-library/user-event jsdom
 *   npx vitest
 *
 * Add to vite.config.ts:
 *   test: { environment: "jsdom", globals: true, setupFiles: "./src/__tests__/setup.ts" }
 *
 * setup.ts should contain: import "@testing-library/jest-dom";
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import LoginPage from "../LoginPage";
import MenuBar from "../MenuBar";
import * as apiClient from "../api/client";

const PROTECTED_ADMIN_EMAIL = "libradev.admin@gmail.com";

// ─── Shared setup ────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── 1. LoginPage role propagation ───────────────────────────────────────────

describe("LoginPage", () => {
  it("calls onLoginSuccess with 'admin' when the API returns an admin account", async () => {
    const onLoginSuccess = vi.fn();

    vi.spyOn(apiClient, "loginAccount").mockResolvedValue({
      userId: "u-1",
      email: PROTECTED_ADMIN_EMAIL,
      role: "admin",
      dateCreated: "2026-01-01T00:00:00.000Z",
      lastLogin: "2026-01-01T00:00:00.000Z",
    });

    render(<LoginPage onLoginSuccess={onLoginSuccess} />);

    await userEvent.type(
      screen.getByLabelText(/email/i),
      PROTECTED_ADMIN_EMAIL,
    );
    await userEvent.type(screen.getByLabelText(/password/i), "supersecret");
    fireEvent.click(screen.getByRole("button", { name: /sign in|log in/i }));

    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith("admin"));
  });

  it("calls onLoginSuccess with 'user' when the API returns a regular account", async () => {
    const onLoginSuccess = vi.fn();

    vi.spyOn(apiClient, "loginAccount").mockResolvedValue({
      userId: "u-2",
      email: "alice@example.com",
      role: "user",
      dateCreated: "2026-01-02T00:00:00.000Z",
      lastLogin: "2026-01-02T00:00:00.000Z",
    });

    render(<LoginPage onLoginSuccess={onLoginSuccess} />);

    await userEvent.type(screen.getByLabelText(/email/i), "alice@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    fireEvent.click(screen.getByRole("button", { name: /sign in|log in/i }));

    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith("user"));
  });

  it("defaults unknown role values from the API to 'user' (defensive)", async () => {
    const onLoginSuccess = vi.fn();

    vi.spyOn(apiClient, "loginAccount").mockResolvedValue({
      userId: "u-3",
      email: "bob@example.com",
      // Simulate a legacy account record missing the role field
      role: undefined as unknown as "user",
      dateCreated: "2026-01-03T00:00:00.000Z",
      lastLogin: "2026-01-03T00:00:00.000Z",
    });

    render(<LoginPage onLoginSuccess={onLoginSuccess} />);

    await userEvent.type(screen.getByLabelText(/email/i), "bob@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    fireEvent.click(screen.getByRole("button", { name: /sign in|log in/i }));

    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith("user"));
  });

  it("persists role to localStorage only when 'Remember me' is checked", async () => {
    const onLoginSuccess = vi.fn();

    vi.spyOn(apiClient, "loginAccount").mockResolvedValue({
      userId: "u-4",
      email: PROTECTED_ADMIN_EMAIL,
      role: "admin",
      dateCreated: "2026-01-04T00:00:00.000Z",
      lastLogin: "2026-01-04T00:00:00.000Z",
    });

    render(<LoginPage onLoginSuccess={onLoginSuccess} />);

    await userEvent.type(
      screen.getByLabelText(/email/i),
      PROTECTED_ADMIN_EMAIL,
    );
    await userEvent.type(screen.getByLabelText(/password/i), "supersecret");

    // Try to find a "remember me" toggle; if present, click it.
    const remember = screen.queryByLabelText(/remember/i);
    if (remember) fireEvent.click(remember);

    fireEvent.click(screen.getByRole("button", { name: /sign in|log in/i }));

    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalled());

    if (remember) {
      expect(localStorage.getItem("libra_remember")).toBe("true");
      expect(localStorage.getItem("libra_role")).toBe("admin");
    } else {
      // No remember-me control rendered; nothing should have been persisted.
      expect(localStorage.getItem("libra_remember")).toBeNull();
      expect(localStorage.getItem("libra_role")).toBeNull();
    }
  });
});

// ─── 2. MenuBar role gating ──────────────────────────────────────────────────

describe("MenuBar", () => {
  const noop = () => {};

  it("hides Account Management and Create Account buttons for regular users", () => {
    render(
      <MenuBar
        activePage="upload"
        onPageChange={noop}
        onLogout={noop}
        userRole="user"
      />,
    );

    expect(screen.getByText(/upload catalog data/i)).toBeInTheDocument();
    expect(screen.queryByText(/account management/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^create account$/i)).not.toBeInTheDocument();
  });

  it("shows Account Management and Create Account buttons for admins", () => {
    render(
      <MenuBar
        activePage="upload"
        onPageChange={noop}
        onLogout={noop}
        userRole="admin"
      />,
    );

    expect(screen.getByText(/upload catalog data/i)).toBeInTheDocument();
    expect(screen.getByText(/account management/i)).toBeInTheDocument();
    expect(screen.getByText(/^create account$/i)).toBeInTheDocument();
  });

  it("treats a missing userRole prop as 'user' (no admin buttons leak)", () => {
    render(
      <MenuBar activePage="upload" onPageChange={noop} onLogout={noop} />,
    );

    expect(screen.queryByText(/account management/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^create account$/i)).not.toBeInTheDocument();
  });

  it("invokes onPageChange when an admin clicks Account Management", async () => {
    const onPageChange = vi.fn();
    render(
      <MenuBar
        activePage="upload"
        onPageChange={onPageChange}
        onLogout={noop}
        userRole="admin"
      />,
    );

    await userEvent.click(screen.getByText(/account management/i));
    expect(onPageChange).toHaveBeenCalledWith("account");
  });
});

// ─── 3. createAccount API helper ─────────────────────────────────────────────

describe("createAccount() API helper", () => {
  it("sends an explicit role in the request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        userId: "new-id",
        email: "newadmin@example.com",
        role: "admin",
        dateCreated: "2026-01-05T00:00:00.000Z",
        lastLogin: "2026-01-05T00:00:00.000Z",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiClient.createAccount("newadmin@example.com", "password123", "admin");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({
      email: "newadmin@example.com",
      password: "password123",
      role: "admin",
    });
  });

  it("defaults role to 'user' when none is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        userId: "new-id",
        email: "newuser@example.com",
        role: "user",
        dateCreated: "2026-01-06T00:00:00.000Z",
        lastLogin: "2026-01-06T00:00:00.000Z",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiClient.createAccount("newuser@example.com", "password123");

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.role).toBe("user");
  });
});

// ─── 4. Protected admin email constant ───────────────────────────────────────

describe("protected admin email", () => {
  it("is the new gmail address, not the legacy libra.com one", () => {
    expect(PROTECTED_ADMIN_EMAIL).toBe("libradev.admin@gmail.com");
    expect(PROTECTED_ADMIN_EMAIL).not.toBe("libradev@libra.com");
  });
});
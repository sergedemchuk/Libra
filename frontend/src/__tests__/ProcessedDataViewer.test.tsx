import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProcessedDataViewer from "../ProcessedDataViewer";

describe("ProcessedDataViewer cell editing", () => {
  const csvText = [
    "Title,Author,Price",
    "Book A,Jane Doe,12.99",
    "Book B,John Smith,9.50",
  ].join("\n");

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => csvText,
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("allows a user to edit a cell value and saves it on blur", async () => {
    const user = userEvent.setup();

    render(
      <ProcessedDataViewer
        downloadUrl="https://example.com/processed.csv"
        fileName="processed.csv"
      />
    );

    // Wait for CSV data to load
    expect(await screen.findByText("Processed Results")).toBeInTheDocument();

    // Original cell value is visible
    const originalCell = screen.getByText("Book A");
    expect(originalCell).toBeInTheDocument();

    // Click the cell to enter edit mode
    await user.click(originalCell);

    // Input should now appear with the current value
    const input = screen.getByDisplayValue("Book A");
    expect(input).toBeInTheDocument();

    // Change the value
    await user.clear(input);
    await user.type(input, "Book A - Edited");

    // Blur saves the edit
    fireEvent.blur(input);

    // Updated value should appear in the table
    expect(await screen.findByText("Book A - Edited")).toBeInTheDocument();

    // Edit count / download button should appear after at least one edit
    expect(screen.getByText(/1 edit/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download edited csv/i })).toBeInTheDocument();
  });

  it("saves an edited cell when Enter is pressed", async () => {
    const user = userEvent.setup();

    render(
      <ProcessedDataViewer
        downloadUrl="https://example.com/processed.csv"
        fileName="processed.csv"
      />
    );

    expect(await screen.findByText("Processed Results")).toBeInTheDocument();

    const priceCell = screen.getByText("12.99");
    await user.click(priceCell);

    const input = screen.getByDisplayValue("12.99");
    await user.clear(input);
    await user.type(input, "15.00{enter}");

    expect(await screen.findByText("15.00")).toBeInTheDocument();
  });

  it("cancels an edit when Escape is pressed", async () => {
    const user = userEvent.setup();

    render(
      <ProcessedDataViewer
        downloadUrl="https://example.com/processed.csv"
        fileName="processed.csv"
      />
    );

    expect(await screen.findByText("Processed Results")).toBeInTheDocument();

    const authorCell = screen.getByText("Jane Doe");
    await user.click(authorCell);

    const input = screen.getByDisplayValue("Jane Doe");
    await user.clear(input);
    await user.type(input, "Edited Name");
    await user.keyboard("{Escape}");

    // Original value remains, edited value is not saved
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByText("Edited Name")).not.toBeInTheDocument();
  });
});
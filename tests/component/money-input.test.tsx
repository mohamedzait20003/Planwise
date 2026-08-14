import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MoneyInput } from "@/components/client/money-input";

/**
 * The money field's editing contract.
 *
 * Everything asserted here is something a user relies on rather than something
 * the component happens to do: separators appear when reading and disappear
 * when typing, a change is saved when you leave the field and not before,
 * Escape abandons an edit, and holding a stepper is one save rather than
 * fifteen. Each of those is a promise the component's own comments make.
 */

function setup(props: Partial<Parameters<typeof MoneyInput>[0]> = {}) {
  const onCommit = vi.fn();
  const onChange = vi.fn();

  render(
    <MoneyInput
      value={1234}
      label="Amount"
      onCommit={onCommit}
      onChange={onChange}
      {...props}
    />
  );

  return { onCommit, onChange, field: screen.getByLabelText("Amount") };
}

describe("formatting follows focus", () => {
  it("groups thousands while reading", () => {
    const { field } = setup();
    expect(field).toHaveValue("1,234");
  });

  it("drops separators once typing starts", async () => {
    const user = userEvent.setup();
    const { field } = setup();

    await user.click(field);

    // A comma appearing under the caret mid-keystroke is the single most
    // irritating thing a money field can do, so the raw digits are shown.
    expect(field).toHaveValue("1234");
  });

  it("restores them on leaving", async () => {
    const user = userEvent.setup();
    const { field } = setup();

    await user.click(field);
    await user.tab();

    expect(field).toHaveValue("1,234");
  });
});

describe("saving", () => {
  it("does not save on every keystroke", async () => {
    const user = userEvent.setup();
    const { field, onCommit } = setup();

    await user.clear(field);
    await user.type(field, "500");

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("saves once, on leaving the field", async () => {
    const user = userEvent.setup();
    const { field, onCommit } = setup();

    await user.clear(field);
    await user.type(field, "500");
    await user.tab();

    expect(onCommit).toHaveBeenCalledExactlyOnceWith(500);
  });

  it("stays quiet when the value did not actually change", async () => {
    const user = userEvent.setup();
    const { field, onCommit } = setup();

    await user.click(field);
    await user.tab();

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("abandons the edit on Escape", async () => {
    const user = userEvent.setup();
    const { field, onCommit } = setup();

    await user.clear(field);
    await user.type(field, "9999");
    await user.keyboard("{Escape}");

    // Escape means "forget what I typed". Committing it would make the key
    // that cancels an edit the one that saves it.
    expect(onCommit).not.toHaveBeenCalled();
    expect(field).toHaveValue("1,234");
  });
});

describe("typing", () => {
  it("ignores characters that are not part of an amount", async () => {
    const user = userEvent.setup();
    const { field } = setup({ value: undefined });

    await user.click(field);
    await user.type(field, "12ab.3x4");

    expect(field).toHaveValue("12.34");
  });

  it("keeps at most two decimal places", async () => {
    const user = userEvent.setup();
    const { field } = setup({ value: undefined });

    await user.click(field);
    await user.type(field, "5.6789");

    expect(field).toHaveValue("5.67");
  });
});

describe("steppers", () => {
  it("moves by the step, not by a cent", async () => {
    const user = userEvent.setup();
    const { field } = setup({ value: 1000, step: 100 });

    await user.click(screen.getByLabelText("Increase Amount"));

    // The reason this input is not type=number: arrow keys and spinners on the
    // native control step by the `step` attribute, which nobody setting a
    // budget wants to be one cent.
    expect(field).toHaveValue("1,100");
  });

  it("cannot go below zero", () => {
    setup({ value: 0 });
    expect(screen.getByLabelText("Decrease Amount")).toBeDisabled();
  });

  it("holding it down is one save, not one per click", async () => {
    vi.useFakeTimers();

    const onCommit = vi.fn();
    render(
      <MoneyInput value={100} step={50} label="Amount" onCommit={onCommit} />
    );

    // fireEvent rather than user-event: this test owns the clock, and
    // user-event's own waiting deadlocks against fake timers.
    const increase = screen.getByLabelText("Increase Amount");
    for (let press = 0; press < 5; press++) fireEvent.click(increase);

    // Still nothing — the save waits for the presses to stop.
    expect(onCommit).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(onCommit).toHaveBeenCalledExactlyOnceWith(350);
    vi.useRealTimers();
  });
});

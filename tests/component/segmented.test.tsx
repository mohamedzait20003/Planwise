import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Segmented } from "@/components/common/segmented";

/**
 * The segmented control's keyboard contract.
 *
 * It is built as a radio group rather than a row of buttons, which is a promise
 * to keyboard and screen-reader users: one stop in the tab order for the whole
 * set, arrows to move within it, and the current choice announced. A row of
 * buttons would take four tab stops and announce nothing about which is active.
 *
 * These assert the promise, not the markup — every query below is by role and
 * accessible name, so a restyle cannot break them and a regression in the
 * semantics cannot slip past.
 */

const OPTIONS = [
  { value: "trend", label: "Trend" },
  { value: "variance", label: "Variance" },
  { value: "detail", label: "Detail" },
] as const;

function setup(value: string = "trend") {
  const onChange = vi.fn();

  render(
    <Segmented
      layoutId="test"
      label="Chart view"
      value={value}
      onChange={onChange}
      options={OPTIONS}
    />
  );

  return { onChange };
}

describe("semantics", () => {
  it("is a labelled radio group", () => {
    setup();
    expect(
      screen.getByRole("radiogroup", { name: "Chart view" })
    ).toBeInTheDocument();
  });

  it("announces which option is current", () => {
    setup("variance");

    expect(screen.getByRole("radio", { name: /Variance/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Trend/ })).not.toBeChecked();
  });
});

describe("the tab order holds one stop, not four", () => {
  it("only the selected option is reachable by Tab", () => {
    setup("variance");

    // A roving tabindex: Tab moves past the whole group, arrows move inside it.
    expect(screen.getByRole("radio", { name: /Variance/ })).toHaveAttribute(
      "tabindex",
      "0"
    );
    for (const name of [/Trend/, /Detail/]) {
      expect(screen.getByRole("radio", { name })).toHaveAttribute(
        "tabindex",
        "-1"
      );
    }
  });

  it("one Tab press lands on the group and the next leaves it", async () => {
    const user = userEvent.setup();
    setup("trend");

    await user.tab();
    expect(screen.getByRole("radio", { name: /Trend/ })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("radio", { name: /Trend/ })).not.toHaveFocus();
  });
});

describe("arrow keys move the selection", () => {
  it.each([
    ["{ArrowRight}", "variance"],
    ["{ArrowDown}", "variance"],
    ["{ArrowLeft}", "detail"],
    ["{ArrowUp}", "detail"],
  ])("%s from the first option selects %s", async (key, expected) => {
    const user = userEvent.setup();
    const { onChange } = setup("trend");

    await user.tab();
    await user.keyboard(key);

    // Left from the first wraps to the last — a set with no ends is easier to
    // traverse than one that silently stops.
    expect(onChange).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it("wraps forward off the end", async () => {
    const user = userEvent.setup();
    const { onChange } = setup("detail");

    await user.tab();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalledExactlyOnceWith("trend");
  });

  it("leaves unrelated keys alone", async () => {
    const user = userEvent.setup();
    const { onChange } = setup("trend");

    await user.tab();
    await user.keyboard("{Home}{End}x");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("still selects on Space, which is the radio contract", async () => {
    const user = userEvent.setup();
    const { onChange } = setup("trend");

    await user.tab();
    await user.keyboard(" ");

    // Not an accident of using <button>: activating the focused option is what
    // Space is supposed to do in a radio group.
    expect(onChange).toHaveBeenCalledExactlyOnceWith("trend");
  });
});

describe("pointer", () => {
  it("selects the option clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = setup("trend");

    await user.click(screen.getByRole("radio", { name: /Detail/ }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith("detail");
  });
});

describe("counts", () => {
  it("reads the count as part of the option's name", () => {
    const onChange = vi.fn();
    render(
      <Segmented
        layoutId="counted"
        label="Filter"
        value="active"
        onChange={onChange}
        options={[
          { value: "active", label: "Active", count: 12 },
          { value: "archived", label: "Archived", count: 0 },
        ]}
      />
    );

    // The number is inside the control, so a screen reader hears "Active 12"
    // rather than the label alone with a number floating nearby.
    expect(
      screen.getByRole("radio", { name: "Active 12" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Archived 0" })
    ).toBeInTheDocument();
  });
});

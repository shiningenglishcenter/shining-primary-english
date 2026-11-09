import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/shell/empty-state";

describe("EmptyState", () => {
  it("shows the title and guidance, with a decorative icon", () => {
    const { container } = render(
      <EmptyState icon={Users} title="Chưa có học sinh nào">
        Hãy tạo tài khoản học sinh.
      </EmptyState>,
    );
    expect(screen.getByText("Chưa có học sinh nào")).toBeInTheDocument();
    expect(screen.getByText("Hãy tạo tài khoản học sinh.")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

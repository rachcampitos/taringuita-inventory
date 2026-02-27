import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Input } from "@/components/ui/Input";

describe("Input", () => {
  it("renderiza con placeholder", () => {
    render(<Input placeholder="Escribe aqui" />);
    expect(screen.getByPlaceholderText("Escribe aqui")).toBeInTheDocument();
  });

  it("muestra label", () => {
    render(<Input label="Nombre" />);
    expect(screen.getByText("Nombre")).toBeInTheDocument();
  });

  it("muestra error con role alert", () => {
    render(<Input error="Campo requerido" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Campo requerido");
  });

  it("renderiza leftIcon", () => {
    render(<Input leftIcon={<span data-testid="left-icon">L</span>} />);
    expect(screen.getByTestId("left-icon")).toBeInTheDocument();
  });

  it("renderiza rightIcon", () => {
    render(<Input rightIcon={<span data-testid="right-icon">R</span>} />);
    expect(screen.getByTestId("right-icon")).toBeInTheDocument();
  });

  it("llama onChange al escribir", () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} placeholder="test" />);
    fireEvent.change(screen.getByPlaceholderText("test"), {
      target: { value: "hola" },
    });
    expect(handleChange).toHaveBeenCalled();
  });

  it("muestra asterisco cuando es required", () => {
    render(<Input label="Email" required />);
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("marca aria-invalid cuando hay error", () => {
    render(<Input error="Error" placeholder="test" />);
    expect(screen.getByPlaceholderText("test")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});

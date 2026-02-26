import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renderiza el texto del boton", () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("aplica variante primary por defecto", () => {
    render(<Button>Click</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-emerald-600");
  });

  it("aplica variante secondary", () => {
    render(<Button variant="secondary">Click</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-white");
  });

  it("aplica variante danger", () => {
    render(<Button variant="danger">Eliminar</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-red-600");
  });

  it("muestra spinner cuando loading=true", () => {
    render(<Button loading>Guardando</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.querySelector(".animate-spin")).toBeTruthy();
  });

  it("esta deshabilitado cuando disabled=true", () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("ejecuta onClick", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("no ejecuta onClick cuando esta disabled", () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("aplica w-full con fullWidth", () => {
    render(<Button fullWidth>Click</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("w-full");
  });

  it("aplica tamanos correctos", () => {
    const { rerender } = render(<Button size="sm">S</Button>);
    expect(screen.getByRole("button").className).toContain("h-8");

    rerender(<Button size="md">M</Button>);
    expect(screen.getByRole("button").className).toContain("h-10");

    rerender(<Button size="lg">L</Button>);
    expect(screen.getByRole("button").className).toContain("h-12");
  });
});

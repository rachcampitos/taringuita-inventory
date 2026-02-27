import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";

describe("Card", () => {
  it("renderiza children", () => {
    render(<Card>Contenido</Card>);
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });

  it("aplica padding sm", () => {
    const { container } = render(<Card padding="sm">Test</Card>);
    expect(container.firstChild).toHaveClass("p-3");
  });

  it("aplica padding md por defecto", () => {
    const { container } = render(<Card>Test</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("p-4");
  });

  it("aplica padding lg", () => {
    const { container } = render(<Card padding="lg">Test</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("p-5");
  });

  it("aplica padding none sin clases de padding", () => {
    const { container } = render(<Card padding="none">Test</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).not.toContain("p-3");
    expect(el.className).not.toContain("p-4");
    expect(el.className).not.toContain("p-5");
  });

  it("aplica className adicional", () => {
    const { container } = render(<Card className="mt-4">Test</Card>);
    expect(container.firstChild).toHaveClass("mt-4");
  });

  it("renderiza CardHeader", () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText("Header")).toBeInTheDocument();
  });

  it("renderiza CardBody", () => {
    render(<CardBody>Body</CardBody>);
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("renderiza CardFooter", () => {
    render(<CardFooter>Footer</CardFooter>);
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });
});

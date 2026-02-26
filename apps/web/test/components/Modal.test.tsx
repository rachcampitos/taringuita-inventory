import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Modal } from "@/components/ui/Modal";

describe("Modal", () => {
  it("no renderiza nada cuando isOpen=false", () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test">
        <p>Contenido</p>
      </Modal>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renderiza el titulo y contenido cuando isOpen=true", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Editar producto">
        <p>Contenido del modal</p>
      </Modal>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Editar producto")).toBeInTheDocument();
    expect(screen.getByText("Contenido del modal")).toBeInTheDocument();
  });

  it("llama onClose al hacer click en el boton cerrar", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    fireEvent.click(screen.getByLabelText("Cerrar"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("llama onClose al presionar Escape", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("aplica las clases de tamano correctas", () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test" size="lg">
        <p>Content</p>
      </Modal>
    );
    const dialog = container.querySelector("[role='dialog']");
    expect(dialog?.querySelector(".max-w-2xl")).toBeTruthy();
  });
});

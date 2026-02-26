import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { queueCount, getQueue, clearQueue, getQueueCount } from "@/lib/offline-queue";

describe("offline-queue", () => {
  beforeEach(async () => {
    await clearQueue();
  });

  it("deberia empezar con cola vacia", async () => {
    const count = await getQueueCount();
    expect(count).toBe(0);
  });

  it("deberia guardar un conteo en la cola", async () => {
    await queueCount("st1", "2026-02-26", [
      { productId: "p1", quantity: 5 },
    ]);

    const count = await getQueueCount();
    expect(count).toBe(1);
  });

  it("deberia guardar multiples conteos", async () => {
    await queueCount("st1", "2026-02-26", [
      { productId: "p1", quantity: 5 },
    ]);
    await queueCount("st2", "2026-02-26", [
      { productId: "p2", quantity: 10 },
    ]);

    const count = await getQueueCount();
    expect(count).toBe(2);
  });

  it("deberia retornar los conteos con getQueue", async () => {
    await queueCount("st1", "2026-02-26", [
      { productId: "p1", quantity: 5 },
      { productId: "p2", quantity: 3 },
    ]);

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].stationId).toBe("st1");
    expect(queue[0].items).toHaveLength(2);
    expect(queue[0].createdAt).toBeDefined();
  });

  it("deberia limpiar la cola con clearQueue", async () => {
    await queueCount("st1", "2026-02-26", [
      { productId: "p1", quantity: 5 },
    ]);
    await queueCount("st2", "2026-02-26", [
      { productId: "p2", quantity: 10 },
    ]);

    await clearQueue();

    const count = await getQueueCount();
    expect(count).toBe(0);
  });
});

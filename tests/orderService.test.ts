import { describe, expect, mock, test } from "bun:test";
import { orderService } from "../src/services/orderService.js";
import type { CreateOrderInput, Order, OrderWithItems, Product } from "../src/types.js";

const createMockOrderRepo = () => ({
  findAll: mock(() => Promise.resolve([] as Order[])),
  findById: mock(() => Promise.resolve(null as OrderWithItems | null)),
  create: mock(() => Promise.resolve({} as OrderWithItems)),
  updateStatus: mock(() => Promise.resolve(null as Order | null)),
});

const createMockProductRepo = () => ({
  findById: mock(() => Promise.resolve(null as Product | null)),
});

describe("orderService", () => {
  describe("createOrder", () => {
    test("creates order with valid items and calculates total correctly", async () => {
      const mockOrderRepo = createMockOrderRepo();
      const mockProductRepo = createMockProductRepo();

      const product1: Product = {
        id: 1,
        name: "Espresso",
        description: "",
        price: 2.5,
        available: true,
        created_at: new Date(),
      };

      const product2: Product = {
        id: 2,
        name: "Latte",
        description: "",
        price: 3.5,
        available: true,
        created_at: new Date(),
      };

      mockProductRepo.findById.mockImplementation((id: number) => {
        if (id === 1) return Promise.resolve(product1);
        if (id === 2) return Promise.resolve(product2);
        return Promise.resolve(null);
      });

      const input: CreateOrderInput = {
        customer_name: "Alice",
        items: [
          { product_id: 1, quantity: 2 },
          { product_id: 2, quantity: 1 },
        ],
      };

      const expectedOrder: OrderWithItems = {
        id: 1,
        customer_name: "Alice",
        status: "pending",
        total: 8.5,
        created_at: new Date(),
        items: [
          { id: 1, order_id: 1, product_id: 1, quantity: 2, price_at_purchase: 2.5 },
          { id: 2, order_id: 1, product_id: 2, quantity: 1, price_at_purchase: 3.5 },
        ],
      };

      mockOrderRepo.create.mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(input, mockOrderRepo, mockProductRepo);

      expect(result.total).toBe(8.5);
      expect(mockProductRepo.findById).toHaveBeenCalledTimes(2);
    });

    test("throws error for invalid product_id", async () => {
      const mockOrderRepo = createMockOrderRepo();
      const mockProductRepo = createMockProductRepo();

      mockProductRepo.findById.mockResolvedValue(null);

      const input: CreateOrderInput = {
        customer_name: "Bob",
        items: [{ product_id: 999, quantity: 1 }],
      };

      await expect(orderService.createOrder(input, mockOrderRepo, mockProductRepo)).rejects.toThrow(
        "Product with id 999 not found",
      );
    });

    test("throws error for zero quantity", async () => {
      const mockOrderRepo = createMockOrderRepo();
      const mockProductRepo = createMockProductRepo();

      const input: CreateOrderInput = {
        customer_name: "Charlie",
        items: [{ product_id: 1, quantity: 0 }],
      };

      await expect(orderService.createOrder(input, mockOrderRepo, mockProductRepo)).rejects.toThrow(
        "Item quantity must be greater than 0",
      );
    });
  });

  describe("getOrder", () => {
    test("returns order with items when found", async () => {
      const mockOrderRepo = createMockOrderRepo();
      const expectedOrder: OrderWithItems = {
        id: 1,
        customer_name: "Alice",
        status: "pending",
        total: 5,
        created_at: new Date(),
        items: [{ id: 1, order_id: 1, product_id: 1, quantity: 2, price_at_purchase: 2.5 }],
      };

      mockOrderRepo.findById.mockResolvedValue(expectedOrder);

      const result = await orderService.getOrder(1, mockOrderRepo);
      expect(result).toEqual(expectedOrder);
      expect(mockOrderRepo.findById).toHaveBeenCalledWith(1);
    });

    test("throws error when order not found", async () => {
      const mockOrderRepo = createMockOrderRepo();
      mockOrderRepo.findById.mockResolvedValue(null);

      await expect(orderService.getOrder(999, mockOrderRepo)).rejects.toThrow(
        "Order with id 999 not found",
      );
    });
  });

  describe("getAllOrders", () => {
    test("returns all orders", async () => {
      const mockOrderRepo = createMockOrderRepo();
      const expectedOrders: Order[] = [
        {
          id: 1,
          customer_name: "Alice",
          status: "pending",
          total: 5,
          created_at: new Date(),
        },
      ];

      mockOrderRepo.findAll.mockResolvedValue(expectedOrders);

      const result = await orderService.getAllOrders(mockOrderRepo);
      expect(result).toEqual(expectedOrders);
      expect(mockOrderRepo.findAll).toHaveBeenCalled();
    });
  });

  describe("updateOrderStatus", () => {
    test("updates status with valid value", async () => {
      const mockOrderRepo = createMockOrderRepo();
      const updatedOrder: Order = {
        id: 1,
        customer_name: "Alice",
        status: "completed",
        total: 5,
        created_at: new Date(),
      };

      mockOrderRepo.updateStatus.mockResolvedValue(updatedOrder);

      const result = await orderService.updateOrderStatus(1, { status: "completed" }, mockOrderRepo);

      expect(result.status).toBe("completed");
      expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith(1, "completed");
    });

    test("throws error when order not found", async () => {
      const mockOrderRepo = createMockOrderRepo();
      mockOrderRepo.updateStatus.mockResolvedValue(null);

      await expect(
        orderService.updateOrderStatus(999, { status: "completed" }, mockOrderRepo),
      ).rejects.toThrow("Order with id 999 not found");
    });

    test("throws error for invalid status", async () => {
      const mockOrderRepo = createMockOrderRepo();

      await expect(
        orderService.updateOrderStatus(1, { status: "invalid" as never }, mockOrderRepo),
      ).rejects.toThrow("Invalid status");
    });
  });
});

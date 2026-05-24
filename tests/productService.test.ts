import { describe, expect, mock, test } from "bun:test";
import { productService } from "../src/services/productService.js";
import type { CreateProductInput, Product } from "../src/types.js";

const createMockProductRepo = () => ({
  findAll: mock(() => Promise.resolve([] as Product[])),
  findById: mock(() => Promise.resolve(null as Product | null)),
  create: mock(() => Promise.resolve({} as Product)),
  update: mock(() => Promise.resolve(null as Product | null)),
  delete: mock(() => Promise.resolve(false)),
});

describe("productService", () => {
  describe("createProduct", () => {
    test("creates product with valid data", async () => {
      const mockRepo = createMockProductRepo();
      const input: CreateProductInput = {
        name: "Espresso",
        description: "Strong coffee",
        price: 2.5,
        available: true,
      };

      const expectedProduct: Product = {
        id: 1,
        name: "Espresso",
        description: "Strong coffee",
        price: 2.5,
        available: true,
        created_at: new Date(),
      };

      mockRepo.create.mockResolvedValue(expectedProduct);

      const result = await productService.createProduct(input, mockRepo);
      expect(result).toEqual(expectedProduct);
      expect(mockRepo.create).toHaveBeenCalledWith(input);
    });

    test("throws error for negative price", async () => {
      const mockRepo = createMockProductRepo();
      const input: CreateProductInput = { name: "Espresso", price: -2.5 };

      await expect(productService.createProduct(input, mockRepo)).rejects.toThrow(
        "Price must be greater than or equal to 0",
      );
    });
  });

  describe("getProduct", () => {
    test("returns product when found", async () => {
      const mockRepo = createMockProductRepo();
      const expectedProduct: Product = {
        id: 1,
        name: "Espresso",
        description: "Strong coffee",
        price: 2.5,
        available: true,
        created_at: new Date(),
      };

      mockRepo.findById.mockResolvedValue(expectedProduct);

      const result = await productService.getProduct(1, mockRepo);
      expect(result).toEqual(expectedProduct);
      expect(mockRepo.findById).toHaveBeenCalledWith(1);
    });

    test("throws error when product not found", async () => {
      const mockRepo = createMockProductRepo();
      mockRepo.findById.mockResolvedValue(null);

      await expect(productService.getProduct(999, mockRepo)).rejects.toThrow(
        "Product with id 999 not found",
      );
    });
  });

  describe("getAllProducts", () => {
    test("returns all products", async () => {
      const mockRepo = createMockProductRepo();
      const expectedProducts: Product[] = [
        {
          id: 1,
          name: "Espresso",
          description: "Strong coffee",
          price: 2.5,
          available: true,
          created_at: new Date(),
        },
      ];

      mockRepo.findAll.mockResolvedValue(expectedProducts);

      const result = await productService.getAllProducts(mockRepo);
      expect(result).toEqual(expectedProducts);
      expect(mockRepo.findAll).toHaveBeenCalled();
    });
  });

  describe("updateProduct", () => {
    test("updates product successfully", async () => {
      const mockRepo = createMockProductRepo();
      const updatedProduct: Product = {
        id: 1,
        name: "Americano",
        description: "Diluted espresso",
        price: 3,
        available: true,
        created_at: new Date(),
      };

      mockRepo.update.mockResolvedValue(updatedProduct);

      const result = await productService.updateProduct(
        1,
        { name: "Americano", price: 3 },
        mockRepo,
      );

      expect(result).toEqual(updatedProduct);
      expect(mockRepo.update).toHaveBeenCalledWith(1, { name: "Americano", price: 3 });
    });

    test("throws error when product not found", async () => {
      const mockRepo = createMockProductRepo();
      mockRepo.update.mockResolvedValue(null);

      await expect(productService.updateProduct(999, { price: 3 }, mockRepo)).rejects.toThrow(
        "Product with id 999 not found",
      );
    });
  });

  describe("deleteProduct", () => {
    test("deletes product successfully", async () => {
      const mockRepo = createMockProductRepo();
      mockRepo.delete.mockResolvedValue(true);

      await productService.deleteProduct(1, mockRepo);
      expect(mockRepo.delete).toHaveBeenCalledWith(1);
    });

    test("throws error when product not found", async () => {
      const mockRepo = createMockProductRepo();
      mockRepo.delete.mockResolvedValue(false);

      await expect(productService.deleteProduct(999, mockRepo)).rejects.toThrow(
        "Product with id 999 not found",
      );
    });
  });
});

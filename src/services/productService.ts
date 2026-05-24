import { productRepository } from "../repositories/productRepository.js";
import type { CreateProductInput, ErrorCode, Product, UpdateProductInput } from "../schemas.js";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode: ErrorCode
  ) {
    super(message);
    this.name = "AppError";
  }
}

export interface ProductRepositoryPort {
  findAll(): Promise<Product[]>;
  findById(id: number): Promise<Product | null>;
  create(input: CreateProductInput): Promise<Product>;
  update(id: number, input: UpdateProductInput): Promise<Product | null>;
  delete(id: number): Promise<boolean>;
}

export const productService = {
  async createProduct(
    input: CreateProductInput,
    repo: ProductRepositoryPort = productRepository
  ): Promise<Product> {
    if (!input.name || input.name.trim() === "") {
      throw new AppError("Product name is required", 400, "INVALID_INPUT");
    }
    if (input.price < 0) {
      throw new AppError("Price must be greater than or equal to 0", 400, "INVALID_INPUT");
    }
    return repo.create(input);
  },

  async getProduct(id: number, repo: ProductRepositoryPort = productRepository): Promise<Product> {
    const product = await repo.findById(id);
    if (!product) {
      throw new AppError(`Product with id ${id} not found`, 404, "PRODUCT_NOT_FOUND");
    }
    return product;
  },

  async getAllProducts(repo: ProductRepositoryPort = productRepository): Promise<Product[]> {
    return repo.findAll();
  },

  async updateProduct(
    id: number,
    input: UpdateProductInput,
    repo: ProductRepositoryPort = productRepository
  ): Promise<Product> {
    if (input.price !== undefined && input.price < 0) {
      throw new AppError("Price must be greater than or equal to 0", 400, "INVALID_INPUT");
    }
    const product = await repo.update(id, input);
    if (!product) {
      throw new AppError(`Product with id ${id} not found`, 404, "PRODUCT_NOT_FOUND");
    }
    return product;
  },

  async deleteProduct(id: number, repo: ProductRepositoryPort = productRepository): Promise<void> {
    const deleted = await repo.delete(id);
    if (!deleted) {
      throw new AppError(`Product with id ${id} not found`, 404, "PRODUCT_NOT_FOUND");
    }
  },
};

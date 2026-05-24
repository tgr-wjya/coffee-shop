import { orderRepository } from "../repositories/orderRepository.js";
import { productRepository } from "../repositories/productRepository.js";
import type {
  CreateOrderInput,
  Order,
  OrderWithItems,
  Product,
  UpdateOrderStatusInput,
} from "../schemas.js";
import { AppError } from "./productService.js";

const VALID_STATUSES = ["pending", "completed", "cancelled"] as const;

export interface OrderRepositoryPort {
  findAll(): Promise<Order[]>;
  findById(id: number): Promise<OrderWithItems | null>;
  create(
    input: CreateOrderInput,
    items: Array<{ product_id: number; quantity: number; price: number }>
  ): Promise<OrderWithItems>;
  updateStatus(id: number, status: "pending" | "completed" | "cancelled"): Promise<Order | null>;
}

export interface ProductRepositoryPort {
  findById(id: number): Promise<Product | null>;
}

export const orderService = {
  async createOrder(
    input: CreateOrderInput,
    orderRepo: OrderRepositoryPort = orderRepository,
    productRepo: ProductRepositoryPort = productRepository
  ): Promise<OrderWithItems> {
    if (!input.customer_name || input.customer_name.trim() === "") {
      throw new AppError("Customer name is required", 400, "INVALID_INPUT");
    }

    if (!input.items || input.items.length === 0) {
      throw new AppError("Order must contain at least one item", 400, "INVALID_INPUT");
    }

    const itemsWithPrices: Array<{
      product_id: number;
      quantity: number;
      price: number;
    }> = [];

    for (const item of input.items) {
      if (item.quantity <= 0) {
        throw new AppError("Item quantity must be greater than 0", 400, "INVALID_INPUT");
      }

      const product = await productRepo.findById(item.product_id);
      if (!product) {
        throw new AppError(
          `Product with id ${item.product_id} not found`,
          404,
          "PRODUCT_NOT_FOUND"
        );
      }

      if (!product.available) {
        throw new AppError(`Product ${product.name} is not available`, 400, "INSUFFICIENT_STOCK");
      }

      itemsWithPrices.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price: product.price,
      });
    }

    return orderRepo.create(input, itemsWithPrices);
  },

  async getOrder(
    id: number,
    orderRepo: OrderRepositoryPort = orderRepository
  ): Promise<OrderWithItems> {
    const order = await orderRepo.findById(id);
    if (!order) {
      throw new AppError(`Order with id ${id} not found`, 404, "ORDER_NOT_FOUND");
    }
    return order;
  },

  async getAllOrders(orderRepo: OrderRepositoryPort = orderRepository): Promise<Order[]> {
    return orderRepo.findAll();
  },

  async updateOrderStatus(
    id: number,
    input: UpdateOrderStatusInput,
    orderRepo: OrderRepositoryPort = orderRepository
  ): Promise<Order> {
    if (!VALID_STATUSES.includes(input.status)) {
      throw new AppError("Invalid status", 400, "INVALID_INPUT");
    }

    const order = await orderRepo.updateStatus(id, input.status);
    if (!order) {
      throw new AppError(`Order with id ${id} not found`, 404, "ORDER_NOT_FOUND");
    }
    return order;
  },
};

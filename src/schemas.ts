import { z } from "zod";

export const ProductSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().nullable(),
  price: z.number().nonnegative(),
  available: z.boolean(),
  created_at: z.date(),
});

export type Product = z.infer<typeof ProductSchema>;

export const CreateProductInputSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  price: z.number().nonnegative("Price must be greater than or equal to 0"),
  available: z.boolean().optional().default(true),
});

export type CreateProductInput = z.infer<typeof CreateProductInputSchema>;

export const UpdateProductInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().nonnegative("Price must be greater than or equal to 0").optional(),
  available: z.boolean().optional(),
});

export type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>;

export const OrderSchema = z.object({
  id: z.number().int().positive(),
  customer_name: z.string().min(1),
  status: z.enum(["pending", "completed", "cancelled"]),
  total: z.number().nonnegative(),
  created_at: z.date(),
});

export type Order = z.infer<typeof OrderSchema>;

export const OrderItemSchema = z.object({
  id: z.number().int().positive(),
  order_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  price_at_purchase: z.number().nonnegative(),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderWithItemsSchema = OrderSchema.extend({
  items: z.array(OrderItemSchema),
});

export type OrderWithItems = z.infer<typeof OrderWithItemsSchema>;

export const CreateOrderInputSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  items: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "Order must contain at least one item"),
});

export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

export const UpdateOrderStatusInputSchema = z.object({
  status: z.enum(["pending", "completed", "cancelled"]),
});

export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusInputSchema>;

export const ErrorCodeSchema = z.enum([
  "PRODUCT_NOT_FOUND",
  "ORDER_NOT_FOUND",
  "INVALID_INPUT",
  "INSUFFICIENT_STOCK",
  "DATABASE_ERROR",
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

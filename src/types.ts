export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  created_at: Date;
}

export interface Order {
  id: number;
  customer_name: string;
  status: "pending" | "completed" | "cancelled";
  total: number;
  created_at: Date;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price_at_purchase: number;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  available?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
  available?: boolean;
}

export interface CreateOrderInput {
  customer_name: string;
  items: Array<{
    product_id: number;
    quantity: number;
  }>;
}

export interface UpdateOrderStatusInput {
  status: "pending" | "completed" | "cancelled";
}

export type ErrorCode =
  | "PRODUCT_NOT_FOUND"
  | "ORDER_NOT_FOUND"
  | "INVALID_INPUT"
  | "INSUFFICIENT_STOCK"
  | "DATABASE_ERROR";

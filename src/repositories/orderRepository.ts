import { sql } from "../db/connection.js";
import type { CreateOrderInput, Order, OrderItem, OrderWithItems } from "../schemas.js";

const orderFields = `
  id,
  customer_name,
  status,
  total::float8 AS total,
  created_at
`;

const itemFields = `
  id,
  order_id,
  product_id,
  quantity,
  price_at_purchase::float8 AS price_at_purchase
`;

export const orderRepository = {
  async findAll(): Promise<Order[]> {
    const rows = await sql<Order[]>`
      SELECT ${sql.unsafe(orderFields)}
      FROM orders
      ORDER BY created_at DESC
    `;
    return rows;
  },

  async findById(id: number): Promise<OrderWithItems | null> {
    const orderRows = await sql<Order[]>`
      SELECT ${sql.unsafe(orderFields)}
      FROM orders
      WHERE id = ${id}
    `;

    if (orderRows.length === 0) {
      return null;
    }

    const itemRows = await sql<OrderItem[]>`
      SELECT ${sql.unsafe(itemFields)}
      FROM order_items
      WHERE order_id = ${id}
      ORDER BY id ASC
    `;

    return {
      ...orderRows[0],
      items: itemRows,
    };
  },

  async create(
    input: CreateOrderInput,
    items: Array<{ product_id: number; quantity: number; price: number }>
  ): Promise<OrderWithItems> {
    return sql.begin(async transaction => {
      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const orderRows = await transaction<Order[]>`
        INSERT INTO orders (customer_name, status, total)
        VALUES (${input.customer_name}, 'pending', ${total})
        RETURNING ${sql.unsafe(orderFields)}
      `;

      const order = orderRows[0];
      const orderItems: OrderItem[] = [];

      for (const item of items) {
        const itemRows = await transaction<OrderItem[]>`
          INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
          VALUES (${order.id}, ${item.product_id}, ${item.quantity}, ${item.price})
          RETURNING ${sql.unsafe(itemFields)}
        `;
        orderItems.push(itemRows[0]);
      }

      return {
        ...order,
        items: orderItems,
      };
    });
  },

  async updateStatus(
    id: number,
    status: "pending" | "completed" | "cancelled"
  ): Promise<Order | null> {
    const rows = await sql<Order[]>`
      UPDATE orders
      SET status = ${status}
      WHERE id = ${id}
      RETURNING ${sql.unsafe(orderFields)}
    `;
    return rows[0] || null;
  },
};

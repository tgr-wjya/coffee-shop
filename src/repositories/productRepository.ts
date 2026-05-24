import { sql } from "../db/connection.js";
import type { CreateProductInput, Product, UpdateProductInput } from "../schemas.js";

const productFields = `
  id,
  name,
  description,
  price::float8 AS price,
  available,
  created_at
`;

export const productRepository = {
  async findAll(): Promise<Product[]> {
    const rows = await sql<Product[]>`
      SELECT ${sql.unsafe(productFields)}
      FROM products
      ORDER BY created_at DESC
    `;
    return rows;
  },

  async findById(id: number): Promise<Product | null> {
    const rows = await sql<Product[]>`
      SELECT ${sql.unsafe(productFields)}
      FROM products
      WHERE id = ${id}
    `;
    return rows[0] || null;
  },

  async create(input: CreateProductInput): Promise<Product> {
    const rows = await sql<Product[]>`
      INSERT INTO products (name, description, price, available)
      VALUES (
        ${input.name},
        ${input.description || null},
        ${input.price},
        ${input.available ?? true}
      )
      RETURNING ${sql.unsafe(productFields)}
    `;
    return rows[0];
  },

  async update(id: number, input: UpdateProductInput): Promise<Product | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      values.push(input.name);
      updates.push(`name = $${values.length}`);
    }
    if (input.description !== undefined) {
      values.push(input.description);
      updates.push(`description = $${values.length}`);
    }
    if (input.price !== undefined) {
      values.push(input.price);
      updates.push(`price = $${values.length}`);
    }
    if (input.available !== undefined) {
      values.push(input.available);
      updates.push(`available = $${values.length}`);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE products
      SET ${updates.join(", ")}
      WHERE id = $${values.length}
      RETURNING ${productFields}
    `;
    const rows = await sql.unsafe<Product[]>(query, values);
    return rows[0] || null;
  },

  async delete(id: number): Promise<boolean> {
    const result = await sql`
      DELETE FROM products
      WHERE id = ${id}
    `;
    return result.count > 0;
  },
};

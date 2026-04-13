/**
 * @author Tegar Wijaya Kusuma
 * @date 13 April 2026
 */

import { db as defaultDb } from "../db/client";
import { type CreateProductInput, productTable } from "../db/schema";

type AppDb = typeof defaultDb;

export class ProductService {
	constructor(private readonly db: AppDb = defaultDb) {}

	async createProduct(input: CreateProductInput) {
		await this.db.insert(productTable).values({
			name: input.name,
			price: input.price,
			category: input.category,
			available: input.available ?? true,
		});
	}

	async listAllProducts() {
		return this.db.select().from(productTable);
	}
}

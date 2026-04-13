/**
 * @author Tegar Wijaya Kusuma
 * @date 13 April 2026
 */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { ProductService } from "../service/product.service";
import { CreateProductSchema } from "../types";

export function coffeeShopRouter(service = new ProductService()) {
	const coffeeShop = new Hono();

	coffeeShop.get("/", async (c) => {
		return c.json(await service.listAllProducts(), 200);
	});

	coffeeShop.post("/", zValidator("json", CreateProductSchema), async (c) => {
		const body = c.req.valid("json");
		CreateProductSchema.safeParse(body);

		await service.createProduct(body);

		return c.json({ message: "Product created" }, 201);
	});

	return coffeeShop;
}

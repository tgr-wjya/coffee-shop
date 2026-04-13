/**
 * @author Tegar Wijaya Kusuma
 * @date 13 April 2026
 */

import { Hono } from "hono";
import { ProductService } from "../service/product.service";

export function coffeeShopRouter(service = new ProductService()) {
	const coffeeShop = new Hono();

	coffeeShop.get("/", async (c) => {
		return c.json(await service.listAllProducts(), 200);
	});

	return coffeeShop;
}

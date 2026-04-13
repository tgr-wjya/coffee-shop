/**
 * @author Tegar Wijaya Kusuma
 * @date 13 April 2026
 */

import z from "zod";

export function getEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing env: ${name}`);
	}
	return value;
}

export const CreateProductSchema = z.object({
	name: z.string().min(2),
	price: z.number().min(1),
	category: z.enum(["food", "drink"]),
	available: z.boolean(),
});

export const availableEndpointsArray = [
	"GET /products",
	"POST /products",
	"PATCH /products/:id",
	"POST /orders",
	"GET /orders/:id",
	"PATCH /orders/:id/status",
	"GET /orders",
];

export const docsUrl = "https://github.com/tgr-wjya/coffee-shop";

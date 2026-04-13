/**
 * @author Tegar Wijaya Kusuma
 * @date 13 April 2026
 */

import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import { NotFoundException, ProductsNotFound } from "./error/error";
import { coffeeShopRouter } from "./routes/coffee";
import { availableEndpointsArray, docsUrl } from "./types";

const app = new Hono();

app.onError((err, c) => {
	const extra: Record<string, unknown> = {};
	let status = 500;

	if (err instanceof NotFoundException) {
		status = err.status;
		extra.availableEndpoints = err.availableEndpoints;
		extra.docs = err.docs;
	} else if (err instanceof ZodError) {
		status = 400;
	} else if (err instanceof ProductsNotFound) {
		status = err.status;
	}

	return c.json(
		{
			error:
				err instanceof ZodError
					? err.issues
					: err instanceof Error
						? err.message
						: "Unknown Error",
			timestamp: new Date().toISOString(),
			...extra,
		},
		status as ContentfulStatusCode,
	);
});

app.get("/hello", (c) => {
	return c.text("Hello, World");
});

app.route("/products", coffeeShopRouter());

app.all("/*", () => {
	throw new NotFoundException(availableEndpointsArray, docsUrl);
});

export default app;

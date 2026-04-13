/**
 * @author Tegar Wijaya Kusuma
 * @date 13 April 2026
 */

import { Hono } from "hono";
import { coffeeShopRouter } from "./routes/coffee";

const app = new Hono();

app.get("/hello", (c) => {
	return c.text("Hello, World");
});

app.route("/products", coffeeShopRouter());

export default app;

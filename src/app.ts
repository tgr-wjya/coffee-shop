/**
 * @author Tegar Wijaya Kusuma
 * @date 12 April 2026
 */

import { Hono } from "hono";

const app = new Hono();

app.get("/hello", (c) => {
	return c.text("Hello, World");
});

export default app;

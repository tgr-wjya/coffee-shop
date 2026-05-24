import { Hono } from "hono";
import { testConnection } from "./db/connection.js";
import { orderRoutes } from "./routes/orderRoutes.js";
import { productRoutes } from "./routes/productRoutes.js";

const app = new Hono();

app.get("/", c => c.json({ status: "ok", message: "Coffee Shop API" }));
app.route("/api/products", productRoutes);
app.route("/api/orders", orderRoutes);

await testConnection();

const port = Number.parseInt(process.env.PORT || "3000", 10);
console.log(`Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};

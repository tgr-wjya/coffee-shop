import { Hono } from "hono";
import { orderService } from "../services/orderService.js";
import { AppError } from "../services/productService.js";
import { CreateOrderInputSchema, UpdateOrderStatusInputSchema } from "../schemas.js";

export const orderRoutes = new Hono();

orderRoutes.get("/", async c => {
  try {
    const orders = await orderService.getAllOrders();
    return c.json(orders);
  } catch (error) {
    if (error instanceof AppError) {
      c.header("X-Error-Code", error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header("X-Error-Code", "DATABASE_ERROR");
    return c.json({ error: "Internal server error" }, 500);
  }
});

orderRoutes.get("/:id", async c => {
  try {
    const id = Number.parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) {
      c.header("X-Error-Code", "INVALID_INPUT");
      return c.json({ error: "Invalid order ID" }, 400);
    }

    const order = await orderService.getOrder(id);
    return c.json(order);
  } catch (error) {
    if (error instanceof AppError) {
      c.header("X-Error-Code", error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header("X-Error-Code", "DATABASE_ERROR");
    return c.json({ error: "Internal server error" }, 500);
  }
});

orderRoutes.post("/", async c => {
  try {
    const input = await c.req.json();
    const validatedInput = CreateOrderInputSchema.parse(input);
    const order = await orderService.createOrder(validatedInput);
    return c.json(order, 201);
  } catch (error) {
    if (error instanceof AppError) {
      c.header("X-Error-Code", error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header("X-Error-Code", "INVALID_INPUT");
    return c.json({ error: "Invalid input" }, 400);
  }
});

orderRoutes.patch("/:id/status", async c => {
  try {
    const id = Number.parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) {
      c.header("X-Error-Code", "INVALID_INPUT");
      return c.json({ error: "Invalid order ID" }, 400);
    }

    const input = await c.req.json();
    const validatedInput = UpdateOrderStatusInputSchema.parse(input);
    const order = await orderService.updateOrderStatus(id, validatedInput);
    return c.json(order);
  } catch (error) {
    if (error instanceof AppError) {
      c.header("X-Error-Code", error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header("X-Error-Code", "INVALID_INPUT");
    return c.json({ error: "Invalid input" }, 400);
  }
});

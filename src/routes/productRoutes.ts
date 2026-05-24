import { Hono } from "hono";
import { AppError, productService } from "../services/productService.js";
import { CreateProductInputSchema, UpdateProductInputSchema } from "../schemas.js";

export const productRoutes = new Hono();

productRoutes.get("/", async c => {
  try {
    const products = await productService.getAllProducts();
    return c.json(products);
  } catch (error) {
    if (error instanceof AppError) {
      c.header("X-Error-Code", error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header("X-Error-Code", "DATABASE_ERROR");
    return c.json({ error: "Internal server error" }, 500);
  }
});

productRoutes.get("/:id", async c => {
  try {
    const id = Number.parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) {
      c.header("X-Error-Code", "INVALID_INPUT");
      return c.json({ error: "Invalid product ID" }, 400);
    }

    const product = await productService.getProduct(id);
    return c.json(product);
  } catch (error) {
    if (error instanceof AppError) {
      c.header("X-Error-Code", error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header("X-Error-Code", "DATABASE_ERROR");
    return c.json({ error: "Internal server error" }, 500);
  }
});

productRoutes.post("/", async c => {
  try {
    const input = await c.req.json();
    const validatedInput = CreateProductInputSchema.parse(input);
    const product = await productService.createProduct(validatedInput);
    return c.json(product, 201);
  } catch (error) {
    if (error instanceof AppError) {
      c.header("X-Error-Code", error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header("X-Error-Code", "INVALID_INPUT");
    return c.json({ error: "Invalid input" }, 400);
  }
});

productRoutes.put("/:id", async c => {
  try {
    const id = Number.parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) {
      c.header("X-Error-Code", "INVALID_INPUT");
      return c.json({ error: "Invalid product ID" }, 400);
    }

    const input = await c.req.json();
    const validatedInput = UpdateProductInputSchema.parse(input);
    const product = await productService.updateProduct(id, validatedInput);
    return c.json(product);
  } catch (error) {
    if (error instanceof AppError) {
      c.header("X-Error-Code", error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header("X-Error-Code", "INVALID_INPUT");
    return c.json({ error: "Invalid input" }, 400);
  }
});

productRoutes.delete("/:id", async c => {
  try {
    const id = Number.parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) {
      c.header("X-Error-Code", "INVALID_INPUT");
      return c.json({ error: "Invalid product ID" }, 400);
    }

    await productService.deleteProduct(id);
    return c.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      c.header("X-Error-Code", error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header("X-Error-Code", "DATABASE_ERROR");
    return c.json({ error: "Internal server error" }, 500);
  }
});

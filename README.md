# Coffee Shop API

REST API for managing coffee shop products and orders.

## Tech Stack

- Bun
- Hono
- PostgreSQL

## Setup

1. Install dependencies:
   ```bash
   bun install
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Start PostgreSQL:
   ```bash
   podman-compose up -d
   # or: docker-compose up -d
   ```
4. Initialize database schema:
   ```bash
   psql -h localhost -U coffee_user -d coffee_shop -f src/db/schema.sql
   # Password: coffee_pass
   ```
5. Run dev server:
   ```bash
   bun run dev
   ```
6. Run tests:
   ```bash
   bun test
   ```

## API Endpoints

### Products

- `GET /api/products` - List all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders

- `GET /api/orders` - List all orders
- `GET /api/orders/:id` - Get order with items
- `POST /api/orders` - Create order
- `PATCH /api/orders/:id/status` - Update order status

## Example Requests

### Create a product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Espresso","description":"Strong coffee","price":2.50}'
```

### List all products

```bash
curl http://localhost:3000/api/products
```

### Create an order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_name":"Alice","items":[{"product_id":1,"quantity":2}]}'
```

### Get order details

```bash
curl http://localhost:3000/api/orders/1
```

### Update order status

```bash
curl -X PATCH http://localhost:3000/api/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

## Error Handling

All errors include:

- HTTP status code (400, 404, 500)
- `X-Error-Code` header (machine-readable)
- JSON body with error message

Example error response:

```http
HTTP/1.1 404 Not Found
X-Error-Code: PRODUCT_NOT_FOUND
Content-Type: application/json

{"error":"Product with id 123 not found"}
```

### Error Codes

- `PRODUCT_NOT_FOUND` - Product ID does not exist
- `ORDER_NOT_FOUND` - Order ID does not exist
- `INVALID_INPUT` - Validation failed
- `INSUFFICIENT_STOCK` - Product unavailable
- `DATABASE_ERROR` - Database error

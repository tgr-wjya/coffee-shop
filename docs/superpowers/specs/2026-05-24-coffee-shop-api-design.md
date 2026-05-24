# Coffee Shop API Design Specification

**Date:** 2026-05-24  
**Status:** Approved  
**Stack:** Bun + Hono + PostgreSQL (Podman)

## Overview

Simple REST API for coffee shop operations: manage products (coffee menu items) and orders. CRUD endpoints for products, order creation with line items, order status tracking. No authentication, no payment processing—focus on core inventory and order management.

## Architecture

**Pattern:** Layered architecture
- **Routes** (controllers): Handle HTTP requests/responses, validation
- **Services**: Business logic, orchestration
- **Repositories**: Database access layer

**Rationale:** Clear separation enables isolated unit testing of services by mocking repositories. Avoids coupling business logic to HTTP layer. Scales better than flat structure while avoiding over-engineering.

## Project Structure

```
coffee-shop/
├── src/
│   ├── index.ts              # App entry, Hono setup, route registration
│   ├── db/
│   │   ├── connection.ts     # PostgreSQL client setup (postgres.js)
│   │   └── schema.sql        # Table definitions, indexes
│   ├── repositories/
│   │   ├── productRepository.ts
│   │   └── orderRepository.ts
│   ├── services/
│   │   ├── productService.ts
│   │   └── orderService.ts
│   ├── routes/
│   │   ├── productRoutes.ts
│   │   └── orderRoutes.ts
│   └── types.ts              # Shared TypeScript interfaces
├── tests/
│   ├── productService.test.ts
│   └── orderService.test.ts
├── package.json
├── tsconfig.json
├── docker-compose.yml        # PostgreSQL container (Podman-compatible)
└── README.md
```

## Data Model

### Tables

**products**
```sql
id              SERIAL PRIMARY KEY
name            TEXT NOT NULL
description     TEXT
price           DECIMAL(10,2) NOT NULL CHECK (price >= 0)
available       BOOLEAN DEFAULT true
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**orders**
```sql
id              SERIAL PRIMARY KEY
customer_name   TEXT NOT NULL
status          TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled'))
total           DECIMAL(10,2) NOT NULL CHECK (total >= 0)
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**order_items**
```sql
id                  SERIAL PRIMARY KEY
order_id            INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE
product_id          INTEGER NOT NULL REFERENCES products(id)
quantity            INTEGER NOT NULL CHECK (quantity > 0)
price_at_purchase   DECIMAL(10,2) NOT NULL
```

### Relationships

- Order → Order Items: One-to-many
- Product → Order Items: One-to-many
- `price_at_purchase` stores snapshot of product price at order time (handles historical accuracy if prices change)

### Indexes

- `order_items.order_id` (foreign key lookup)
- `order_items.product_id` (foreign key lookup)

## API Endpoints

**Base URL:** `/api`

### Products

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| GET | `/products` | List all products | - | `Product[]` |
| GET | `/products/:id` | Get single product | - | `Product` |
| POST | `/products` | Create product | `{name, description?, price, available?}` | `Product` |
| PUT | `/products/:id` | Update product | `{name?, description?, price?, available?}` | `Product` |
| DELETE | `/products/:id` | Delete product | - | `{success: true}` |

### Orders

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| GET | `/orders` | List all orders | - | `Order[]` |
| GET | `/orders/:id` | Get order with items | - | `Order & {items: OrderItem[]}` |
| POST | `/orders` | Create order | `{customer_name, items: [{product_id, quantity}]}` | `Order & {items: OrderItem[]}` |
| PATCH | `/orders/:id/status` | Update order status | `{status: 'pending'\|'completed'\|'cancelled'}` | `Order` |

### Request/Response Format

All requests and responses use JSON. Content-Type: `application/json`.

**Product:**
```json
{
  "id": 1,
  "name": "Espresso",
  "description": "Strong Italian coffee",
  "price": 2.50,
  "available": true,
  "created_at": "2026-05-24T10:00:00Z"
}
```

**Order:**
```json
{
  "id": 1,
  "customer_name": "Alice",
  "status": "pending",
  "total": 7.50,
  "created_at": "2026-05-24T10:15:00Z"
}
```

**OrderItem:**
```json
{
  "id": 1,
  "order_id": 1,
  "product_id": 2,
  "quantity": 2,
  "price_at_purchase": 3.00
}
```

## Error Handling

### Error Response Format

All errors return:
- **HTTP status code** (400, 404, 500)
- **Custom header:** `X-Error-Code` (machine-readable error type)
- **JSON body:** `{ "error": "Human-readable message" }`

### Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `PRODUCT_NOT_FOUND` | 404 | Product ID does not exist |
| `ORDER_NOT_FOUND` | 404 | Order ID does not exist |
| `INVALID_INPUT` | 400 | Validation failed (missing fields, negative values) |
| `INSUFFICIENT_STOCK` | 400 | Product marked unavailable |
| `DATABASE_ERROR` | 500 | Database connection/query failure |

### Example Error Response

```
HTTP/1.1 404 Not Found
X-Error-Code: PRODUCT_NOT_FOUND
Content-Type: application/json

{
  "error": "Product with id 123 not found"
}
```

### Validation Rules

**Products:**
- `name`: required, non-empty string
- `price`: required, must be >= 0
- `available`: optional, defaults to true

**Orders:**
- `customer_name`: required, non-empty string
- `items`: required, array with at least 1 item
- Each item: `product_id` (must exist), `quantity` (must be > 0)
- Total calculated server-side (sum of `price * quantity` for each item)

**Order Status Updates:**
- `status`: must be one of `'pending'`, `'completed'`, `'cancelled'`

### Transaction Handling

**Order creation** wraps multiple operations in a database transaction:
1. Insert into `orders` table
2. Insert each item into `order_items` table
3. Commit if all succeed, rollback if any fail

Ensures atomicity—no partial orders in database.

## Testing Strategy

**Framework:** Bun's built-in test runner (`bun test`)

**Scope:** Unit tests for service layer only

**Approach:**
- Mock repository methods
- Test business logic in isolation
- No integration/API tests (manual testing for endpoints)

**Test Coverage:**

**productService.test.ts:**
- Create product with valid data → success
- Create product with negative price → throws error
- Update product → returns updated product
- Delete product → success

**orderService.test.ts:**
- Create order with valid items → calculates total correctly
- Create order with invalid product_id → throws error
- Create order with zero quantity → throws error
- Update order status with valid value → success
- Update order status with invalid value → throws error

**Mocking Pattern:**
```typescript
import { describe, test, expect, mock } from "bun:test";

const mockProductRepo = {
  findById: mock(() => Promise.resolve({ id: 1, name: "Espresso", price: 2.50 })),
  create: mock((data) => Promise.resolve({ id: 1, ...data }))
};

// Test service with mock
```

## Database Setup

**Container:** PostgreSQL via Podman (or Docker)

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: coffee_shop
      POSTGRES_USER: coffee_user
      POSTGRES_PASSWORD: coffee_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Connection:** Environment variables for DB credentials (`.env` file, not committed)

**Schema initialization:** Run `schema.sql` on first setup

## Dependencies

```json
{
  "dependencies": {
    "hono": "^4.x",
    "postgres": "^3.x"
  },
  "devDependencies": {
    "bun-types": "latest"
  }
}
```

- **hono**: Web framework
- **postgres**: PostgreSQL client for Node/Bun
- **bun-types**: TypeScript types for Bun runtime

## Development Workflow

1. Start PostgreSQL: `podman-compose up -d` (or `docker-compose`)
2. Initialize schema: `psql -U coffee_user -d coffee_shop -f src/db/schema.sql`
3. Run dev server: `bun run src/index.ts`
4. Run tests: `bun test`

## Out of Scope

- Authentication/authorization
- Payment processing
- User accounts
- Inventory tracking (stock counts)
- Order history per customer
- Product categories
- Customizations (sizes, add-ons)

## Success Criteria

- All CRUD operations for products work via API
- Orders can be created with multiple items
- Order total calculated correctly
- Order status can be updated
- Database transactions prevent partial orders
- Unit tests pass for service layer
- Error responses include `X-Error-Code` header and descriptive message

# Coffee Shop API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build REST API for coffee shop product and order management using Bun, Hono, and PostgreSQL.

**Architecture:** Layered architecture with routes (HTTP layer), services (business logic), and repositories (database access). Services tested in isolation by mocking repositories.

**Tech Stack:** Bun runtime, Hono web framework, postgres.js client, PostgreSQL 16, Podman for containers.

---

## Task 0: Project Initialization

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `docker-compose.yml`
- Create: `README.md`

- [ ] **Step 1: Initialize project directory**

```bash
cd ~/Documents/Projects/Personal
mkdir coffee-shop
cd coffee-shop
git init
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "coffee-shop-api",
  "version": "1.0.0",
  "description": "Coffee shop REST API with Bun, Hono, PostgreSQL",
  "type": "module",
  "scripts": {
    "dev": "bun run src/index.ts",
    "test": "bun test"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "bun-types": "latest"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create .env.example**

```
DATABASE_URL=postgres://coffee_user:coffee_pass@localhost:5432/coffee_shop
PORT=3000
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
.env
dist/
*.log
```

- [ ] **Step 6: Create docker-compose.yml**

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

- [ ] **Step 7: Create README.md**

```markdown
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
```

- [ ] **Step 8: Install dependencies**

```bash
bun install
```

Expected: Dependencies installed successfully

- [ ] **Step 9: Commit initial setup**

```bash
git add .
git commit -m "chore: initialize project with Bun, Hono, PostgreSQL setup"
```

---

## Task 1: Database Schema and Connection

**Files:**
- Create: `src/db/schema.sql`
- Create: `src/db/connection.ts`
- Create: `src/types.ts`

- [ ] **Step 1: Create database schema**

Create `src/db/schema.sql`:

```sql
-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_purchase DECIMAL(10,2) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
```

- [ ] **Step 2: Create TypeScript types**

Create `src/types.ts`:

```typescript
export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  created_at: Date;
}

export interface Order {
  id: number;
  customer_name: string;
  status: 'pending' | 'completed' | 'cancelled';
  total: number;
  created_at: Date;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price_at_purchase: number;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  available?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
  available?: boolean;
}

export interface CreateOrderInput {
  customer_name: string;
  items: Array<{
    product_id: number;
    quantity: number;
  }>;
}

export interface UpdateOrderStatusInput {
  status: 'pending' | 'completed' | 'cancelled';
}

export type ErrorCode = 
  | 'PRODUCT_NOT_FOUND'
  | 'ORDER_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'INSUFFICIENT_STOCK'
  | 'DATABASE_ERROR';
```

- [ ] **Step 3: Create database connection module**

Create `src/db/connection.ts`:

```typescript
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL || 'postgres://coffee_user:coffee_pass@localhost:5432/coffee_shop';

export const sql = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export async function testConnection(): Promise<void> {
  try {
    await sql`SELECT 1`;
    console.log('✓ Database connection established');
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw error;
  }
}
```

- [ ] **Step 4: Create .env file**

```bash
cp .env.example .env
```

- [ ] **Step 5: Start PostgreSQL container**

```bash
cd ~/Documents/Projects/Personal/coffee-shop
podman-compose up -d
```

Expected: Container starts successfully

- [ ] **Step 6: Initialize database schema**

```bash
psql -h localhost -U coffee_user -d coffee_shop -f src/db/schema.sql
```

When prompted for password: `coffee_pass`

Expected: Tables created successfully

- [ ] **Step 7: Commit database setup**

```bash
git add src/db/ src/types.ts .env.example
git commit -m "feat: add database schema, connection, and TypeScript types"
```

---

## Task 2: Product Repository

**Files:**
- Create: `src/repositories/productRepository.ts`

- [ ] **Step 1: Create product repository**

Create `src/repositories/productRepository.ts`:

```typescript
import { sql } from '../db/connection.js';
import type { Product, CreateProductInput, UpdateProductInput } from '../types.js';

export const productRepository = {
  async findAll(): Promise<Product[]> {
    const rows = await sql<Product[]>`
      SELECT id, name, description, price, available, created_at
      FROM products
      ORDER BY created_at DESC
    `;
    return rows;
  },

  async findById(id: number): Promise<Product | null> {
    const rows = await sql<Product[]>`
      SELECT id, name, description, price, available, created_at
      FROM products
      WHERE id = ${id}
    `;
    return rows[0] || null;
  },

  async create(input: CreateProductInput): Promise<Product> {
    const rows = await sql<Product[]>`
      INSERT INTO products (name, description, price, available)
      VALUES (
        ${input.name},
        ${input.description || null},
        ${input.price},
        ${input.available ?? true}
      )
      RETURNING id, name, description, price, available, created_at
    `;
    return rows[0];
  },

  async update(id: number, input: UpdateProductInput): Promise<Product | null> {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push(`name = $${updates.length + 1}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${updates.length + 1}`);
      values.push(input.description);
    }
    if (input.price !== undefined) {
      updates.push(`price = $${updates.length + 1}`);
      values.push(input.price);
    }
    if (input.available !== undefined) {
      updates.push(`available = $${updates.length + 1}`);
      values.push(input.available);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const rows = await sql<Product[]>`
      UPDATE products
      SET ${sql(updates.join(', '))}
      WHERE id = ${id}
      RETURNING id, name, description, price, available, created_at
    `;
    return rows[0] || null;
  },

  async delete(id: number): Promise<boolean> {
    const result = await sql`
      DELETE FROM products
      WHERE id = ${id}
    `;
    return result.count > 0;
  },
};
```

- [ ] **Step 2: Commit product repository**

```bash
git add src/repositories/productRepository.ts
git commit -m "feat: add product repository with CRUD operations"
```

---

## Task 3: Product Service with Tests (TDD)

**Files:**
- Create: `tests/productService.test.ts`
- Create: `src/services/productService.ts`

- [ ] **Step 1: Write failing test for create product with valid data**

Create `tests/productService.test.ts`:

```typescript
import { describe, test, expect, mock, beforeEach } from 'bun:test';
import type { Product, CreateProductInput } from '../src/types.js';

// Mock repository will be injected
const createMockProductRepo = () => ({
  findAll: mock(() => Promise.resolve([])),
  findById: mock(() => Promise.resolve(null)),
  create: mock(() => Promise.resolve({} as Product)),
  update: mock(() => Promise.resolve(null)),
  delete: mock(() => Promise.resolve(false)),
});

describe('productService', () => {
  describe('createProduct', () => {
    test('creates product with valid data', async () => {
      const mockRepo = createMockProductRepo();
      const input: CreateProductInput = {
        name: 'Espresso',
        description: 'Strong coffee',
        price: 2.50,
        available: true,
      };
      
      const expectedProduct: Product = {
        id: 1,
        name: 'Espresso',
        description: 'Strong coffee',
        price: 2.50,
        available: true,
        created_at: new Date(),
      };
      
      mockRepo.create.mockResolvedValue(expectedProduct);
      
      // Service doesn't exist yet - this will fail
      const { productService } = await import('../src/services/productService.js');
      const result = await productService.createProduct(input, mockRepo);
      
      expect(result).toEqual(expectedProduct);
      expect(mockRepo.create).toHaveBeenCalledWith(input);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/productService.test.ts
```

Expected: FAIL with "Cannot find module '../src/services/productService.js'"

- [ ] **Step 3: Write minimal implementation**

Create `src/services/productService.ts`:

```typescript
import { productRepository } from '../repositories/productRepository.js';
import type { Product, CreateProductInput, UpdateProductInput, ErrorCode } from '../types.js';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode: ErrorCode
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const productService = {
  async createProduct(
    input: CreateProductInput,
    repo = productRepository
  ): Promise<Product> {
    return repo.create(input);
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/productService.test.ts
```

Expected: PASS

- [ ] **Step 5: Write failing test for negative price validation**

Add to `tests/productService.test.ts`:

```typescript
test('throws error for negative price', async () => {
  const mockRepo = createMockProductRepo();
  const input: CreateProductInput = {
    name: 'Espresso',
    price: -2.50,
  };
  
  const { productService } = await import('../src/services/productService.js');
  
  expect(async () => {
    await productService.createProduct(input, mockRepo);
  }).toThrow('Price must be greater than or equal to 0');
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
bun test tests/productService.test.ts
```

Expected: FAIL (test expects error but none thrown)

- [ ] **Step 7: Add validation to createProduct**

Update `src/services/productService.ts`:

```typescript
export const productService = {
  async createProduct(
    input: CreateProductInput,
    repo = productRepository
  ): Promise<Product> {
    if (!input.name || input.name.trim() === '') {
      throw new AppError('Product name is required', 400, 'INVALID_INPUT');
    }
    if (input.price < 0) {
      throw new AppError('Price must be greater than or equal to 0', 400, 'INVALID_INPUT');
    }
    return repo.create(input);
  },
};
```

- [ ] **Step 8: Run test to verify it passes**

```bash
bun test tests/productService.test.ts
```

Expected: PASS

- [ ] **Step 9: Write tests for getProduct**

Add to `tests/productService.test.ts`:

```typescript
describe('getProduct', () => {
  test('returns product when found', async () => {
    const mockRepo = createMockProductRepo();
    const expectedProduct: Product = {
      id: 1,
      name: 'Espresso',
      description: 'Strong coffee',
      price: 2.50,
      available: true,
      created_at: new Date(),
    };
    
    mockRepo.findById.mockResolvedValue(expectedProduct);
    
    const { productService } = await import('../src/services/productService.js');
    const result = await productService.getProduct(1, mockRepo);
    
    expect(result).toEqual(expectedProduct);
    expect(mockRepo.findById).toHaveBeenCalledWith(1);
  });

  test('throws error when product not found', async () => {
    const mockRepo = createMockProductRepo();
    mockRepo.findById.mockResolvedValue(null);
    
    const { productService } = await import('../src/services/productService.js');
    
    expect(async () => {
      await productService.getProduct(999, mockRepo);
    }).toThrow('Product with id 999 not found');
  });
});
```

- [ ] **Step 10: Run tests to verify they fail**

```bash
bun test tests/productService.test.ts
```

Expected: FAIL (getProduct method doesn't exist)

- [ ] **Step 11: Implement getProduct**

Update `src/services/productService.ts`:

```typescript
export const productService = {
  async createProduct(
    input: CreateProductInput,
    repo = productRepository
  ): Promise<Product> {
    if (!input.name || input.name.trim() === '') {
      throw new AppError('Product name is required', 400, 'INVALID_INPUT');
    }
    if (input.price < 0) {
      throw new AppError('Price must be greater than or equal to 0', 400, 'INVALID_INPUT');
    }
    return repo.create(input);
  },

  async getProduct(id: number, repo = productRepository): Promise<Product> {
    const product = await repo.findById(id);
    if (!product) {
      throw new AppError(`Product with id ${id} not found`, 404, 'PRODUCT_NOT_FOUND');
    }
    return product;
  },
};
```

- [ ] **Step 12: Run tests to verify they pass**

```bash
bun test tests/productService.test.ts
```

Expected: PASS

- [ ] **Step 13: Write tests for getAllProducts, updateProduct, deleteProduct**

Add to `tests/productService.test.ts`:

```typescript
describe('getAllProducts', () => {
  test('returns all products', async () => {
    const mockRepo = createMockProductRepo();
    const expectedProducts: Product[] = [
      {
        id: 1,
        name: 'Espresso',
        description: 'Strong coffee',
        price: 2.50,
        available: true,
        created_at: new Date(),
      },
    ];
    
    mockRepo.findAll.mockResolvedValue(expectedProducts);
    
    const { productService } = await import('../src/services/productService.js');
    const result = await productService.getAllProducts(mockRepo);
    
    expect(result).toEqual(expectedProducts);
    expect(mockRepo.findAll).toHaveBeenCalled();
  });
});

describe('updateProduct', () => {
  test('updates product successfully', async () => {
    const mockRepo = createMockProductRepo();
    const updatedProduct: Product = {
      id: 1,
      name: 'Americano',
      description: 'Diluted espresso',
      price: 3.00,
      available: true,
      created_at: new Date(),
    };
    
    mockRepo.update.mockResolvedValue(updatedProduct);
    
    const { productService } = await import('../src/services/productService.js');
    const result = await productService.updateProduct(1, { name: 'Americano', price: 3.00 }, mockRepo);
    
    expect(result).toEqual(updatedProduct);
    expect(mockRepo.update).toHaveBeenCalledWith(1, { name: 'Americano', price: 3.00 });
  });

  test('throws error when product not found', async () => {
    const mockRepo = createMockProductRepo();
    mockRepo.update.mockResolvedValue(null);
    
    const { productService } = await import('../src/services/productService.js');
    
    expect(async () => {
      await productService.updateProduct(999, { price: 3.00 }, mockRepo);
    }).toThrow('Product with id 999 not found');
  });
});

describe('deleteProduct', () => {
  test('deletes product successfully', async () => {
    const mockRepo = createMockProductRepo();
    mockRepo.delete.mockResolvedValue(true);
    
    const { productService } = await import('../src/services/productService.js');
    await productService.deleteProduct(1, mockRepo);
    
    expect(mockRepo.delete).toHaveBeenCalledWith(1);
  });

  test('throws error when product not found', async () => {
    const mockRepo = createMockProductRepo();
    mockRepo.delete.mockResolvedValue(false);
    
    const { productService } = await import('../src/services/productService.js');
    
    expect(async () => {
      await productService.deleteProduct(999, mockRepo);
    }).toThrow('Product with id 999 not found');
  });
});
```

- [ ] **Step 14: Run tests to verify they fail**

```bash
bun test tests/productService.test.ts
```

Expected: FAIL (methods don't exist)

- [ ] **Step 15: Implement remaining methods**

Update `src/services/productService.ts`:

```typescript
import { productRepository } from '../repositories/productRepository.js';
import type { Product, CreateProductInput, UpdateProductInput, ErrorCode } from '../types.js';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode: ErrorCode
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const productService = {
  async createProduct(
    input: CreateProductInput,
    repo = productRepository
  ): Promise<Product> {
    if (!input.name || input.name.trim() === '') {
      throw new AppError('Product name is required', 400, 'INVALID_INPUT');
    }
    if (input.price < 0) {
      throw new AppError('Price must be greater than or equal to 0', 400, 'INVALID_INPUT');
    }
    return repo.create(input);
  },

  async getProduct(id: number, repo = productRepository): Promise<Product> {
    const product = await repo.findById(id);
    if (!product) {
      throw new AppError(`Product with id ${id} not found`, 404, 'PRODUCT_NOT_FOUND');
    }
    return product;
  },

  async getAllProducts(repo = productRepository): Promise<Product[]> {
    return repo.findAll();
  },

  async updateProduct(
    id: number,
    input: UpdateProductInput,
    repo = productRepository
  ): Promise<Product> {
    if (input.price !== undefined && input.price < 0) {
      throw new AppError('Price must be greater than or equal to 0', 400, 'INVALID_INPUT');
    }
    const product = await repo.update(id, input);
    if (!product) {
      throw new AppError(`Product with id ${id} not found`, 404, 'PRODUCT_NOT_FOUND');
    }
    return product;
  },

  async deleteProduct(id: number, repo = productRepository): Promise<void> {
    const deleted = await repo.delete(id);
    if (!deleted) {
      throw new AppError(`Product with id ${id} not found`, 404, 'PRODUCT_NOT_FOUND');
    }
  },
};
```

- [ ] **Step 16: Run tests to verify they pass**

```bash
bun test tests/productService.test.ts
```

Expected: All tests PASS

- [ ] **Step 17: Commit product service with tests**

```bash
git add src/services/productService.ts tests/productService.test.ts
git commit -m "feat: add product service with unit tests"
```

---

## Task 4: Order Repository

**Files:**
- Create: `src/repositories/orderRepository.ts`

- [ ] **Step 1: Create order repository**

Create `src/repositories/orderRepository.ts`:

```typescript
import { sql } from '../db/connection.js';
import type { Order, OrderItem, OrderWithItems, CreateOrderInput } from '../types.js';

export const orderRepository = {
  async findAll(): Promise<Order[]> {
    const rows = await sql<Order[]>`
      SELECT id, customer_name, status, total, created_at
      FROM orders
      ORDER BY created_at DESC
    `;
    return rows;
  },

  async findById(id: number): Promise<OrderWithItems | null> {
    const orderRows = await sql<Order[]>`
      SELECT id, customer_name, status, total, created_at
      FROM orders
      WHERE id = ${id}
    `;
    
    if (orderRows.length === 0) {
      return null;
    }
    
    const itemRows = await sql<OrderItem[]>`
      SELECT id, order_id, product_id, quantity, price_at_purchase
      FROM order_items
      WHERE order_id = ${id}
    `;
    
    return {
      ...orderRows[0],
      items: itemRows,
    };
  },

  async create(input: CreateOrderInput, items: Array<{ product_id: number; quantity: number; price: number }>): Promise<OrderWithItems> {
    return await sql.begin(async (transaction) => {
      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const orderRows = await transaction<Order[]>`
        INSERT INTO orders (customer_name, status, total)
        VALUES (${input.customer_name}, 'pending', ${total})
        RETURNING id, customer_name, status, total, created_at
      `;
      
      const order = orderRows[0];
      const orderItems: OrderItem[] = [];
      
      for (const item of items) {
        const itemRows = await transaction<OrderItem[]>`
          INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
          VALUES (${order.id}, ${item.product_id}, ${item.quantity}, ${item.price})
          RETURNING id, order_id, product_id, quantity, price_at_purchase
        `;
        orderItems.push(itemRows[0]);
      }
      
      return {
        ...order,
        items: orderItems,
      };
    });
  },

  async updateStatus(id: number, status: 'pending' | 'completed' | 'cancelled'): Promise<Order | null> {
    const rows = await sql<Order[]>`
      UPDATE orders
      SET status = ${status}
      WHERE id = ${id}
      RETURNING id, customer_name, status, total, created_at
    `;
    return rows[0] || null;
  },
};
```

- [ ] **Step 2: Commit order repository**

```bash
git add src/repositories/orderRepository.ts
git commit -m "feat: add order repository with transaction support"
```

---

## Task 5: Order Service with Tests (TDD)

**Files:**
- Create: `tests/orderService.test.ts`
- Create: `src/services/orderService.ts`

- [ ] **Step 1: Write failing test for create order with valid items**

Create `tests/orderService.test.ts`:

```typescript
import { describe, test, expect, mock, beforeEach } from 'bun:test';
import type { OrderWithItems, CreateOrderInput, Product } from '../src/types.js';

const createMockOrderRepo = () => ({
  findAll: mock(() => Promise.resolve([])),
  findById: mock(() => Promise.resolve(null)),
  create: mock(() => Promise.resolve({} as OrderWithItems)),
  updateStatus: mock(() => Promise.resolve(null)),
});

const createMockProductRepo = () => ({
  findById: mock(() => Promise.resolve(null)),
});

describe('orderService', () => {
  describe('createOrder', () => {
    test('creates order with valid items and calculates total correctly', async () => {
      const mockOrderRepo = createMockOrderRepo();
      const mockProductRepo = createMockProductRepo();
      
      const product1: Product = {
        id: 1,
        name: 'Espresso',
        description: '',
        price: 2.50,
        available: true,
        created_at: new Date(),
      };
      
      const product2: Product = {
        id: 2,
        name: 'Latte',
        description: '',
        price: 3.50,
        available: true,
        created_at: new Date(),
      };
      
      mockProductRepo.findById.mockImplementation((id: number) => {
        if (id === 1) return Promise.resolve(product1);
        if (id === 2) return Promise.resolve(product2);
        return Promise.resolve(null);
      });
      
      const input: CreateOrderInput = {
        customer_name: 'Alice',
        items: [
          { product_id: 1, quantity: 2 },
          { product_id: 2, quantity: 1 },
        ],
      };
      
      const expectedOrder: OrderWithItems = {
        id: 1,
        customer_name: 'Alice',
        status: 'pending',
        total: 8.50, // (2.50 * 2) + (3.50 * 1)
        created_at: new Date(),
        items: [
          { id: 1, order_id: 1, product_id: 1, quantity: 2, price_at_purchase: 2.50 },
          { id: 2, order_id: 1, product_id: 2, quantity: 1, price_at_purchase: 3.50 },
        ],
      };
      
      mockOrderRepo.create.mockResolvedValue(expectedOrder);
      
      // Service doesn't exist yet - this will fail
      const { orderService } = await import('../src/services/orderService.js');
      const result = await orderService.createOrder(input, mockOrderRepo, mockProductRepo);
      
      expect(result.total).toBe(8.50);
      expect(mockProductRepo.findById).toHaveBeenCalledTimes(2);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/orderService.test.ts
```

Expected: FAIL with "Cannot find module '../src/services/orderService.js'"

- [ ] **Step 3: Write minimal implementation**

Create `src/services/orderService.ts`:

```typescript
import { orderRepository } from '../repositories/orderRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import type { OrderWithItems, Order, CreateOrderInput, UpdateOrderStatusInput } from '../types.js';
import { AppError } from './productService.js';

export const orderService = {
  async createOrder(
    input: CreateOrderInput,
    orderRepo = orderRepository,
    productRepo = productRepository
  ): Promise<OrderWithItems> {
    if (!input.customer_name || input.customer_name.trim() === '') {
      throw new AppError('Customer name is required', 400, 'INVALID_INPUT');
    }
    
    if (!input.items || input.items.length === 0) {
      throw new AppError('Order must contain at least one item', 400, 'INVALID_INPUT');
    }
    
    const itemsWithPrices = [];
    
    for (const item of input.items) {
      if (item.quantity <= 0) {
        throw new AppError('Item quantity must be greater than 0', 400, 'INVALID_INPUT');
      }
      
      const product = await productRepo.findById(item.product_id);
      
      if (!product) {
        throw new AppError(`Product with id ${item.product_id} not found`, 404, 'PRODUCT_NOT_FOUND');
      }
      
      if (!product.available) {
        throw new AppError(`Product ${product.name} is not available`, 400, 'INSUFFICIENT_STOCK');
      }
      
      itemsWithPrices.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price: product.price,
      });
    }
    
    return orderRepo.create(input, itemsWithPrices);
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/orderService.test.ts
```

Expected: PASS

- [ ] **Step 5: Write failing test for invalid product_id**

Add to `tests/orderService.test.ts`:

```typescript
test('throws error for invalid product_id', async () => {
  const mockOrderRepo = createMockOrderRepo();
  const mockProductRepo = createMockProductRepo();
  
  mockProductRepo.findById.mockResolvedValue(null);
  
  const input: CreateOrderInput = {
    customer_name: 'Bob',
    items: [{ product_id: 999, quantity: 1 }],
  };
  
  const { orderService } = await import('../src/services/orderService.js');
  
  expect(async () => {
    await orderService.createOrder(input, mockOrderRepo, mockProductRepo);
  }).toThrow('Product with id 999 not found');
});
```

- [ ] **Step 6: Run test to verify it passes**

```bash
bun test tests/orderService.test.ts
```

Expected: PASS (validation already implemented)

- [ ] **Step 7: Write failing test for zero quantity**

Add to `tests/orderService.test.ts`:

```typescript
test('throws error for zero quantity', async () => {
  const mockOrderRepo = createMockOrderRepo();
  const mockProductRepo = createMockProductRepo();
  
  const input: CreateOrderInput = {
    customer_name: 'Charlie',
    items: [{ product_id: 1, quantity: 0 }],
  };
  
  const { orderService } = await import('../src/services/orderService.js');
  
  expect(async () => {
    await orderService.createOrder(input, mockOrderRepo, mockProductRepo);
  }).toThrow('Item quantity must be greater than 0');
});
```

- [ ] **Step 8: Run test to verify it passes**

```bash
bun test tests/orderService.test.ts
```

Expected: PASS (validation already implemented)

- [ ] **Step 9: Write tests for getOrder, getAllOrders, updateOrderStatus**

Add to `tests/orderService.test.ts`:

```typescript
describe('getOrder', () => {
  test('returns order with items when found', async () => {
    const mockOrderRepo = createMockOrderRepo();
    const mockProductRepo = createMockProductRepo();
    
    const expectedOrder: OrderWithItems = {
      id: 1,
      customer_name: 'Alice',
      status: 'pending',
      total: 5.00,
      created_at: new Date(),
      items: [
        { id: 1, order_id: 1, product_id: 1, quantity: 2, price_at_purchase: 2.50 },
      ],
    };
    
    mockOrderRepo.findById.mockResolvedValue(expectedOrder);
    
    const { orderService } = await import('../src/services/orderService.js');
    const result = await orderService.getOrder(1, mockOrderRepo);
    
    expect(result).toEqual(expectedOrder);
    expect(mockOrderRepo.findById).toHaveBeenCalledWith(1);
  });

  test('throws error when order not found', async () => {
    const mockOrderRepo = createMockOrderRepo();
    const mockProductRepo = createMockProductRepo();
    
    mockOrderRepo.findById.mockResolvedValue(null);
    
    const { orderService } = await import('../src/services/orderService.js');
    
    expect(async () => {
      await orderService.getOrder(999, mockOrderRepo);
    }).toThrow('Order with id 999 not found');
  });
});

describe('getAllOrders', () => {
  test('returns all orders', async () => {
    const mockOrderRepo = createMockOrderRepo();
    const mockProductRepo = createMockProductRepo();
    
    const expectedOrders: Order[] = [
      {
        id: 1,
        customer_name: 'Alice',
        status: 'pending',
        total: 5.00,
        created_at: new Date(),
      },
    ];
    
    mockOrderRepo.findAll.mockResolvedValue(expectedOrders);
    
    const { orderService } = await import('../src/services/orderService.js');
    const result = await orderService.getAllOrders(mockOrderRepo);
    
    expect(result).toEqual(expectedOrders);
    expect(mockOrderRepo.findAll).toHaveBeenCalled();
  });
});

describe('updateOrderStatus', () => {
  test('updates status with valid value', async () => {
    const mockOrderRepo = createMockOrderRepo();
    const mockProductRepo = createMockProductRepo();
    
    const updatedOrder: Order = {
      id: 1,
      customer_name: 'Alice',
      status: 'completed',
      total: 5.00,
      created_at: new Date(),
    };
    
    mockOrderRepo.updateStatus.mockResolvedValue(updatedOrder);
    
    const { orderService } = await import('../src/services/orderService.js');
    const result = await orderService.updateOrderStatus(1, { status: 'completed' }, mockOrderRepo);
    
    expect(result.status).toBe('completed');
    expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith(1, 'completed');
  });

  test('throws error when order not found', async () => {
    const mockOrderRepo = createMockOrderRepo();
    const mockProductRepo = createMockProductRepo();
    
    mockOrderRepo.updateStatus.mockResolvedValue(null);
    
    const { orderService } = await import('../src/services/orderService.js');
    
    expect(async () => {
      await orderService.updateOrderStatus(999, { status: 'completed' }, mockOrderRepo);
    }).toThrow('Order with id 999 not found');
  });

  test('throws error for invalid status', async () => {
    const mockOrderRepo = createMockOrderRepo();
    const mockProductRepo = createMockProductRepo();
    
    const { orderService } = await import('../src/services/orderService.js');
    
    expect(async () => {
      await orderService.updateOrderStatus(1, { status: 'invalid' as any }, mockOrderRepo);
    }).toThrow('Invalid status');
  });
});
```

- [ ] **Step 10: Run tests to verify they fail**

```bash
bun test tests/orderService.test.ts
```

Expected: FAIL (methods don't exist)

- [ ] **Step 11: Implement remaining methods**

Update `src/services/orderService.ts`:

```typescript
import { orderRepository } from '../repositories/orderRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import type { OrderWithItems, Order, CreateOrderInput, UpdateOrderStatusInput } from '../types.js';
import { AppError } from './productService.js';

const VALID_STATUSES = ['pending', 'completed', 'cancelled'] as const;

export const orderService = {
  async createOrder(
    input: CreateOrderInput,
    orderRepo = orderRepository,
    productRepo = productRepository
  ): Promise<OrderWithItems> {
    if (!input.customer_name || input.customer_name.trim() === '') {
      throw new AppError('Customer name is required', 400, 'INVALID_INPUT');
    }
    
    if (!input.items || input.items.length === 0) {
      throw new AppError('Order must contain at least one item', 400, 'INVALID_INPUT');
    }
    
    const itemsWithPrices = [];
    
    for (const item of input.items) {
      if (item.quantity <= 0) {
        throw new AppError('Item quantity must be greater than 0', 400, 'INVALID_INPUT');
      }
      
      const product = await productRepo.findById(item.product_id);
      
      if (!product) {
        throw new AppError(`Product with id ${item.product_id} not found`, 404, 'PRODUCT_NOT_FOUND');
      }
      
      if (!product.available) {
        throw new AppError(`Product ${product.name} is not available`, 400, 'INSUFFICIENT_STOCK');
      }
      
      itemsWithPrices.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price: product.price,
      });
    }
    
    return orderRepo.create(input, itemsWithPrices);
  },

  async getOrder(id: number, orderRepo = orderRepository): Promise<OrderWithItems> {
    const order = await orderRepo.findById(id);
    if (!order) {
      throw new AppError(`Order with id ${id} not found`, 404, 'ORDER_NOT_FOUND');
    }
    return order;
  },

  async getAllOrders(orderRepo = orderRepository): Promise<Order[]> {
    return orderRepo.findAll();
  },

  async updateOrderStatus(
    id: number,
    input: UpdateOrderStatusInput,
    orderRepo = orderRepository
  ): Promise<Order> {
    if (!VALID_STATUSES.includes(input.status)) {
      throw new AppError('Invalid status', 400, 'INVALID_INPUT');
    }
    
    const order = await orderRepo.updateStatus(id, input.status);
    if (!order) {
      throw new AppError(`Order with id ${id} not found`, 404, 'ORDER_NOT_FOUND');
    }
    return order;
  },
};
```

- [ ] **Step 12: Run tests to verify they pass**

```bash
bun test tests/orderService.test.ts
```

Expected: All tests PASS

- [ ] **Step 13: Commit order service with tests**

```bash
git add src/services/orderService.ts tests/orderService.test.ts
git commit -m "feat: add order service with unit tests"
```

---

## Task 6: Product Routes

**Files:**
- Create: `src/routes/productRoutes.ts`

- [ ] **Step 1: Create product routes**

Create `src/routes/productRoutes.ts`:

```typescript
import { Hono } from 'hono';
import { productService } from '../services/productService.js';
import { AppError } from '../services/productService.js';
import type { CreateProductInput, UpdateProductInput } from '../types.js';

export const productRoutes = new Hono();

productRoutes.get('/', async (c) => {
  try {
    const products = await productService.getAllProducts();
    return c.json(products);
  } catch (error) {
    if (error instanceof AppError) {
      c.header('X-Error-Code', error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header('X-Error-Code', 'DATABASE_ERROR');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

productRoutes.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      c.header('X-Error-Code', 'INVALID_INPUT');
      return c.json({ error: 'Invalid product ID' }, 400);
    }
    
    const product = await productService.getProduct(id);
    return c.json(product);
  } catch (error) {
    if (error instanceof AppError) {
      c.header('X-Error-Code', error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header('X-Error-Code', 'DATABASE_ERROR');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

productRoutes.post('/', async (c) => {
  try {
    const input = await c.req.json<CreateProductInput>();
    const product = await productService.createProduct(input);
    return c.json(product, 201);
  } catch (error) {
    if (error instanceof AppError) {
      c.header('X-Error-Code', error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header('X-Error-Code', 'DATABASE_ERROR');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

productRoutes.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      c.header('X-Error-Code', 'INVALID_INPUT');
      return c.json({ error: 'Invalid product ID' }, 400);
    }
    
    const input = await c.req.json<UpdateProductInput>();
    const product = await productService.updateProduct(id, input);
    return c.json(product);
  } catch (error) {
    if (error instanceof AppError) {
      c.header('X-Error-Code', error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header('X-Error-Code', 'DATABASE_ERROR');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

productRoutes.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      c.header('X-Error-Code', 'INVALID_INPUT');
      return c.json({ error: 'Invalid product ID' }, 400);
    }
    
    await productService.deleteProduct(id);
    return c.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      c.header('X-Error-Code', error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header('X-Error-Code', 'DATABASE_ERROR');
    return c.json({ error: 'Internal server error' }, 500);
  }
});
```

- [ ] **Step 2: Commit product routes**

```bash
git add src/routes/productRoutes.ts
git commit -m "feat: add product routes with error handling"
```

---

## Task 7: Order Routes

**Files:**
- Create: `src/routes/orderRoutes.ts`

- [ ] **Step 1: Create order routes**

Create `src/routes/orderRoutes.ts`:

```typescript
import { Hono } from 'hono';
import { orderService } from '../services/orderService.js';
import { AppError } from '../services/productService.js';
import type { CreateOrderInput, UpdateOrderStatusInput } from '../types.js';

export const orderRoutes = new Hono();

orderRoutes.get('/', async (c) => {
  try {
    const orders = await orderService.getAllOrders();
    return c.json(orders);
  } catch (error) {
    if (error instanceof AppError) {
      c.header('X-Error-Code', error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header('X-Error-Code', 'DATABASE_ERROR');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

orderRoutes.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      c.header('X-Error-Code', 'INVALID_INPUT');
      return c.json({ error: 'Invalid order ID' }, 400);
    }
    
    const order = await orderService.getOrder(id);
    return c.json(order);
  } catch (error) {
    if (error instanceof AppError) {
      c.header('X-Error-Code', error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header('X-Error-Code', 'DATABASE_ERROR');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

orderRoutes.post('/', async (c) => {
  try {
    const input = await c.req.json<CreateOrderInput>();
    const order = await orderService.createOrder(input);
    return c.json(order, 201);
  } catch (error) {
    if (error instanceof AppError) {
      c.header('X-Error-Code', error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header('X-Error-Code', 'DATABASE_ERROR');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

orderRoutes.patch('/:id/status', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      c.header('X-Error-Code', 'INVALID_INPUT');
      return c.json({ error: 'Invalid order ID' }, 400);
    }
    
    const input = await c.req.json<UpdateOrderStatusInput>();
    const order = await orderService.updateOrderStatus(id, input);
    return c.json(order);
  } catch (error) {
    if (error instanceof AppError) {
      c.header('X-Error-Code', error.errorCode);
      return c.json({ error: error.message }, error.statusCode);
    }
    c.header('X-Error-Code', 'DATABASE_ERROR');
    return c.json({ error: 'Internal server error' }, 500);
  }
});
```

- [ ] **Step 2: Commit order routes**

```bash
git add src/routes/orderRoutes.ts
git commit -m "feat: add order routes with error handling"
```

---

## Task 8: Application Entry Point

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create application entry point**

Create `src/index.ts`:

```typescript
import { Hono } from 'hono';
import { testConnection } from './db/connection.js';
import { productRoutes } from './routes/productRoutes.js';
import { orderRoutes } from './routes/orderRoutes.js';

const app = new Hono();

// Health check
app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'Coffee Shop API' });
});

// Mount routes
app.route('/api/products', productRoutes);
app.route('/api/orders', orderRoutes);

// Test database connection on startup
await testConnection();

const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
```

- [ ] **Step 2: Test the application**

```bash
bun run dev
```

Expected: Server starts on port 3000, database connection successful

- [ ] **Step 3: Test health check endpoint**

Open another terminal:

```bash
curl http://localhost:3000/
```

Expected: `{"status":"ok","message":"Coffee Shop API"}`

- [ ] **Step 4: Stop the server**

Press `Ctrl+C` in the server terminal

- [ ] **Step 5: Commit application entry point**

```bash
git add src/index.ts
git commit -m "feat: add application entry point with route registration"
```

---

## Task 9: Manual Testing

**Files:**
- None (manual testing only)

- [ ] **Step 1: Start the server**

```bash
bun run dev
```

- [ ] **Step 2: Create a product**

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Espresso","description":"Strong coffee","price":2.50}'
```

Expected: Product created with id 1

- [ ] **Step 3: List all products**

```bash
curl http://localhost:3000/api/products
```

Expected: Array with Espresso product

- [ ] **Step 4: Create another product**

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Latte","description":"Milk coffee","price":3.50}'
```

Expected: Product created with id 2

- [ ] **Step 5: Create an order**

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_name":"Alice","items":[{"product_id":1,"quantity":2},{"product_id":2,"quantity":1}]}'
```

Expected: Order created with total 8.50 (2.50 * 2 + 3.50 * 1)

- [ ] **Step 6: Get order details**

```bash
curl http://localhost:3000/api/orders/1
```

Expected: Order with items array

- [ ] **Step 7: Update order status**

```bash
curl -X PATCH http://localhost:3000/api/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

Expected: Order status updated to "completed"

- [ ] **Step 8: Test error handling - invalid product**

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_name":"Bob","items":[{"product_id":999,"quantity":1}]}'
```

Expected: 404 with `X-Error-Code: PRODUCT_NOT_FOUND` header

- [ ] **Step 9: Test error handling - negative price**

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Invalid","price":-5}'
```

Expected: 400 with `X-Error-Code: INVALID_INPUT` header

- [ ] **Step 10: Verify error header is present**

```bash
curl -I -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Invalid","price":-5}'
```

Expected: Response headers include `X-Error-Code: INVALID_INPUT`

---

## Task 10: Final Documentation and Cleanup

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README with examples**

Update `README.md` to add example requests section:

```markdown
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
```
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
```

- [ ] **Step 2: Run all tests**

```bash
bun test
```

Expected: All tests pass

- [ ] **Step 3: Commit final documentation**

```bash
git add README.md
git commit -m "docs: add API examples and error handling documentation"
```

- [ ] **Step 4: Create git tag**

```bash
git tag -a v1.0.0 -m "Release v1.0.0 - Coffee Shop API MVP"
```

---

## Self-Review Checklist

**Spec Coverage:**
- ✓ Products CRUD (Task 2, 3, 6)
- ✓ Orders CRUD (Task 4, 5, 7)
- ✓ Error handling with X-Error-Code header (Task 6, 7)
- ✓ Database transactions for orders (Task 4)
- ✓ Unit tests for services (Task 3, 5)
- ✓ PostgreSQL + Podman setup (Task 0, 1)
- ✓ Layered architecture (All tasks)

**No Placeholders:**
- All code blocks complete
- All file paths specified
- All test cases included
- All commands with expected output

**Type Consistency:**
- Product, Order, OrderItem interfaces defined in types.ts
- Used consistently across all files
- Repository/service method signatures match

**Implementation Complete:**
- All endpoints from spec implemented
- All validation rules implemented
- All error codes defined and used
- Transaction handling for order creation

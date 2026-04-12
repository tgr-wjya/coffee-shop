# Drizzle ORM Build-Along Guide

This guide uses a plant nursery example so you can learn the same database patterns without staring at the exact solution for your assignment.

You are practicing:

- schema definitions
- migrations
- parent-child inserts
- snapshot pricing
- filtered reads
- manual joins
- transactions
- aggregation

## Use Services for DB Work

Keep handlers thin:

1. read params, query strings, or body input
2. call a service method
3. return the HTTP response

Put Drizzle work in service classes:

1. read related rows
2. run inserts, updates, joins, and transactions
3. shape joined rows into the response object

Example:

```ts
const plantService = new PlantService(db);
const purchaseService = new PurchaseService(db);
```

## Project Shape

```txt
src/
  app.ts
  db/
    index.ts
    schema.ts
  services/
    plant-service.ts
    purchase-service.ts
drizzle.config.ts
.env
```

## PostgreSQL Setup

Install the PostgreSQL driver:

```bash
bun add drizzle-orm postgres
bun add -d drizzle-kit
```

`.env`:

```txt
DATABASE_URL=postgres://user:password@localhost:5432/plant_nursery
```

`drizzle.config.ts`:

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

`src/db/index.ts`:

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);

export const db = drizzle(client);

export type AppDb = typeof db;
```

## Example Domain

The nursery example uses the same kind of backend pattern without matching your assignment names:

- `plants` = catalog table
- `purchases` = parent transaction table
- `purchase_items` = line items
- `unit_price` = price captured at the time of purchase

## Schema

```ts
import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const plantCategory = pgEnum("plant_category", ["indoor", "outdoor"]);
export const purchaseStatus = pgEnum("purchase_status", [
  "open",
  "packed",
  "completed",
  "voided",
]);

export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2, mode: "number" }).notNull(),
  category: plantCategory("category").notNull(),
  inStock: boolean("in_stock").notNull().default(true),
});

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  buyerName: text("buyer_name").notNull(),
  status: purchaseStatus("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id")
    .notNull()
    .references(() => purchases.id),
  plantId: integer("plant_id")
    .notNull()
    .references(() => plants.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", {
    precision: 10,
    scale: 2,
    mode: "number",
  }).notNull(),
});
```

Notes worth keeping:

- PostgreSQL has real `boolean`, so use `boolean("in_stock")` for true/false fields.
- `pgEnum()` creates a database enum, not only a TypeScript hint.
- `numeric(..., { mode: "number" })` is convenient for this learning project. In production, be stricter with money handling.
- `unitPrice` stores the purchase-time price. Do not calculate old purchase totals from the current catalog price.

## Type Inference

```ts
type NewPlant = typeof plants.$inferInsert;
type Plant = typeof plants.$inferSelect;
```

## Migrations

After changing `src/db/schema.ts`:

```bash
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

Generate creates SQL migration files. Migrate applies them to the database.

## Insert One Catalog Row

```ts
type CreatePlantInput = {
  name: string;
  price: number;
  category: "indoor" | "outdoor";
  inStock?: boolean;
};

export class PlantService {
  constructor(private readonly db: AppDb) {}

  async createPlant(input: CreatePlantInput) {
    const [plant] = await this.db
      .insert(plants)
      .values({
        name: input.name,
        price: input.price,
        category: input.category,
        inStock: input.inStock ?? true,
      })
      .returning();

    return plant;
  }
}
```

## Insert Parent Then Child Rows

For a purchase:

1. fetch current plant prices
2. create the parent purchase
3. insert `purchase_items` with the new purchase ID
4. copy the fetched plant price into `unitPrice`

Wrap that in a transaction:

```ts
type CreatePurchaseInput = {
  buyerName: string;
  items: Array<{ plantId: number; quantity: number }>;
};

export class PurchaseService {
  constructor(private readonly db: AppDb) {}

  async createPurchase(input: CreatePurchaseInput) {
    return this.db.transaction(async (tx) => {
      const [purchase] = await tx
        .insert(purchases)
        .values({
          buyerName: input.buyerName,
          status: "open",
        })
        .returning();

      await tx.insert(purchaseItems).values([
        {
          purchaseId: purchase.id,
          plantId: 1,
          quantity: 2,
          unitPrice: 18.5,
        },
      ]);

      return purchase;
    });
  }
}
```

If the item insert fails, the parent purchase is rolled back too.

## Select All

```ts
export class PlantService {
  constructor(private readonly db: AppDb) {}

  async listPlants() {
    return this.db.select().from(plants);
  }
}
```

## Filter With One Condition

```ts
import { eq } from "drizzle-orm";

export class PlantService {
  constructor(private readonly db: AppDb) {}

  async listIndoorPlants() {
    return this.db
      .select()
      .from(plants)
      .where(eq(plants.category, "indoor"));
  }
}
```

## Compose Optional Filters

```ts
import { and, eq, type SQL } from "drizzle-orm";

export class PlantService {
  constructor(private readonly db: AppDb) {}

  async listPlants(filters: {
    category?: "indoor" | "outdoor";
    inStock?: boolean;
  }) {
    const conditions: SQL[] = [];

    if (filters.category) {
      conditions.push(eq(plants.category, filters.category));
    }

    if (typeof filters.inStock === "boolean") {
      conditions.push(eq(plants.inStock, filters.inStock));
    }

    const query = this.db.select().from(plants);

    return conditions.length > 0
      ? query.where(and(...conditions))
      : query;
  }
}
```

## Manual Join

```ts
import { eq } from "drizzle-orm";

export class PurchaseService {
  constructor(private readonly db: AppDb) {}

  async getPurchaseDetailRows(purchaseId: number) {
    return this.db
      .select({
        purchaseId: purchases.id,
        buyerName: purchases.buyerName,
        status: purchases.status,
        createdAt: purchases.createdAt,
        itemId: purchaseItems.id,
        quantity: purchaseItems.quantity,
        unitPrice: purchaseItems.unitPrice,
        plantId: plants.id,
        plantName: plants.name,
        plantCategory: plants.category,
      })
      .from(purchases)
      .innerJoin(purchaseItems, eq(purchaseItems.purchaseId, purchases.id))
      .innerJoin(plants, eq(plants.id, purchaseItems.plantId))
      .where(eq(purchases.id, purchaseId));
  }
}
```

## Shape Join Rows

```ts
export class PurchaseService {
  constructor(private readonly db: AppDb) {}

  async getPurchaseDetail(purchaseId: number) {
    const rows = await this.getPurchaseDetailRows(purchaseId);
    const first = rows[0];

    if (!first) {
      return null;
    }

    return {
      id: first.purchaseId,
      buyerName: first.buyerName,
      status: first.status,
      createdAt: first.createdAt,
      items: rows.map((row) => ({
        id: row.itemId,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        plant: {
          id: row.plantId,
          name: row.plantName,
          category: row.plantCategory,
        },
      })),
    };
  }
}
```

## Updates

```ts
import { eq } from "drizzle-orm";

export class PlantService {
  constructor(private readonly db: AppDb) {}

  async updatePlant(
    plantId: number,
    patch: { price?: number; inStock?: boolean },
  ) {
    const [plant] = await this.db
      .update(plants)
      .set(patch)
      .where(eq(plants.id, plantId))
      .returning();

    return plant ?? null;
  }
}
```

```ts
export class PurchaseService {
  constructor(private readonly db: AppDb) {}

  async updatePurchaseStatus(
    purchaseId: number,
    status: "open" | "packed" | "completed" | "voided",
  ) {
    const [purchase] = await this.db
      .update(purchases)
      .set({ status })
      .where(eq(purchases.id, purchaseId))
      .returning();

    return purchase ?? null;
  }
}
```

## Delete

```ts
await db.delete(plants).where(eq(plants.id, 1));
```

Foreign keys can block parent deletes if child rows still reference that parent.

## Aggregate With `groupBy()`

```ts
import { eq, sql } from "drizzle-orm";

const revenueByPlant = await db
  .select({
    plantId: plants.id,
    plantName: plants.name,
    totalRevenue: sql<number>`sum(${purchaseItems.quantity} * ${purchaseItems.unitPrice})`,
  })
  .from(purchaseItems)
  .innerJoin(plants, eq(plants.id, purchaseItems.plantId))
  .groupBy(plants.id, plants.name);
```

## Pitfalls

1. Insert the parent row before child rows.
2. Store purchase-time price in `unitPrice`.
3. Wrap multi-step writes in a transaction.
4. Shape join rows before returning nested API responses.
5. Defaults only apply when a field is omitted. They do not replace validation.

## Cheat Sheet

```ts
// insert
await db.insert(plants).values({ name: "Pothos", price: 12, category: "indoor" });

// select
await db.select().from(plants);

// filter
await db.select().from(plants).where(eq(plants.category, "indoor"));

// update
await db.update(plants).set({ inStock: false }).where(eq(plants.id, 1));

// delete
await db.delete(plants).where(eq(plants.id, 1));

// join
await db
  .select()
  .from(purchases)
  .innerJoin(purchaseItems, eq(purchaseItems.purchaseId, purchases.id));

// transaction
await db.transaction(async (tx) => {
  // dependent writes
});

// aggregate
await db
  .select({ count: sql<number>`count(*)` })
  .from(plants);
```

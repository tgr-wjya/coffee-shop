# Drizzle ORM Build-Along Guide

## Why This Guide Exists

You are using Drizzle for a coffee shop API, but this guide deliberately avoids that exact domain.

If the examples matched your real schema one-to-one, you would mostly be copying shapes instead of learning how to model them yourself. So this guide uses a different domain with the same important patterns:

- parent-child relationships
- snapshot pricing
- filtered reads
- manual joins
- transactional multi-step writes
- aggregation

The example domain here is a **plant nursery checkout** system.

## Use Drizzle Through Service Classes, Not Fat Handlers

Since you prefer a class-based service layer, this guide is written with that structure in mind.

The rule of thumb is:

- handlers deal with HTTP
- service classes deal with use cases
- Drizzle queries live in service methods

That means a route handler should usually do only this:

1. read params, query strings, or body input
2. call a method on a service instance
3. translate the service result into an HTTP response

The service class should usually do this:

1. validate business assumptions that depend on DB state
2. fetch related rows
3. run inserts, updates, joins, and transactions
4. shape the result the handler needs

That structure prepares you much better for real backend work than putting all queries directly in each endpoint.

It also gives you explicit constructor-based dependency injection, which is useful when a service needs `db`, a logger, config, or collaborating services.

## What Drizzle Is Doing in This Stack

In this Bun + SQLite setup, Drizzle gives you four big things:

- a schema defined in TypeScript instead of handwritten SQL scattered everywhere
- type-safe query building
- migrations for changing your schema over time
- a thin layer over SQL, not a magical abstraction that hides the database

That last point matters. Drizzle is closest in spirit to writing SQL with strong TypeScript support. It does not try to pretend relational data is an object graph with zero tradeoffs.

## The Mental Model

When using Drizzle in a project like this, think in four parts:

### 1. Schema

You describe your tables, columns, defaults, and foreign keys in TypeScript.

### 2. Migrations

When the schema changes, you generate a migration and apply it to the database.

### 3. Queries

You use Drizzle to `insert`, `select`, `update`, `delete`, join tables, and aggregate values.

### 4. Transactions

If a flow takes multiple DB steps that must succeed or fail together, wrap them in a transaction.

That is most of what you need for a project like yours.

## Setup Shape in a Bun Project

You already have the right kind of setup in this repo:

- a Drizzle config file
- a schema file
- Bun as the runtime
- SQLite as the database

The typical files you care about are:

```txt
drizzle.config.ts
src/db/schema.ts
src/db/index.ts   // optional, for DB client setup
src/services/
.env
```

Drizzle config usually points to:

- where the schema lives
- where migrations are generated
- what dialect you use
- which database file to connect to

Typical config:

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_FILE_NAME!,
  },
});
```

This does not create tables by itself. It tells `drizzle-kit` where to read schema definitions and where to place generated migration files.

## Suggested Project Shape for Service-Based ORM Usage

You do not need a huge architecture, just enough separation to keep concerns clean.

One practical structure is:

```txt
src/
  app.ts
  db/
    index.ts
    schema.ts
  services/
    plant-service.ts
    purchase-service.ts
```

Think of the responsibilities like this:

- `app.ts`
  - declares routes
  - reads HTTP input
  - creates or receives service instances
  - calls service methods
- `db/index.ts`
  - exports the Drizzle client
- `db/schema.ts`
  - exports tables and schema-related constants
- `services/*.ts`
  - exports service classes
  - contains Drizzle queries in methods
  - handles transactions
  - shapes joined data into response-friendly objects

If you keep this separation, learning Drizzle becomes much easier because each query has a clear home.

One practical pattern is:

```ts
const plantService = new PlantService(db);
const purchaseService = new PurchaseService(db);
```

Then the handlers call methods on those instances instead of importing a pile of query helpers.

## The Example Domain

We will model a plant nursery system with three tables:

- `plants`
- `purchases`
- `purchase_items`

This is structurally useful because it mirrors the exact kinds of questions you need to answer in your actual project:

- a catalog table
- a parent transaction table
- a child detail table
- a price snapshot field

## Schema Walkthrough

Here is a practical schema:

```ts
import {
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const plantCategories = ["indoor", "outdoor"] as const;
export const purchaseStatuses = ["open", "packed", "completed", "voided"] as const;

export const plants = sqliteTable("plants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  price: real("price").notNull(),
  category: text("category", { enum: plantCategories }).notNull(),
  inStock: integer("in_stock", { mode: "boolean" }).notNull().default(true),
});

export const purchases = sqliteTable("purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  buyerName: text("buyer_name").notNull(),
  status: text("status", { enum: purchaseStatuses }).notNull().default("open"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const purchaseItems = sqliteTable("purchase_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  purchaseId: integer("purchase_id")
    .notNull()
    .references(() => purchases.id),
  plantId: integer("plant_id")
    .notNull()
    .references(() => plants.id),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
});
```

### Why these choices matter

#### `integer(..., { mode: "boolean" })`

SQLite does not have a real boolean type. Under the hood it stores booleans as integers, usually `0` and `1`.

Drizzle can map that to TypeScript booleans for you:

```ts
integer("in_stock", { mode: "boolean" })
```

Use this when you want boolean behavior but are on SQLite.

#### `text(..., { enum: [...] })`

SQLite also does not have native enums like PostgreSQL.

In Drizzle, a common SQLite pattern is to store the enum as text and limit the TypeScript values with an `as const` array:

```ts
export const purchaseStatuses = ["open", "packed", "completed", "voided"] as const;

status: text("status", { enum: purchaseStatuses }).notNull()
```

This gives you good TypeScript support, but remember: in SQLite this is still a text column. The enum behavior is primarily helping at the application level.

#### `real` for money

For a learning project with SQLite, `real` is acceptable and easy to reason about.

In production systems, money is often stored as integer cents to avoid floating-point issues. For learning Drizzle fundamentals, `real` keeps the examples simpler.

#### Snapshot field: `unitPrice`

This is the big one.

If the plant price changes tomorrow, old purchases must still show the original price paid. That is why `purchase_items.unit_price` exists.

Do not read the current plant price later and pretend that is the historical purchase price.

## Type Inference You’ll Use Constantly

Drizzle can infer insert and select types from tables.

Example:

```ts
type NewPlant = typeof plants.$inferInsert;
type Plant = typeof plants.$inferSelect;
```

This is useful because you avoid duplicating schema types manually.

If the table changes, the types change with it.

## Database Client Setup

Typical Bun + SQLite setup:

```ts
import { drizzle } from "drizzle-orm/bun-sqlite";

export const db = drizzle(process.env.DB_FILE_NAME!);
```

That gives you a DB object you can use for all queries.

Usually you export this once and pass it into service constructors.

Example:

```ts
import type { db } from "../db";
import { plants } from "../db/schema";

type AppDb = typeof db;

export class PlantService {
  constructor(private readonly db: AppDb) {}

  async listPlants() {
    return this.db.select().from(plants);
  }
}
```

That gives you one service object that owns the plant-related queries.

## Migration Workflow

This is the loop you want to get comfortable with.

### 1. Change the schema

Edit `src/db/schema.ts`.

### 2. Generate a migration

```bash
bunx drizzle-kit generate
```

This compares your schema definitions with prior migration state and creates SQL files in your configured output directory.

### 3. Apply the migration

There are a few ways to apply migrations depending on project setup. In a Bun + SQLite project, a common approach is to run Drizzle’s migrator from code or wire a script for it.

The important concept is this:

- generating creates migration files
- applying actually changes the database

Do not confuse those two steps.

### 4. Inspect the result

After migration, verify:

- the new table exists
- new columns exist
- defaults behave as expected
- foreign keys are valid

If something feels off, inspect both the schema code and the generated SQL.

## Insert Patterns

This is where most small project bugs happen.

## Insert One Catalog Row

Adding one plant is straightforward:

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
    await this.db.insert(plants).values({
      name: input.name,
      price: input.price,
      category: input.category,
      inStock: input.inStock ?? true,
    });
  }
}
```

Use this pattern whenever you create a single row in one table.

Your handler would then call `plantService.createPlant(...)`.

## Insert Parent Then Child Rows

For a purchase, you cannot insert child rows first, because they need a valid `purchase_id`.

Typical flow:

1. validate the requested plant IDs
2. fetch the current plant prices
3. create the parent purchase
4. create the `purchase_items` rows using the parent ID
5. store `unitPrice` from the fetched plant data

Example shape:

```ts
type CreatePurchaseInput = {
  buyerName: string;
  items: Array<{ plantId: number; quantity: number }>;
};

export class PurchaseService {
  constructor(private readonly db: AppDb) {}

  async createPurchase(input: CreatePurchaseInput) {
    const purchase = await this.db
      .insert(purchases)
      .values({
        buyerName: input.buyerName,
        status: "open",
      })
      .returning();

    const purchaseId = purchase[0].id;

    await this.db.insert(purchaseItems).values([
      {
        purchaseId,
        plantId: 1,
        quantity: 2,
        unitPrice: 18.5,
      },
      {
        purchaseId,
        plantId: 4,
        quantity: 1,
        unitPrice: 7.25,
      },
    ]);

    return purchase[0];
  }
}
```

The exact way you gather plant prices is up to the query flow, but the idea is fixed: read current source price once, then persist it into the child records.

Even if your route is `POST /purchases`, the route should not own this sequence. The service method should.

## Why Transactions Matter Here

Purchase creation is a multi-step write.

If the parent row is inserted but the child rows fail, your data is incomplete. That is a classic reason to use a transaction.

Example:

```ts
export class PurchaseService {
  constructor(private readonly db: AppDb) {}

  async createPurchase(input: CreatePurchaseInput) {
    return this.db.transaction(async (tx) => {
      const insertedPurchase = await tx
        .insert(purchases)
        .values({
          buyerName: input.buyerName,
          status: "open",
        })
        .returning();

      const purchaseId = insertedPurchase[0].id;

      await tx.insert(purchaseItems).values([
        {
          purchaseId,
          plantId: 1,
          quantity: 2,
          unitPrice: 18.5,
        },
      ]);

      return insertedPurchase[0];
    });
  }
}
```

Use transactions when the steps belong together logically.

Transactions are another strong reason to use services. A handler should not have to coordinate a multi-step DB workflow line by line.

## Select Queries

## Read All Rows

Basic catalog query:

```ts
export class PlantService {
  constructor(private readonly db: AppDb) {}

  async listPlants() {
    return this.db.select().from(plants);
  }
}
```

This is your starting point for simple listing endpoints.

## Filter With One Condition

Example: only indoor plants.

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

`eq()` is one of the core helpers you will use often.

## Compose Multiple Conditions

When filters are optional, you usually build an array of conditions and combine them.

```ts
import { and, eq } from "drizzle-orm";

export class PlantService {
  constructor(private readonly db: AppDb) {}

  async listPlants(filters: {
    category?: "indoor" | "outdoor";
    inStock?: boolean;
  }) {
    const conditions = [];

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

This is the pattern to remember when query params may or may not be present.

In a real endpoint, you would only push a condition if that filter was actually provided.

Example shape:

```ts
const conditions = [];

if (category) {
  conditions.push(eq(plants.category, category));
}

if (typeof inStock === "boolean") {
  conditions.push(eq(plants.inStock, inStock));
}

const query = db.select().from(plants);

const results =
  conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;
```

This pattern matters because optional filters are one of the first places where Drizzle starts to feel practical instead of just decorative.

It also belongs naturally in a service, because query composition is application logic, not HTTP wiring.

## Manual Joins

This is one of the most important parts of the guide.

If you want purchase detail with item and plant information, use a join. Do not make the database do less expressive work just because you are thinking in objects.

Example:

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

That will return a flat list of rows. Each row repeats the purchase fields and contains one item’s data.

That is normal.

## Result Shaping After a Join

Most APIs do not return flat join rows directly. They reshape them.

Example target shape:

```ts
{
  id: 12,
  buyerName: "Alya",
  status: "open",
  createdAt: "...",
  items: [
    {
      id: 40,
      quantity: 2,
      unitPrice: 18.5,
      plant: {
        id: 1,
        name: "Monstera Deliciosa",
        category: "indoor"
      }
    }
  ]
}
```

The reshaping usually happens in application code after the join.

Rough idea:

```ts
export class PurchaseService {
  constructor(private readonly db: AppDb) {}

  async getPurchaseDetail(purchaseId: number) {
    const rows = await this.db
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

    const first = rows[0];

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

This is useful because SQL returns rows, but APIs often want nested JSON.

The service is the right place for this transformation. Handlers should not be hand-assembling nested DB results unless the project is truly tiny and temporary.

## Updates

Update only the fields that are supposed to change.

Example: change price or stock status.

```ts
import { eq } from "drizzle-orm";

export class PlantService {
  constructor(private readonly db: AppDb) {}

  async updatePlant(
    plantId: number,
    patch: { price?: number; inStock?: boolean },
  ) {
    return this.db
      .update(plants)
      .set(patch)
      .where(eq(plants.id, plantId));
  }
}
```

Example: update purchase status.

```ts
export class PurchaseService {
  constructor(private readonly db: AppDb) {}

  async updatePurchaseStatus(
    purchaseId: number,
    status: "open" | "packed" | "completed" | "voided",
  ) {
    return this.db
      .update(purchases)
      .set({ status })
      .where(eq(purchases.id, purchaseId));
  }
}
```

For patch-style behavior, build the object from only the fields the client actually sent.

## Delete Basics

You may not need deletes in your project, but the base shape is simple:

```ts
await db.delete(plants).where(eq(plants.id, 1));
```

Be careful with deletes in parent-child tables. Foreign keys will matter.

If a parent row has children, the delete may fail unless your schema is designed to allow cascading behavior.

## Aggregation with `groupBy()`

This is a strong capstone because it combines joins, math, grouping, and result interpretation.

Example: total revenue per plant.

```ts
import { sql } from "drizzle-orm";

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

This is the kind of query that makes ORM learning click, because you stop thinking only in rows and start thinking in shaped reports.

## Practical Pitfalls

## 1. Inserting child rows before parent rows

This fails because the foreign key target does not exist yet.

Parent first, then children.

## 2. Reading mutable price later instead of storing a snapshot

This breaks historical accuracy.

Always persist the purchase-time unit price in the child row.

## 3. Forgetting that SQLite booleans are really integers

If your data behaves strangely, check both the schema definition and the values being inserted.

Use:

```ts
integer("some_flag", { mode: "boolean" })
```

when you want boolean behavior.

## 4. Assuming `enum` means hard database enforcement in SQLite

Drizzle helps at the TypeScript layer, but SQLite text columns are still text unless you add database-level constraints yourself.

This is fine for learning projects, but it is worth remembering.

## 5. Confusing defaults with application behavior

A default only applies when you omit the field. If you send `null` to a non-null column, the default does not magically rescue that insert.

Defaults are not the same thing as validation.

## 6. Returning join rows directly without shaping them

Joins often produce repeated parent data. That is expected. Shape the response into nested JSON if your endpoint needs that.

## 7. Forgetting to use a transaction for multi-step writes

If one write depends on another and both belong to the same business operation, a transaction is usually the correct tool.

## A Compact Cheat Sheet

### Define a table

```ts
const things = sqliteTable("things", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});
```

### Insert

```ts
await db.insert(things).values({ name: "Example" });
```

### Select all

```ts
await db.select().from(things);
```

### Filter

```ts
await db.select().from(things).where(eq(things.name, "Example"));
```

### Update

```ts
await db.update(things).set({ name: "Changed" }).where(eq(things.id, 1));
```

### Delete

```ts
await db.delete(things).where(eq(things.id, 1));
```

### Join

```ts
await db
  .select()
  .from(parent)
  .innerJoin(child, eq(child.parentId, parent.id));
```

### Transaction

```ts
await db.transaction(async (tx) => {
  // multiple writes here
});
```

### Aggregate

```ts
await db
  .select({
    count: sql<number>`count(*)`,
  })
  .from(things);
```

## Translation Prompts for Your Real Project

Use these prompts to map the nursery example to your own app without copying a ready-made solution.

- In your real project, which table plays the role of `plants`?
- Which table is the parent transaction record like `purchases`?
- Which table holds line items like `purchase_items`?
- Which field in your real project must be stored as a snapshot the same way `unitPrice` is stored here?
- Which endpoint in your project needs a manual join instead of separate independent queries?
- Which filters in your project can be built using `eq()` and conditional `and()` composition?
- Which multi-step write in your app should be wrapped in a transaction?
- Which later reporting endpoint could use `groupBy()`?

## Final Takeaway

You do not need all of Drizzle’s docs to finish your project.

What you really need is comfort with:

- schema definitions
- migrations
- insert flow with foreign keys
- joins
- filtered queries
- updates
- transactions
- aggregation

If you understand those with the nursery example, you will be able to map the same patterns into your coffee-shop API yourself without the tutorial spoiling the build.

And if you keep those patterns inside service classes instead of handlers, you will end up with code that is easier to test, easier to extend, and much closer to how a real backend usually evolves.

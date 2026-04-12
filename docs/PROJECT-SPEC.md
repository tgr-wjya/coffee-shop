# Coffee Shop API

## Overview

Build a small API for a coffee shop using Bun, Hono, Drizzle ORM, and PostgreSQL.

The system should let the shop:

- manage menu items
- create customer orders
- store multiple items per order
- preserve item prices at the moment the order was placed

This is intentionally small, but it should model a real-world pattern instead of a toy CRUD app.

## Stack

- Bun
- Hono
- Drizzle ORM
- PostgreSQL

## Domain

The coffee shop has a menu of products. Customers place orders. Each order can contain multiple products, each with its own quantity.

The important business rule is that an order item must store the product price at the time the order is created. Future price changes must not affect historical orders.

## Schema

Use three tables.

### `products`

Represents menu items sold by the coffee shop.

Fields:

- `id`
- `name`
- `price`
- `category` with allowed values: `drink` or `food`
- `available` as a boolean

### `orders`

Represents a customer order.

Fields:

- `id`
- `customer_name`
- `status` with allowed values:
  - `pending`
  - `preparing`
  - `done`
  - `cancelled`
- `created_at`

### `order_items`

Represents the products inside an order.

Fields:

- `id`
- `order_id`
- `product_id`
- `quantity`
- `unit_price`

`order_id` references `orders`.

`product_id` references `products`.

`unit_price` is a snapshot of the product price when the order is created. It should not be derived from the current product price when reading order history later.

## Endpoints

### Products

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/products` | List menu items, optionally filtered by `category` and `available` |
| `POST` | `/products` | Add a new menu item |
| `PATCH` | `/products/:id` | Update mutable product fields such as price or availability |

### Orders

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/orders` | Create an order with an array of items |
| `GET` | `/orders/:id` | Return an order with its joined items |
| `PATCH` | `/orders/:id/status` | Update the order status |
| `GET` | `/orders` | List orders, optionally filtered by status |

Example filter:

- `/orders?status=preparing`

## Hidden Learning Targets

This project is small on purpose, but it exercises the core Drizzle concepts you are expected to learn.

### Migrations with `drizzle-kit`

You should define the schema in code and use migrations to evolve the database safely instead of recreating it manually.

### Foreign keys and insert order

An order must exist before its `order_items` can be inserted. This forces you to think about parent-child creation flow.

### Manual joins

Fetching an order with its items should require a join query so you learn how Drizzle composes related data instead of hiding everything behind abstractions.

### Snapshot fields

`unit_price` exists to preserve historical accuracy. This is the most important data modeling lesson in the project.

### Filter composition

Listing products and orders should teach you how to build conditional queries using `where()`, `eq()`, and `and()`.

## Scope Boundary

Do not include:

- authentication
- payments
- stock or inventory tracking
- user accounts
- advanced analytics

The goal is to learn ORM fundamentals through a realistic shape, not to build a full production coffee platform.

## Suggested Application Shape

Keep the API small, but do not put all database logic directly inside route handlers.

A good shape for this project is:

- handlers/controllers for HTTP concerns
- class-based services for business flow and DB orchestration
- schema and DB modules for table definitions and connection setup

For example:

- handlers should parse params, query strings, and request bodies
- service classes should perform reads, writes, joins, transactions, and result shaping
- service classes can receive shared dependencies such as `db` through their constructor
- handlers should call services and return HTTP responses

This project is meant to teach ORM usage in a realistic backend style, not a one-file demo where every query lives beside the route definition.

## Optional Capstone

If the main project is complete, add:

- `GET /orders/summary`

This endpoint should return total revenue per product and is a good place to practice aggregation with `groupBy()`.

## Success Criteria

The project is complete when:

- the schema models the three-table relationship correctly
- order item prices are stored as snapshots
- the listed endpoints work with the defined filters
- joins are used where the project expects them
- database changes can be managed through Drizzle migrations
- handlers stay thin and DB-heavy logic lives in services

## Notes for Implementation

This document is the project brief, not the solution.

It intentionally tells you what to build and what concepts matter, but not exactly how to structure the implementation.

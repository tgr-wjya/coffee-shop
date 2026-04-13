import {
	boolean,
	integer,
	numeric,
	pgEnum,
	pgTable,
	real,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const productCategoryEnum = pgEnum("product_category", [
	"food",
	"drink",
]);
export const orderStatusEnum = pgEnum("order_status", [
	"pending",
	"prepared",
	"done",
	"cancelled",
]);

export const productTable = pgTable("products", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	price: real("price").notNull(),
	category: productCategoryEnum("category").notNull(),
	available: boolean("available").notNull().default(true),
});

export const ordersTable = pgTable("orders", {
	id: serial("id").primaryKey(),
	customer_name: text("customer_name").notNull(),
	status: orderStatusEnum("status").notNull().default("pending"),
	created_at: timestamp("created_at").notNull().defaultNow(),
});

export const order_itemsTable = pgTable("order_items", {
	id: serial("id").primaryKey(),
	order_id: serial("order_id")
		.notNull()
		.references(() => ordersTable.id),
	product_id: serial("product_id")
		.notNull()
		.references(() => productTable.id),
	quantity: integer("quantity").notNull(),
	unit_price: numeric("unit_price", {
		precision: 10,
		scale: 2,
		mode: "number",
	}).notNull(),
});

export type CreateProductInput = typeof productTable.$inferInsert;

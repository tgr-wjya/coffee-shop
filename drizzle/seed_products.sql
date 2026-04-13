INSERT INTO "products" ("name", "price", "category", "available")
SELECT
	seed."name",
	seed."price"::real,
	seed."category"::product_category,
	seed."available"
FROM (
	VALUES
		('Espresso', 2.5, 'drink', true),
		('Americano', 3.0, 'drink', true),
		('Cappuccino', 3.75, 'drink', true),
		('Latte', 4.0, 'drink', true),
		('Mocha', 4.5, 'drink', true),
		('Cold Brew', 4.25, 'drink', true),
		('Matcha Latte', 4.75, 'drink', true),
		('Croissant', 3.25, 'food', true),
		('Blueberry Muffin', 3.5, 'food', true),
		('Bagel with Cream Cheese', 4.25, 'food', true),
		('Avocado Toast', 7.5, 'food', true),
		('Chicken Sandwich', 8.75, 'food', true),
		('Chocolate Cake Slice', 5.25, 'food', false)
) AS seed("name", "price", "category", "available")
WHERE NOT EXISTS (
	SELECT 1
	FROM "products"
	WHERE "products"."name" = seed."name"
);

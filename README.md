# coffee-shop

## 11 april 2026

> trying to learn drizzle orm here.

i think i'm finally ready to tackle on drizzle orm, i have enough knowledge with sqlite already.

starting with postgresql.

## products endpoints

| method | what it does |
| --- | --- |
| `GET  /products` | list menu (filter by `?category=, ?available=`) |
| `POST /products` | add item |
| `PATCH  /products/:id` | update price or availability |

## orders endpoints

| method | what it does |
| --- | --- |
| `POST  /orders` | create order |
| `GET /orders/:id` | add item |
| `PATCH  /orders/:id/status` | update status |
| `GET  /orders?status=preparing` | filter orders by status |

## stack

- bun + hono + drizzle orm + `bun:sqlite`

## find me

[portfolio](https://tgr-wjya.github.io) · [linkedin](https://linkedin.com/in/tegar-wijaya-kusuma-591a881b9) · [email](mailto:tgr.wjya.queue.top126@pm.me)

---

made with ◉‿◉

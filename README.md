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

## what i learned

- i should've started with postgresql from the start, its more battle tested than `bun:sqlite`.
- i have nothing against `bun:sqlite`, i just think starting out with `postgresql` is going to paid off more as a backend.
- setting up your `db` in [docker-compose](./docker-compose.yml) isn't as hard as i thought it'd be.
- you should always do `bunx drizzle-kit generate` first before doing migration.
- and yes, `drizzle-kit generate` is allowed even when the `db` is down. just be careful of waking up your `db` first before migrating.
- besides that, generating before migrating is a good idea to validate your schema change for others.

## stack

- bun + hono + drizzle orm + `bun:sqlite`

## find me

[portfolio](https://tgr-wjya.github.io) · [linkedin](https://linkedin.com/in/tegar-wijaya-kusuma-591a881b9) · [email](mailto:tgr.wjya.queue.top126@pm.me)

---

made with ◉‿◉

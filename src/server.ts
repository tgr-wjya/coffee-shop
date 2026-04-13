/**
 * @author Tegar Wijaya Kusuma
 * @date 13 April 2026
 */

import app from "./app";

Bun.serve({
	port: 3000,
	hostname: "0.0.0.0",
	fetch: app.fetch,
});

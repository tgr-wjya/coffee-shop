/**
 * @author Tegar Wijaya Kusuma
 * @date 13 April 2026
 */

export function getEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing env: ${name}`);
	}
	return value;
}

/**
 * @author Tegar Wijaya Kusuma
 * @date 13 April 2026
 */

export class NotFoundException extends Error {
	status = 404;
	availableEndpoints: string[];
	docs: string;

	constructor(availableEndpoints: string[], docs: string) {
		super(
			"Not Found. Please refer to the documentation below for more information",
		);
		this.availableEndpoints = availableEndpoints;
		this.docs = docs;
	}
}

export class ProductsNotFound extends Error {
	status = 404;

	constructor() {
		super("Products Not Found");
	}
}

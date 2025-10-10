export class InvalidApeKeyError extends Error {
	constructor() {
		super("ApeKey is invalid");
		this.name = "InvalidApeKeyError";
	}
}

export class InactiveApeKeyError extends Error {
	constructor() {
		super("ApeKey is inactive");
		this.name = "InactiveApeKeyError";
	}
}

export class APIError extends Error {
	constructor(message: string, cause?: unknown) {
		super(message);
		this.name = "APIError";
		if (cause) (this as any).cause = cause;
	}
}

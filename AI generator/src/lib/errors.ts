export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly expose = true,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toClientError(error: unknown): { message: string; code: string; status: number } {
  if (error instanceof AppError && error.expose) {
    return { message: error.message, code: error.code, status: error.status };
  }
  return {
    message: "Something went wrong. Try again.",
    code: "internal_error",
    status: 500,
  };
}

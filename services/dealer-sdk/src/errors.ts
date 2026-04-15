import type { Problem } from "./types.js";

export class AutoLoansApiError extends Error {
  readonly status: number;
  readonly problem: Problem;
  readonly correlationId?: string;

  constructor(problem: Problem) {
    super(`${problem.title} (HTTP ${problem.status})${problem.detail ? ": " + problem.detail : ""}`);
    this.name = "AutoLoansApiError";
    this.status = problem.status;
    this.problem = problem;
    this.correlationId = problem.correlation_id;
  }

  /** Convenience: machine-readable slug from the `type` URL. */
  get typeSlug(): string {
    return this.problem.type.split("/").pop() ?? "";
  }
}

export class AutoLoansNetworkError extends Error {
  readonly cause: unknown;
  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "AutoLoansNetworkError";
    this.cause = cause;
  }
}

export class AutoLoansSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AutoLoansSignatureError";
  }
}

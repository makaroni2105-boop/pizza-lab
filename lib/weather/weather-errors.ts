export type WeatherFetchErrorCode =
  | "API_KEY_NOT_CONFIGURED"
  | "HTTP_ERROR"
  | "INCOMPLETE_RESPONSE"
  | "TIMEOUT"
  | "NETWORK";

export class WeatherFetchError extends Error {
  readonly code: WeatherFetchErrorCode;

  constructor(code: WeatherFetchErrorCode, message: string) {
    super(message);
    this.name = "WeatherFetchError";
    this.code = code;
  }
}
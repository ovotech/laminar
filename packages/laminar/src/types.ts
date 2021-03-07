/**
 * Used throughout the project to express "empty object"
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type Empty = {};

export interface Service {
  start(): Promise<this>;
  stop(): Promise<this>;
  isRunning(): boolean;
  /**
   * Discribe the service, Should report if the server is running or not
   */
  describe(): string;
}

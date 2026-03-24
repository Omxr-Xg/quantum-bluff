declare module "node-cron" {
  export interface ScheduledTask {
    start(): void;
    stop(): void;
    destroy(): void;
  }
  export function schedule(
    expression: string,
    task: () => void | Promise<void>,
    options?: { scheduled?: boolean }
  ): ScheduledTask;
  export function validate(expression: string): boolean;
  const nodeCron: {
    schedule: typeof schedule;
    validate: typeof validate;
  };
  export default nodeCron;
}

import { vi } from "vitest";

export const log = vi.fn<(...args: any[]) => any>();
export const error = vi.fn<(...args: any[]) => any>();
export const info = vi.fn<(...args: any[]) => any>();
export const warn = vi.fn<(...args: any[]) => any>();
export const loggers = {
  blue: vi.fn<(...args: any[]) => any>(),
  green: vi.fn<(...args: any[]) => any>(),
  yellow: vi.fn<(...args: any[]) => any>(),
  red: vi.fn<(...args: any[]) => any>(),
  magenta: vi.fn<(...args: any[]) => any>(),
  cyan: vi.fn<(...args: any[]) => any>(),
  white: vi.fn<(...args: any[]) => any>(),
  gray: vi.fn<(...args: any[]) => any>(),
};

import { vi } from "vitest";

export const isAuthenticated = vi.fn(() => Promise.resolve(false));
export const isAuthenticatedConfig = vi.fn(() => false);
export const isEnvironmentAuthConfig = vi.fn(() => false);
export const loadAuthConfig = vi.fn(() => null);
export const login = vi.fn<(...args: any[]) => any>();
export const logout = vi.fn<(...args: any[]) => any>();
export const ensureOrganization = vi.fn<(...args: any[]) => any>();
export const getOrganizationId = vi.fn(() => null);
export const saveAuthConfig = vi.fn<(...args: any[]) => any>();
export const listUserOrganizations = vi.fn<(...args: any[]) => any>();
export const hasMultipleOrganizations = vi.fn<(...args: any[]) => any>();
export const getModelName = vi.fn(() => null);
export const getAccessToken = vi.fn(() => null);
export const getConfigUri = vi.fn(() => null);
export const getAssistantSlug = vi.fn(() => null);
export const getLocalConfigPath = vi.fn(() => null);
export const updateConfigUri = vi.fn<(...args: any[]) => any>();
export const updateModelName = vi.fn<(...args: any[]) => any>();
export const updateAssistantSlug = vi.fn<(...args: any[]) => any>();
export const updateLocalConfigPath = vi.fn<(...args: any[]) => any>();

// Type re-exports for test compatibility
export type AuthConfig = null;
export type {
  AuthenticatedConfig,
  EnvironmentAuthConfig,
} from "../../auth/workos.js";

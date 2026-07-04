import { projectId, publicAnonKey } from './supabase/info';

/**
 * Centralized API base URL for the Daimun Edge Function.
 */
export const API_URL = `https://${projectId}.supabase.co/functions/v1/server`;

export { projectId, publicAnonKey };

/**
 * Canonical production URL for shareable links.
 * Always use this instead of window.location.origin so that shared URLs
 * point to the real domain regardless of the current environment
 * (Figma Make preview, localhost, etc.).
 */
export const SITE_URL = 'https://daimun.app';
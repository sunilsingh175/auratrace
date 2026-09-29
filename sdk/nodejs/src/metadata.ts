/**
 * AuraTrace Node.js SDK Metadata & Environment Detection
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface RuntimeMetadata {
  language: "nodejs";
  node_version: string;
  os_platform: string;
  os_release: string;
  hostname: string;
  pid: number;
}

export function getRuntimeMetadata(): RuntimeMetadata {
  return {
    language: "nodejs",
    node_version: process.version,
    os_platform: process.platform,
    os_release: os.release(),
    hostname: os.hostname(),
    pid: process.pid,
  };
}

export function resolveServiceName(configured?: string): string {
  if (configured && configured.trim()) return configured.trim();

  const envName =
    process.env.AURATRACE_SERVICE_NAME ||
    process.env.AUTOTRACE_SERVICE_NAME ||
    process.env.SERVICE_NAME ||
    process.env.npm_package_name;

  if (envName && envName.trim()) return envName.trim();

  try {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.name) return String(pkg.name).replace(/^@[\w-]+\//, "");
    }
  } catch {
    // Fallback
  }

  return path.basename(process.cwd()) || "node-service";
}

export function resolveEnvironment(configured?: string): string {
  if (configured && configured.trim()) return configured.trim();
  return (
    process.env.AURATRACE_ENV ||
    process.env.ENVIRONMENT ||
    process.env.NODE_ENV ||
    "production"
  );
}

export function resolveApiKey(configured?: string): string {
  if (configured && configured.trim()) return configured.trim();
  return (
    process.env.AURATRACE_API_KEY ||
    process.env.AURA_API_KEY ||
    process.env.AURA_PROJECT_KEY ||
    process.env.AUTOTRACE_API_KEY ||
    ""
  );
}

export function resolveEndpoint(configured?: string): string {
  if (configured && configured.trim()) return configured.trim().replace(/\/+$/, "");
  const envUrl =
    process.env.AURATRACE_ENDPOINT ||
    process.env.AURA_ENDPOINT ||
    process.env.AURA_API_URL ||
    process.env.AURA_BACKEND_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim().replace(/\/+$/, "");
  return "http://localhost:8000";
}

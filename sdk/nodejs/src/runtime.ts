import * as os from 'os';
import * as path from 'path';

export interface RuntimeInfo {
  language: string;
  version: string;
  framework?: string;
  frameworkVersion?: string;
  platform: string;
  hostname: string;
  pid: number;
}

function detectFramework(): string | undefined {
  // Check if common frameworks are loaded
  const checks: Array<[string, string]> = [
    ['express', 'express'],
    ['fastify', 'fastify'],
    ['@nestjs/core', 'nestjs'],
    ['koa', 'koa'],
    ['hapi', '@hapi/hapi'],
  ];
  for (const [pkg, name] of checks) {
    try {
      require.resolve(pkg);
      return name;
    } catch {
      // not installed
    }
  }
  return undefined;
}

function detectFrameworkVersion(name?: string): string | undefined {
  if (!name) return undefined;
  try {
    const pkg = name === 'nestjs' ? '@nestjs/core' : name;
    const pkgJson = require(`${pkg}/package.json`);
    return pkgJson.version;
  } catch {
    return undefined;
  }
}

export function detectRuntime(): RuntimeInfo {
  const framework = detectFramework();
  return {
    language: 'nodejs',
    version: process.version,
    framework,
    frameworkVersion: detectFrameworkVersion(framework),
    platform: os.platform(),
    hostname: os.hostname(),
    pid: process.pid,
  };
}

export function detectServiceName(): string {
  return (
    process.env.AURATRACE_SERVICE ||
    process.env.SERVICE_NAME ||
    process.env.APP_NAME ||
    path.basename(process.cwd()) ||
    'node-app'
  );
}

export function detectEnvironment(): string {
  return (
    process.env.AURATRACE_ENV ||
    process.env.ENVIRONMENT ||
    process.env.NODE_ENV ||
    'production'
  );
}

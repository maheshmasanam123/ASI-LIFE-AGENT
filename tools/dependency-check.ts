import { ToolResult } from '@asi-types/index';

export interface DependencyStatus {
  name: string;
  available: boolean;
  version?: string;
  error?: string;
}

const dependencyCache = new Map<string, DependencyStatus>();

export function checkDependency(name: string, importFn: () => Promise<any>): Promise<DependencyStatus> {
  if (dependencyCache.has(name)) {
    return Promise.resolve(dependencyCache.get(name)!);
  }

  return importFn()
    .then(module => {
      const status: DependencyStatus = {
        name,
        available: true,
        version: module.version || module.default?.version || 'unknown',
      };
      dependencyCache.set(name, status);
      return status;
    })
    .catch(error => {
      const status: DependencyStatus = {
        name,
        available: false,
        error: error.message,
      };
      dependencyCache.set(name, status);
      return status;
    });
}

export async function checkMultipleDependencies(checks: Array<{ name: string; importFn: () => Promise<any> }>): Promise<DependencyStatus[]> {
  return Promise.all(checks.map(c => checkDependency(c.name, c.importFn)));
}

export function createUnavailableResult(toolName: string, dependency: string): ToolResult {
  return {
    success: false,
    error: `${toolName} requires '${dependency}' which is not installed. Run: npm install ${dependency}`,
    duration: 0,
  };
}

export function requireDependency(
  dependency: string,
  importFn: () => Promise<any>
): Promise<{ module: any; status: DependencyStatus } | null> {
  return checkDependency(dependency, importFn).then(status => {
    if (!status.available) {
      return null;
    }
    return importFn().then(module => ({ module, status }));
  });
}
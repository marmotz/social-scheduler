import { vi } from 'vitest';

type TrpcBatchEntry = { result: { data: unknown } } | { error: { message: string; code: number; data: unknown } };

interface MockTrpcResponse {
  status: number;
  entry: TrpcBatchEntry;
}

/**
 * Stubs `fetch` so the real tRPC client (real proxy, real httpBatchLink) can be used
 * in tests without a network — `useTRPC()`'s internals rely on a symbol only present
 * on a genuine `createTRPCClient` instance, so mocking the `trpcClient` object shape
 * directly silently breaks `mutationOptions()`.
 */
export function mockTrpcFetch(handlers: Record<string, () => MockTrpcResponse>) {
  const fetchMock = vi.fn(async (url: string | URL) => {
    const urlStr = url.toString();
    const path = Object.keys(handlers).find((candidate) => urlStr.includes(`/trpc/${candidate}`));
    if (!path) {
      throw new Error(`mockTrpcFetch: no handler registered for ${urlStr}`);
    }

    const { status, entry } = handlers[path]!();
    return new Response(JSON.stringify([entry]), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function trpcSuccess(data: unknown): MockTrpcResponse {
  return { status: 200, entry: { result: { data } } };
}

export function trpcError(message: string, httpStatus = 500): MockTrpcResponse {
  return {
    status: httpStatus,
    entry: { error: { message, code: -32603, data: { code: 'INTERNAL_SERVER_ERROR', httpStatus } } },
  };
}

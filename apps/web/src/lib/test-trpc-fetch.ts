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
  const fetchMock = vi.fn(async (url: string | URL, _options?: RequestInit) => {
    const urlStr = url.toString();
    const match = /\/trpc\/([^?]+)/.exec(urlStr);
    if (!match) {
      throw new Error(`mockTrpcFetch: could not parse a tRPC path from ${urlStr}`);
    }

    // httpBatchLink merges same-tick queries into a single comma-separated path
    // (e.g. `/trpc/socialAccounts.listAccounts,posts.listPosts`), so each segment
    // needs its own handler and its own entry in the response array, in order.
    const paths = decodeURIComponent(match[1]).split(',');
    const responses = paths.map((path) => {
      const handler = handlers[path];
      if (!handler) {
        throw new Error(`mockTrpcFetch: no handler registered for ${path}`);
      }
      return handler();
    });

    return new Response(JSON.stringify(responses.map(({ entry }) => entry)), {
      status: responses[0]?.status ?? 200,
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

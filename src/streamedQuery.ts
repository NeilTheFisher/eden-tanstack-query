import type { QueryFunction, QueryFunctionContext, QueryKey } from "@tanstack/query-core";

type BaseStreamedQueryParams<TQueryFnData, TQueryKey extends QueryKey> = {
  streamFn: (
    context: QueryFunctionContext<TQueryKey>,
  ) => AsyncIterable<TQueryFnData> | Promise<AsyncIterable<TQueryFnData>>;
  refetchMode?: "append" | "reset" | "replace";
};

type SimpleStreamedQueryParams<TQueryFnData, TQueryKey extends QueryKey> = BaseStreamedQueryParams<
  TQueryFnData,
  TQueryKey
> & {
  reducer?: never;
  initialValue?: never;
};

type ReducibleStreamedQueryParams<
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
> = BaseStreamedQueryParams<TQueryFnData, TQueryKey> & {
  reducer: (acc: TData, chunk: TQueryFnData) => TData;
  initialValue: TData;
};

type StreamedQueryParams<TQueryFnData, TData, TQueryKey extends QueryKey> =
  | SimpleStreamedQueryParams<TQueryFnData, TQueryKey>
  | ReducibleStreamedQueryParams<TQueryFnData, TData, TQueryKey>;

type OmitKeyof<T extends object, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

function addToEnd<T>(items: Array<T>, item: T, max = 0): Array<T> {
  const newItems = [...items, item];
  return max && newItems.length > max ? newItems.slice(1) : newItems;
}

function addConsumeAwareSignal<T extends object>(
  object: T,
  getSignal: () => AbortSignal,
  onCancelled: VoidFunction,
): T & { signal: AbortSignal } {
  let consumed = false;
  let signal: AbortSignal | undefined;

  Object.defineProperty(object, "signal", {
    enumerable: true,
    get: () => {
      signal ??= getSignal();
      if (consumed) {
        return signal;
      }

      consumed = true;
      if (signal.aborted) {
        onCancelled();
      } else {
        signal.addEventListener("abort", onCancelled, { once: true });
      }

      return signal;
    },
  });

  return object as T & { signal: AbortSignal };
}

/**
 * Creates a query function that streams data from an AsyncIterable, buffering
 * chunks as the query's data. Keeps the query in a fetching state until the
 * stream ends, so incremental chunks surface through TanStack Query's cache.
 *
 * Inlined from @tanstack/query-core's `streamedQuery` so this package carries
 * no runtime dependency on a specific TanStack Query version; only its types
 * are referenced.
 */
export function streamedQuery<
  TQueryFnData = unknown,
  TData = Array<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
>({
  streamFn,
  refetchMode = "reset",
  reducer = (items, chunk) => addToEnd(items as Array<TQueryFnData>, chunk) as TData,
  initialValue = [] as TData,
}: StreamedQueryParams<TQueryFnData, TData, TQueryKey>): QueryFunction<TData, TQueryKey> {
  return async (context) => {
    const query = context.client.getQueryCache().find({ queryKey: context.queryKey, exact: true });
    const isRefetch = !!query && query.isFetched();
    if (isRefetch && refetchMode === "reset") {
      query.setState({
        ...query.resetState,
        fetchStatus: "fetching",
      });
    }

    let result = initialValue;

    let cancelled: boolean = false;
    const streamFnContext = addConsumeAwareSignal<OmitKeyof<typeof context, "signal">>(
      {
        client: context.client,
        meta: context.meta,
        queryKey: context.queryKey,
        pageParam: context.pageParam,
        direction: context.direction,
      },
      () => context.signal,
      () => (cancelled = true),
    );

    const stream = await streamFn(streamFnContext);

    const isReplaceRefetch = isRefetch && refetchMode === "replace";

    for await (const chunk of stream) {
      if (cancelled) {
        break;
      }

      if (isReplaceRefetch) {
        result = reducer(result, chunk);
      } else {
        context.client.setQueryData<TData>(context.queryKey, (prev) =>
          reducer(prev === undefined ? initialValue : prev, chunk),
        );
      }
    }

    if (isReplaceRefetch && !cancelled) {
      context.client.setQueryData<TData>(context.queryKey, result);
    }

    return context.client.getQueryData(context.queryKey) ?? initialValue;
  };
}

# @drift/after-react

React bindings for [`@drift/after`](../after).

```tsx
import { useScope } from "@drift/after-react";

function Search({ query }: { query: string }) {
  const scope = useScope(); // stable identity; disposed on unmount
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    const run = scope.run(); // a newer query supersedes this one
    run
      .guard(search(query, { signal: run.signal }))
      .then((found) => run.commit(() => setResults(found)))
      .catch((error: unknown) => {
        if (!isStale(error)) throw error;
      });
  }, [query, scope]);

  return <ResultList items={results} />;
}
```

`useScope(options?)` takes the same options as `scope()`. It is safe under React StrictMode.
Options are read on the first render.

## License

MIT

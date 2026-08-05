export async function readNdjsonStream<T>(
  response: Response,
  options: {
    signal?: AbortSignal;
    onEvent: (event: T) => void | Promise<void>;
  },
): Promise<void> {
  if (!response.body) throw new Error("The server returned an empty stream");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const cancelReader = () => void reader.cancel(options.signal?.reason).catch(() => undefined);
  options.signal?.addEventListener("abort", cancelReader, { once: true });

  const consumeLine = async (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let parsed: T;
    try {
      parsed = JSON.parse(trimmed) as T;
    } catch {
      throw new Error("The server returned malformed progress data");
    }
    await options.onEvent(parsed);
  };

  try {
    while (true) {
      if (options.signal?.aborted) {
        throw new DOMException("The request was cancelled", "AbortError");
      }
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) await consumeLine(line);
      if (done) break;
    }
    if (buffer.trim()) await consumeLine(buffer);
  } finally {
    options.signal?.removeEventListener("abort", cancelReader);
    reader.releaseLock();
  }
}

export async function responseError(response: Response, fallback: string): Promise<Error> {
  const data = await response.json().catch(() => null) as { error?: unknown } | null;
  return new Error(typeof data?.error === "string" ? data.error : fallback);
}

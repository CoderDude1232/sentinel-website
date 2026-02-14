const ERLC_API_BASE = "https://api.policeroleplay.community/v1";

type ErlcRequestResult = {
  ok: boolean;
  status: number;
  data: unknown;
};

function getHeaders(serverKey: string): HeadersInit {
  const headers: Record<string, string> = {
    "Server-Key": serverKey,
    Accept: "application/json",
  };

  if (process.env.PRC_GLOBAL_API_KEY) {
    headers.Authorization = process.env.PRC_GLOBAL_API_KEY;
  }

  return headers;
}

function getHeadersWithoutGlobalAuth(serverKey: string): HeadersInit {
  return {
    "Server-Key": serverKey,
    Accept: "application/json",
  };
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

async function request(path: string, serverKey: string): Promise<ErlcRequestResult> {
  const firstResponse = await fetch(`${ERLC_API_BASE}${path}`, {
    headers: getHeaders(serverKey),
    cache: "no-store",
  });

  const firstData = await parseResponse(firstResponse);

  if (
    process.env.PRC_GLOBAL_API_KEY &&
    (firstResponse.status === 401 || firstResponse.status === 403)
  ) {
    const fallbackResponse = await fetch(`${ERLC_API_BASE}${path}`, {
      headers: getHeadersWithoutGlobalAuth(serverKey),
      cache: "no-store",
    });
    const fallbackData = await parseResponse(fallbackResponse);
    return {
      ok: fallbackResponse.ok,
      status: fallbackResponse.status,
      data: fallbackData,
    };
  }

  return {
    ok: firstResponse.ok,
    status: firstResponse.status,
    data: firstData,
  };
}

export async function testErlcServerKey(serverKey: string): Promise<ErlcRequestResult> {
  return request("/server", serverKey);
}

export async function fetchErlcServerSnapshot(serverKey: string): Promise<{
  server: ErlcRequestResult;
  players: ErlcRequestResult;
  queue: ErlcRequestResult;
}> {
  const [server, players, queue] = await Promise.all([
    request("/server", serverKey),
    request("/server/players", serverKey),
    request("/server/queue", serverKey),
  ]);

  return { server, players, queue };
}

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

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

async function request(path: string, serverKey: string): Promise<ErlcRequestResult> {
  const response = await fetch(`${ERLC_API_BASE}${path}`, {
    headers: getHeaders(serverKey),
    cache: "no-store",
  });

  const data = await parseResponse(response);
  return {
    ok: response.ok,
    status: response.status,
    data,
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

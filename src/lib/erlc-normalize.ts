export type ParsedLogItem = {
  primary: string;
  secondary: string | null;
  detail: string | null;
  occurredAt: string | null;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function pickString(record: Record<string, unknown> | null, keys: string[]): string | null {
  if (!record) {
    return null;
  }
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

export function asList(payload: unknown, candidateKeys: string[]): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  const record = asObject(payload);
  if (!record) {
    return [];
  }
  for (const key of candidateKeys) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }
  return [];
}

function parseFromString(entry: string): ParsedLogItem {
  const trimmed = entry.trim();
  if (!trimmed) {
    return { primary: "Unknown", secondary: null, detail: null, occurredAt: null };
  }

  const split = trimmed.split(" - ");
  if (split.length >= 2) {
    const [head, ...rest] = split;
    return {
      primary: head.trim() || "Unknown",
      secondary: null,
      detail: rest.join(" - ").trim() || null,
      occurredAt: null,
    };
  }

  return { primary: trimmed, secondary: null, detail: null, occurredAt: null };
}

export function parseGenericLogItems(payload: unknown): ParsedLogItem[] {
  const list = asList(payload, ["logs", "Logs", "data", "Data", "records", "Records", "items", "Items"]);
  return list
    .map((entry) => {
      if (typeof entry === "string") {
        return parseFromString(entry);
      }
      const record = asObject(entry);
      if (!record) {
        return null;
      }

      const primary =
        pickString(record, ["Player", "player", "Username", "username", "Name", "name", "Caller", "caller"]) ??
        "Unknown";
      const secondary = pickString(record, ["Target", "target", "Victim", "victim", "Moderator", "moderator"]);
      const detail =
        pickString(record, ["Command", "command", "Reason", "reason", "Message", "message", "Details", "details"]) ??
        (secondary ? null : pickString(record, ["Type", "type"]));
      const occurredAt = pickString(record, ["Timestamp", "timestamp", "Time", "time", "Date", "date", "CreatedAt", "createdAt"]);

      return {
        primary,
        secondary,
        detail,
        occurredAt,
      };
    })
    .filter((item): item is ParsedLogItem => Boolean(item))
    .slice(0, 50);
}

export function parseStaffItems(payload: unknown): Array<{ name: string; role: string | null }> {
  const list = asList(payload, ["staff", "Staff", "data", "Data", "players", "Players"]);
  return list
    .map((entry) => {
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        if (!trimmed) {
          return null;
        }
        if (trimmed.includes(":")) {
          const [name, ...roleParts] = trimmed.split(":");
          return {
            name: name.trim() || "Unknown",
            role: roleParts.join(":").trim() || null,
          };
        }
        return { name: trimmed, role: null };
      }
      const record = asObject(entry);
      if (!record) {
        return null;
      }
      const name =
        pickString(record, ["Player", "player", "Username", "username", "Name", "name"]) ?? "Unknown";
      const role = pickString(record, ["Permission", "permission", "Role", "role", "Rank", "rank"]);
      return { name, role };
    })
    .filter((item): item is { name: string; role: string | null } => Boolean(item))
    .slice(0, 80);
}

export function parseVehicleItems(payload: unknown): Array<{ owner: string; model: string | null }> {
  const list = asList(payload, ["vehicles", "Vehicles", "data", "Data", "items", "Items"]);
  return list
    .map((entry) => {
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        if (!trimmed) {
          return null;
        }
        return { owner: trimmed, model: null };
      }
      const record = asObject(entry);
      if (!record) {
        return null;
      }
      const owner = pickString(record, ["Player", "player", "Owner", "owner", "Name", "name"]) ?? "Unknown";
      const model = pickString(record, ["Vehicle", "vehicle", "Model", "model", "Car", "car"]);
      return { owner, model };
    })
    .filter((item): item is { owner: string; model: string | null } => Boolean(item))
    .slice(0, 80);
}

type LogFields = Record<string, unknown>;

const SECRET_KEYS = /token|secret|authorization|password|apikey|api_key|service_role/i;

function sanitize(fields?: LogFields): LogFields | undefined {
  if (!fields) return undefined;
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SECRET_KEYS.test(key)) {
      out[key] = "[redacted]";
    } else if (typeof value === "string" && value.length > 500) {
      out[key] = `${value.slice(0, 120)}…`;
    } else {
      out[key] = value;
    }
  }
  return out;
}

function write(level: string, message: string, fields?: LogFields) {
  const payload = { level, message, ...sanitize(fields), ts: new Date().toISOString() };
  if (level === "error") {
    console.error(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields),
};

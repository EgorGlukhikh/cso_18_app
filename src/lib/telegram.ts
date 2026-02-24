const TELEGRAM_API_BASE = "https://api.telegram.org";

function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
}

export function isTelegramConfigured() {
  return Boolean(getTelegramBotToken());
}

export async function callTelegramApi(method: string, payload: Record<string, unknown>) {
  const token = getTelegramBotToken();
  if (!token) return { ok: false as const, status: 0, payload: null as unknown };

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(`Telegram ${method} failed`, response.status, data);
      return { ok: false as const, status: response.status, payload: data };
    }

    return { ok: true as const, status: response.status, payload: data };
  } catch (error) {
    console.error(`Telegram ${method} exception`, error);
    return { ok: false as const, status: 0, payload: null as unknown };
  }
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  extra?: Record<string, unknown>
) {
  if (!chatId.trim()) return false;

  const result = await callTelegramApi("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(extra ?? {})
  });

  if (!result.ok) {
    console.error("Telegram sendMessage failed", result.status, result.payload);
    return false;
  }

  return true;
}

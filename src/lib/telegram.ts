const TELEGRAM_API_BASE = "https://api.telegram.org";

function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
}

export function isTelegramConfigured() {
  return Boolean(getTelegramBotToken());
}

export async function sendTelegramMessage(chatId: string, text: string) {
  const token = getTelegramBotToken();
  if (!token) return false;
  if (!chatId.trim()) return false;

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      })
    });

    if (!response.ok) {
      const payload = await response.text().catch(() => "");
      console.error("Telegram sendMessage failed", response.status, payload);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Telegram sendMessage exception", error);
    return false;
  }
}


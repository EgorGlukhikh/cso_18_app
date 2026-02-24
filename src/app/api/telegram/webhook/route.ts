import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram";

type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat?: { id: number };
    contact?: {
      phone_number?: string;
      user_id?: number;
      first_name?: string;
    };
    from?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
};

function normalizePhone(value: string) {
  const digits = value.replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

function linkKeyboard() {
  return {
    keyboard: [
      [
        {
          text: "Связать",
          request_contact: true
        }
      ]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
}

async function findParentByPhone(phoneNumber: string) {
  const normalized = normalizePhone(phoneNumber);
  if (!normalized) return null;

  const parents = await db.parentProfile.findMany({
    where: { user: { role: UserRole.PARENT, isActive: true, phone: { not: null } } },
    include: { user: true },
    take: 1000
  });

  return parents.find((item) => normalizePhone(item.user.phone ?? "") === normalized) ?? null;
}

async function linkParentTelegram(parentId: string, chatId: string) {
  return db.parentProfile.update({
    where: { id: parentId },
    data: {
      telegramChatId: chatId,
      telegramEnabled: true
    },
    include: { user: true }
  });
}

async function tryLinkByEmail(chatId: string, text: string) {
  const email = text.trim().toLowerCase();
  if (!email.includes("@")) return false;

  const parent = await db.parentProfile.findFirst({
    where: {
      user: {
        email,
        role: UserRole.PARENT,
        isActive: true
      }
    },
    include: { user: true }
  });

  if (!parent) return false;
  await linkParentTelegram(parent.id, chatId);
  await sendTelegramMessage(
    chatId,
    `Готово. Уведомления подключены для профиля родителя: ${parent.user.fullName}.`
  );
  return true;
}

async function handleStart(chatId: string) {
  await sendTelegramMessage(
    chatId,
    [
      "Привет! Я бот уведомлений о занятиях.",
      "Нажмите кнопку «Связать» и отправьте контакт, чтобы подключить уведомления.",
      "Если контакт не совпадает с базой, можно написать: /link ваш_email"
    ].join("\n"),
    { reply_markup: linkKeyboard() }
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!isTelegramConfigured()) {
      return NextResponse.json({ ok: true, skipped: "telegram_not_configured" });
    }

    const update = (await request.json()) as TelegramUpdate;
    const message = update.message;
    const chatId = message?.chat?.id ? String(message.chat.id) : "";
    if (!chatId) return NextResponse.json({ ok: true, skipped: "no_message_chat" });
    if (!message) return NextResponse.json({ ok: true, skipped: "no_message" });

    const text = (message.text ?? "").trim();
    const lowerText = text.toLowerCase();

    if (message.contact?.phone_number) {
      const parent = await findParentByPhone(message.contact.phone_number);
      if (!parent) {
        await sendTelegramMessage(
          chatId,
          "Не нашел родителя с таким номером телефона. Напишите /link ваш_email или обратитесь к администратору."
        );
        return NextResponse.json({ ok: true, linked: false, reason: "parent_not_found_by_phone" });
      }

      await linkParentTelegram(parent.id, chatId);
      await sendTelegramMessage(
        chatId,
        `Готово. Чат привязан к родителю ${parent.user.fullName}. Теперь уведомления о занятиях включены.`
      );
      return NextResponse.json({ ok: true, linked: true, parentId: parent.id });
    }

    if (lowerText === "/start" || lowerText === "связать" || lowerText === "/link") {
      await handleStart(chatId);
      return NextResponse.json({ ok: true, action: "start_prompt" });
    }

    if (lowerText.startsWith("/link ")) {
      const linked = await tryLinkByEmail(chatId, text.replace(/^\/link\s+/i, ""));
      if (!linked) {
        await sendTelegramMessage(
          chatId,
          "Не удалось найти родителя по email. Проверьте формат и попробуйте еще раз: /link your@email.com"
        );
      }
      return NextResponse.json({ ok: true, action: "link_by_email", linked });
    }

    if (lowerText.startsWith("связать ")) {
      const linked = await tryLinkByEmail(chatId, text.replace(/^связать\s+/i, ""));
      if (!linked) {
        await sendTelegramMessage(
          chatId,
          "Не удалось найти родителя по email. Используйте формат: связать your@email.com"
        );
      }
      return NextResponse.json({ ok: true, action: "link_by_email_ru", linked });
    }

    await sendTelegramMessage(
      chatId,
      "Чтобы подключить уведомления, нажмите «Связать» и отправьте контакт, либо используйте /link your@email.com",
      { reply_markup: linkKeyboard() }
    );
    return NextResponse.json({ ok: true, action: "help" });
  } catch (error) {
    console.error("Telegram webhook error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

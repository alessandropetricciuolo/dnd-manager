export async function sendAdminNotification(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !adminChatId) {
    console.warn(
      "[telegram-notifier] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID. Notification skipped."
    );
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });
  } catch {
    // Silent fail: Telegram issues must never crash the app.
  }
}

import { Router, type IRouter } from "express";
import { bot2 } from "../lib/bot.js";
import { loadConfig, updateConfig, setRuntimeToken2, getDiscordToken2 } from "../lib/config.js";

const { getBotStatus, restartBot, sendMessage, startAutoSend, stopAutoSend, getAutoSendStatus, updateAutoSendInterval } = bot2;

const router: IRouter = Router();

router.get("/status", (_req, res) => {
  const config = loadConfig();
  res.json({
    bot: getBotStatus(),
    autoSend: getAutoSendStatus(),
    config: {
      autoReact: config.autoReact2,
      clipboardMessenger: config.clipboardMessenger2,
      hasToken: !!getDiscordToken2(),
    },
  });
});

router.post("/auto-react", (req, res) => {
  const { enabled, emoji } = req.body as { enabled?: boolean; emoji?: string };
  const cur = loadConfig();
  const updated = updateConfig({ autoReact2: { enabled: enabled ?? cur.autoReact2.enabled, emoji: emoji ?? cur.autoReact2.emoji } });
  res.json({ success: true, autoReact: updated.autoReact2 });
});

router.post("/clipboard-messenger", (req, res) => {
  const { enabled, channelId } = req.body as { enabled?: boolean; channelId?: string };
  const cur = loadConfig();
  const updated = updateConfig({ clipboardMessenger2: { enabled: enabled ?? cur.clipboardMessenger2.enabled, channelId: channelId ?? cur.clipboardMessenger2.channelId } });
  res.json({ success: true, clipboardMessenger: updated.clipboardMessenger2 });
});

router.post("/send-message", async (req, res) => {
  const config = loadConfig();
  const { message, channelId } = req.body as { message?: string; channelId?: string };
  const target = channelId || config.clipboardMessenger2.channelId;
  if (!message || !target) { res.status(400).json({ success: false, error: "Missing message or channelId" }); return; }
  const result = await sendMessage(target, message);
  res.status(result.success ? 200 : 500).json(result.success ? { success: true } : { success: false, error: result.error });
});

router.post("/auto-send/start", (req, res) => {
  const { message, messages, channelId, intervalMs, bypass } = req.body as {
    message?: string;
    messages?: string[];
    channelId?: string;
    intervalMs?: number;
    bypass?: boolean;
  };
  const msgArray = Array.isArray(messages) && messages.length > 0
    ? messages
    : message ? [message] : [];
  if (msgArray.length === 0 || !channelId) {
    res.status(400).json({ success: false, error: "Missing messages or channelId" });
    return;
  }
  const result = startAutoSend(msgArray, channelId, intervalMs ?? 300, bypass ?? false);
  res.status(result.success ? 200 : 400).json(
    result.success ? { success: true, autoSend: getAutoSendStatus() } : { success: false, error: result.error }
  );
});

router.post("/auto-send/stop", (_req, res) => {
  stopAutoSend();
  res.json({ success: true, autoSend: getAutoSendStatus() });
});

router.post("/auto-send/interval", (req, res) => {
  const { intervalMs } = req.body as { intervalMs?: number };
  if (typeof intervalMs !== "number") { res.status(400).json({ success: false, error: "intervalMs must be a number" }); return; }
  updateAutoSendInterval(intervalMs);
  res.json({ success: true, autoSend: getAutoSendStatus() });
});

router.post("/change-token", (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token?.trim()) { res.status(400).json({ success: false, error: "Token cannot be empty" }); return; }
  setRuntimeToken2(token.trim());
  restartBot(token.trim()).catch((e) => console.error("bot2 restartBot error:", e));
  res.json({ success: true, message: "Token updated. Reconnecting in background…" });
});

router.post("/restart-bot", (_req, res) => {
  if (!getDiscordToken2()) { res.status(400).json({ success: false, error: "No token configured — use Change Token button" }); return; }
  restartBot().catch((e) => console.error("bot2 restartBot error:", e));
  res.json({ success: true, message: "Bot restart initiated…" });
});

export default router;

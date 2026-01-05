import { config } from "dotenv";
config();
import TelegramBot from "node-telegram-bot-api";

export const sendTelegramMessage = async (message) => {
  try {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_ID, {
      polling: false,
    });

    await bot
      .sendMessage(process.env.TELEGRAM_SUPPORT_CHAT, message)
      .then(() => {
        console.log("Message sent successfully!");
      })
      .catch((error) => {
        console.error("Error sending message:", error.response.body);
        return new Error(error?.message);
      });
  } catch (error) {
    console.log(error);
  }
};

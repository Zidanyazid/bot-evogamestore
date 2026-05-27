import { bot } from './bot/bot';
import { expressApp, setBotInstance } from './web/server';
import { config } from './config/env';
import { seedProductsIfNeeded, seedCategoriesIfNeeded } from './bot/handlers/orderFlow';

async function main() {
  console.log('🚀 Starting Evo Game Store Top-up System...');

  // Database Seed Initializers
  try {
    await seedProductsIfNeeded();
    await seedCategoriesIfNeeded();
  } catch (err) {
    console.error('⚠️ Seeding database tables failed:', err);
  }

  // 1. Share the Bot instance with the Express webhook server
  setBotInstance(bot);

  // 2. Start the Express Webhook Server
  const server = expressApp.listen(config.port, () => {
    console.log(`📡 Express API Server is listening on http://localhost:${config.port}`);
    console.log(`🔗 Webhook URL: ${config.webhookUrl}`);
    console.log(`🛡️ Tokopay Webhook: ${config.webhookUrl}/webhooks/tokopay`);
    console.log(`🧪 Sandbox Payment Simulator: ${config.webhookUrl}/sandbox/pay?refId=TEST-REF&amount=15000`);
  });

  // 3. Start the grammY Bot
  console.log('🤖 Launching Telegram Bot...');
  try {
    // Start bot in long-polling mode (safe and excellent for local development)
    await bot.start({
      onStart: (botInfo) => {
        console.log(`✅ Bot Telegram @${botInfo.username} successfully started!`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start Telegram Bot:', error);
    server.close();
  }
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
});

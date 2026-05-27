import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  databaseUrl: process.env.DATABASE_URL || '',
  
  // Tokopay Settings
  tokopay: {
    merchantId: process.env.TOKOPAY_MERCHANT_ID || '',
    secretKey: process.env.TOKOPAY_SECRET_KEY || '',
    isSandbox: !process.env.TOKOPAY_MERCHANT_ID || 
                process.env.TOKOPAY_MERCHANT_ID.includes('PLACEHOLDER')
  },

  // Digiflazz Settings
  digiflazz: {
    username: process.env.DIGIFLAZZ_USERNAME || '',
    apiKey: process.env.DIGIFLAZZ_API_KEY || '',
    isSandbox: !process.env.DIGIFLAZZ_USERNAME || 
               process.env.DIGIFLAZZ_USERNAME.includes('PLACEHOLDER')
  },

  webhookUrl: process.env.WEBHOOK_URL || 'http://localhost:3000'
};

// Log warning about sandboxes
if (config.tokopay.isSandbox) {
  console.warn('⚠️ Tokopay credentials are missing or placeholders. Running in SANDBOX SIMULATION mode.');
}
if (config.digiflazz.isSandbox) {
  console.warn('⚠️ Digiflazz credentials are missing or placeholders. Running in SANDBOX SIMULATION mode.');
}
if (!config.telegramBotToken || config.telegramBotToken.includes('PLACEHOLDER')) {
  console.error('❌ TELEGRAM_BOT_TOKEN is not configured! Please configure it in your .env file.');
}

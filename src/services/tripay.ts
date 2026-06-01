import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config/env';

export interface TripayOrderRequest {
  refId: string;
  amount: number;
  productName?: string;
  customerName?: string;
  customerEmail?: string;
  paymentMethod?: string; // QRIS, BRIVA, BCAVA, etc.
}

export interface TripayOrderResponse {
  success: boolean;
  paymentLink?: string;   // checkout_url
  paymentQr?: string;     // QR code URL (if available)
  payCode?: string;       // VA number or pay code
  refId: string;
  tripayRef?: string;     // Tripay reference ID
  errorMessage?: string;
}

const TRIPAY_PRODUCTION_URL = 'https://tripay.co.id/api';
const TRIPAY_SANDBOX_URL = 'https://tripay.co.id/api-sandbox';

export class TripayService {
  private static get baseUrl(): string {
    return config.tripay.isSandbox ? TRIPAY_SANDBOX_URL : TRIPAY_PRODUCTION_URL;
  }

  /**
   * Generates HMAC-SHA256 signature for Tripay API requests
   * Signature = HMAC-SHA256(merchantCode + merchantRef + amount, privateKey)
   */
  public static generateSignature(merchantRef: string, amount: number): string {
    const { merchantCode, privateKey } = config.tripay;
    const payload = merchantCode + merchantRef + amount;
    return crypto.createHmac('sha256', privateKey).update(payload).digest('hex');
  }

  /**
   * Verifies the callback signature from Tripay
   * X-Callback-Signature = HMAC-SHA256(JSON.stringify(body), privateKey)
   */
  public static verifyCallbackSignature(rawBody: string, receivedSignature: string): boolean {
    const { privateKey } = config.tripay;
    const expectedSignature = crypto.createHmac('sha256', privateKey).update(rawBody).digest('hex');
    return expectedSignature === receivedSignature;
  }

  /**
   * Creates a transaction/invoice via Tripay
   */
  public static async createOrder(params: TripayOrderRequest): Promise<TripayOrderResponse> {
    const { refId, amount, productName = 'Evo Game Store', customerName = 'Pelanggan', customerEmail = 'customer@evo.id', paymentMethod = 'QRIS' } = params;

    // Sandbox Simulation Mode
    if (config.tripay.isSandbox) {
      console.log(`[Tripay Sandbox] Simulating order creation for RefID: ${refId}, Amount: ${amount}`);
      
      const mockPayLink = `${config.webhookUrl}/sandbox/pay?refId=${refId}&amount=${amount}`;
      const mockQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(mockPayLink)}`;

      return {
        success: true,
        paymentLink: mockPayLink,
        paymentQr: mockQrCode,
        refId
      };
    }

    // Real API Mode
    try {
      const { apiKey, merchantCode } = config.tripay;
      const signature = this.generateSignature(refId, amount);

      console.log(`[Tripay API] Creating transaction. Merchant: ${merchantCode}, RefID: ${refId}, Amount: ${amount}, Method: ${paymentMethod}`);

      const payload = {
        method: paymentMethod,
        merchant_ref: refId,
        amount: amount,
        customer_name: customerName,
        customer_email: customerEmail,
        order_items: [
          {
            name: productName,
            price: amount,
            quantity: 1
          }
        ],
        callback_url: `${config.webhookUrl}/webhooks/tripay`,
        return_url: `${config.webhookUrl}/admin`,
        signature: signature
      };

      const response = await axios.post(`${this.baseUrl}/transaction/create`, payload, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = response.data;
      console.log('[Tripay API] Response:', JSON.stringify({
        success: data.success,
        reference: data.data?.reference,
        status: data.data?.status,
        checkout_url: data.data?.checkout_url ? 'EXISTS' : 'NULL'
      }));

      if (data.success && data.data) {
        return {
          success: true,
          paymentLink: data.data.checkout_url || data.data.pay_url,
          paymentQr: data.data.qr_code || data.data.qr_url || null,
          payCode: data.data.pay_code || null,
          refId,
          tripayRef: data.data.reference
        };
      }

      return {
        success: false,
        refId,
        errorMessage: data.message || data.error || 'Unknown Tripay error'
      };
    } catch (error: any) {
      console.error('Tripay Order Creation Error:', error.message);
      if (error.response?.data) {
        console.error('[Tripay API] Error Response:', JSON.stringify(error.response.data));
      }
      return {
        success: false,
        refId,
        errorMessage: error.response?.data?.message || error.message
      };
    }
  }
}

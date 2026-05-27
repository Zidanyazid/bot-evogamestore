import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config/env';

export interface TokopayOrderRequest {
  refId: string;
  amount: number;
  paymentChannel?: string; // QRIS, OVO, DANA, etc.
}

export interface TokopayOrderResponse {
  success: boolean;
  paymentLink?: string;
  paymentQr?: string; // QR raw data or image url
  refId: string;
  errorMessage?: string;
}

export class TokopayService {
  private static getMd5Hash(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex');
  }

  /**
   * Generates the signature required by Tokopay
   * Usually md5(merchant_id:secret) or md5(merchant_id:secret:ref_id) depending on the endpoint
   */
  public static generateSignature(refId?: string): string {
    const { merchantId, secretKey } = config.tokopay;
    if (refId) {
      return this.getMd5Hash(`${merchantId}:${secretKey}:${refId}`);
    }
    return this.getMd5Hash(`${merchantId}:${secretKey}`);
  }

  /**
   * Verifies the callback signature from Tokopay
   */
  public static verifyCallbackSignature(receivedSignature: string, refId: string): boolean {
    const expectedSignature = this.generateSignature(refId);
    return receivedSignature === expectedSignature;
  }

  /**
   * Creates an order/invoice via Tokopay
   */
  public static async createOrder(params: TokopayOrderRequest): Promise<TokopayOrderResponse> {
    const { refId, amount, paymentChannel = 'QRIS' } = params;

    // Sandbox Simulation Mode
    if (config.tokopay.isSandbox) {
      console.log(`[Tokopay Sandbox] Simulating order creation for RefID: ${refId}, Amount: ${amount}`);
      
      // Generate a nice visual QR code using qrserver API representing the invoice payment
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
      const { merchantId, secretKey } = config.tokopay;

      console.log(`[Tokopay API] Creating order via GET. Merchant: ${merchantId}, RefID: ${refId}, Amount: ${amount}, Channel: ${paymentChannel}`);

      // Tokopay endpoint for creating orders via GET method
      const url = `https://api.tokopay.id/v1/order?merchant=${merchantId}&secret=${secretKey}&ref_id=${refId}&nominal=${amount}&metode=${paymentChannel}`;
      const response = await axios.get(url);

      const data = response.data;
      console.log('[Tokopay API] Response Data:', JSON.stringify({
        ...data,
        data: data.data ? { ...data.data, qr_string: 'HIDDEN' } : undefined
      }));

      if (data.status === 'Success' || data.success) {
        return {
          success: true,
          paymentLink: data.data.pay_url || data.data.payment_url || data.data.checkout_url,
          paymentQr: data.data.qr_link || data.data.qr_data,
          refId
        };
      }

      return {
        success: false,
        refId,
        errorMessage: data.error_msg || data.message || 'Unknown Tokopay error'
      };
    } catch (error: any) {
      console.error('Tokopay Order Creation Error:', error.message);
      if (error.response && error.response.data) {
        console.error('[Tokopay API] Error Response Data:', JSON.stringify(error.response.data));
      }
      return {
        success: false,
        refId,
        errorMessage: error.message
      };
    }
  }
}

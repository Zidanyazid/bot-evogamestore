import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config/env';

export interface DigiflazzOrderRequest {
  refId: string;
  skuCode: string; // e.g. ml5, ff50
  customerNo: string; // player ID, e.g. 12345678 (1234)
}

export interface DigiflazzOrderResponse {
  success: boolean;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  refId: string;
  price?: number;
  sn?: string; // Serial number / token code
  message?: string;
}

export class DigiflazzService {
  private static getMd5Hash(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex');
  }

  /**
   * Generates signature for Digiflazz: md5(username + apiKey + refId)
   */
  public static generateSignature(refId: string): string {
    const { username, apiKey } = config.digiflazz;
    return this.getMd5Hash(username + apiKey + refId);
  }

  /**
   * Checks Digiflazz reseller balance
   */
  public static async getBalance(): Promise<number> {
    if (config.digiflazz.isSandbox) {
      return 1500000; // Mock balance: Rp 1.500.000
    }

    try {
      const { username } = config.digiflazz;
      const signature = this.generateSignature('depo');

      const response = await axios.post('https://api.digiflazz.com/v1/depo', {
        username,
        sign: signature
      });

      if (response.data && response.data.data) {
        return response.data.data.balance || 0;
      }
      return 0;
    } catch (error) {
      console.error('Digiflazz getBalance error:', error);
      return 0;
    }
  }

  /**
   * Submits a top-up transaction request to Digiflazz
   */
  public static async createOrder(params: DigiflazzOrderRequest): Promise<DigiflazzOrderResponse> {
    const { refId, skuCode, customerNo } = params;

    // Sandbox Simulation Mode
    if (config.digiflazz.isSandbox) {
      console.log(`[Digiflazz Sandbox] Simulating top-up for SKU: ${skuCode}, Customer: ${customerNo}`);
      
      // Simulate successful result
      const mockSn = `SN-EVO-${Math.floor(100000 + Math.random() * 900000)}`;
      return {
        success: true,
        status: 'SUCCESS',
        refId,
        sn: mockSn,
        message: 'Sandbox Top-up Successful'
      };
    }

    // Real API Mode
    try {
      const { username } = config.digiflazz;
      const signature = this.generateSignature(refId);

      const response = await axios.post('https://api.digiflazz.com/v1/transaction', {
        username,
        buyer_sku_code: skuCode,
        customer_no: customerNo,
        ref_id: refId,
        sign: signature
      });

      const resData = response.data;
      if (resData && resData.data) {
        const transData = resData.data;
        const apiStatus = transData.status; // 'Pending', 'Success', 'Gagal'

        let status: 'PENDING' | 'SUCCESS' | 'FAILED' = 'PENDING';
        if (apiStatus.toLowerCase() === 'success') {
          status = 'SUCCESS';
        } else if (apiStatus.toLowerCase() === 'gagal') {
          status = 'FAILED';
        }

        return {
          success: true,
          status,
          refId,
          price: transData.price,
          sn: transData.sn || undefined,
          message: transData.message || ''
        };
      }

      return {
        success: false,
        status: 'FAILED',
        refId,
        message: resData.message || 'Unknown response from Digiflazz'
      };
    } catch (error: any) {
      console.error('Digiflazz Order Execution Error:', error.message);
      return {
        success: false,
        status: 'FAILED',
        refId,
        message: error.message
      };
    }
  }
}

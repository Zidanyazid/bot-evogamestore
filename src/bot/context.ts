import { Context, SessionFlavor } from 'grammy';
import { Conversation, ConversationFlavor } from '@grammyjs/conversations';

export interface OrderSessionData {
  gameName?: string;
  productCode?: string;
  productPrice?: number;
  productName?: string;
  playerId?: string;
  zoneId?: string;
  depositAmount?: number;
  qty?: number; // Quantity selected for bulk ordering
  paymentMethod?: string; // Selected checkout payment method
}

export interface SessionData {
  orderState: OrderSessionData;
}

export type MyContext = Context & SessionFlavor<SessionData> & ConversationFlavor;
export type MyConversation = Conversation<MyContext>;
export type ContextWithSession = MyContext;
export type ContextType = MyContext;
export type ConversationType = MyConversation;

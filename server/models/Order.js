'use strict';

const mongoose = require('mongoose');
const { applyIdJson } = require('../lib/schemaJson');

const orderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  image: { type: String, default: '' },
  price: { type: Number, required: true },
  qty: { type: Number, required: true, min: 1 },
  colorId: { type: String, default: null },
  colorName: { type: String, default: '' },
  size: { type: String, default: null },
}, { _id: false });

const customerSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  phone: { type: String, required: true },
  address: { type: String, default: '' },
  note: { type: String, default: '' },
}, { _id: false });

const ORDER_STATUSES = ['awaiting_payment_confirmation', 'payment_rejected', 'registered', 'preparing', 'shipped', 'delivered'];
const SHIPPING_METHODS = ['tipax', 'post'];
const SHIPPING_PAYMENTS = ['postpaid', 'prepaid'];
const PAYMENT_METHODS = ['bank_gateway', 'card_to_card'];

const orderSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  customer: { type: customerSchema, required: true },
  items: { type: [orderItemSchema], required: true, validate: v => v.length > 0 },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ORDER_STATUSES, default: 'registered' },

  // اگر کد تخفیف اعمال شده: subtotal مبلغ قبل از تخفیف، total (بالا) مبلغ نهایی پس از کسر تخفیف + هزینه ارسال
  subtotal: { type: Number, default: null },
  discountCode: { type: String, default: '' },
  discountAmount: { type: Number, default: 0 },
  shippingFee: { type: Number, default: 0 },

  // مقدار پیش‌فرض تا قبل از تکمیل دسته‌ی ۱ (فرم چک‌اوت هنوز این فیلدها رو نمی‌فرسته)
  shippingMethod: { type: String, enum: SHIPPING_METHODS, default: 'post' },
  shippingPayment: { type: String, enum: SHIPPING_PAYMENTS, default: 'postpaid' },
  paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'card_to_card' },
  receiptImageUrl: { type: String, default: '' },
  paymentDeadlineAt: { type: Date, default: null },
  confirmedAt: { type: Date, default: null },
}, { timestamps: true });

applyIdJson(orderSchema);

const Order = mongoose.model('Order', orderSchema);
Order.STATUSES = ORDER_STATUSES;
Order.SHIPPING_METHODS = SHIPPING_METHODS;
Order.SHIPPING_PAYMENTS = SHIPPING_PAYMENTS;
Order.PAYMENT_METHODS = PAYMENT_METHODS;

module.exports = Order;

'use strict';

const Product = require('../models/Product');
const User = require('../models/User');
const { broadcast } = require('../lib/notifier');

function discountBroadcastMessage(product) {
  const value = product.discountType === 'percent'
    ? `${Number(product.discountValue)}٪`
    : `${Number(product.discountValue || 0).toLocaleString('fa-IR')} تومان`;
  return `تخفیف ویژه روی «${product.name}»: ${value} تخفیف!`;
}

async function listProducts() {
  return Product.find().sort({ createdAt: -1 });
}

async function getProductById(id) {
  return Product.findById(id);
}

async function searchProducts({ category, search } = {}) {
  const query = {};
  if (category) query.category = category;
  if (search) query.name = { $regex: String(search).trim(), $options: 'i' };
  return Product.find(query).sort({ createdAt: -1 });
}

async function createProduct(payload) {
  return Product.create(payload);
}

async function getNextCode() {
  return Product.generateNextCode();
}

async function updateProduct(id, payload) {
  return Product.findByIdAndUpdate(id, payload, { returnDocument: 'after', runValidators: true });
}

async function deleteProduct(id) {
  await Product.deleteOne({ _id: id });
}

async function notifyDiscount(id) {
  const product = await Product.findById(id);
  if (!product) return { ok: false, error: 'not_found' };
  if (!product.getPublicView().discountActive) {
    return { ok: false, error: 'no_active_discount' };
  }

  const users = await User.find({}, 'phone');
  const phones = users.map(u => u.phone).filter(Boolean);
  const result = await broadcast(discountBroadcastMessage(product), phones);
  return { ok: result.ok, recipients: phones.length };
}

module.exports = { listProducts, getProductById, searchProducts, createProduct, updateProduct, deleteProduct, notifyDiscount, getNextCode };

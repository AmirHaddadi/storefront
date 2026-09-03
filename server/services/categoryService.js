'use strict';

const Category = require('../models/Category');

async function listCategories() {
  return Category.find().sort({ createdAt: 1 });
}

async function createCategory(payload) {
  return Category.create(payload);
}

async function updateCategory(id, payload) {
  return Category.findByIdAndUpdate(id, payload, { returnDocument: 'after', runValidators: true });
}

async function deleteCategory(id) {
  await Category.deleteOne({ _id: id });
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };

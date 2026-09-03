'use strict';

const User = require('../models/User');

const EDITABLE_FIELDS = ['firstName', 'lastName', 'phone', 'address', 'postalCode', 'province', 'city'];

async function listUsers() {
  return User.find().sort({ createdAt: -1 });
}

async function getUserById(id) {
  return User.findById(id);
}

async function updateUser(id, fields) {
  const update = {};
  EDITABLE_FIELDS.forEach(key => {
    if (fields[key] !== undefined) update[key] = String(fields[key]).trim();
  });
  return User.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true });
}

async function deleteUser(id) {
  await User.deleteOne({ _id: id });
}

module.exports = { listUsers, getUserById, updateUser, deleteUser };

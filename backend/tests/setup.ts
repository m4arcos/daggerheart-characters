import { beforeEach } from 'vitest';
import db, { clearAll } from '../src/db';
import { generateToken, hashPassword } from '../src/auth';

export const TEST_USER_ID = 'test-user-id';
export const TEST_ADMIN_ID = 'test-admin-id';
export const OTHER_USER_ID = 'other-user-id';

export const testToken = generateToken({
  userId: TEST_USER_ID,
  nome: 'Test User',
  email: 'test@example.com',
  isAdmin: false,
  requiresPasswordChange: false,
});

export const adminToken = generateToken({
  userId: TEST_ADMIN_ID,
  nome: 'Admin Test',
  email: 'admin@example.com',
  isAdmin: true,
  requiresPasswordChange: false,
});

export const otherToken = generateToken({
  userId: 'other-user-id',
  nome: 'Other',
  email: 'other@test.com',
  isAdmin: false,
  requiresPasswordChange: false,
});

beforeEach(() => {
  clearAll();
  db.prepare(
    'INSERT INTO users (id, nome, email, senha_temp, temp_ativa) VALUES (?, ?, ?, ?, 1)'
  ).run(TEST_USER_ID, 'Test User', 'test@example.com', hashPassword('temp'));
  db.prepare(
    'INSERT INTO users (id, nome, email, senha_temp, temp_ativa, is_admin) VALUES (?, ?, ?, ?, 1, 1)'
  ).run(TEST_ADMIN_ID, 'Admin Test', 'admin@example.com', hashPassword('temp'));
  db.prepare(
    'INSERT INTO users (id, nome, email, senha_temp, temp_ativa) VALUES (?, ?, ?, ?, 1)'
  ).run(OTHER_USER_ID, 'Other User', 'other@test.com', hashPassword('temp'));
});

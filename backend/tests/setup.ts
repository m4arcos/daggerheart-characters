import { beforeAll, beforeEach } from 'vitest';
import pool, { clearAll, initDb } from '../src/db';
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

beforeAll(async () => {
  await initDb();
});

beforeEach(async () => {
  await clearAll();
  await pool.query(
    'INSERT INTO users (id, nome, email, senha_temp, temp_ativa) VALUES ($1, $2, $3, $4, TRUE)',
    [TEST_USER_ID, 'Test User', 'test@example.com', hashPassword('temp')]
  );
  await pool.query(
    'INSERT INTO users (id, nome, email, senha_temp, temp_ativa, is_admin) VALUES ($1, $2, $3, $4, TRUE, TRUE)',
    [TEST_ADMIN_ID, 'Admin Test', 'admin@example.com', hashPassword('temp')]
  );
  await pool.query(
    'INSERT INTO users (id, nome, email, senha_temp, temp_ativa) VALUES ($1, $2, $3, $4, TRUE)',
    [OTHER_USER_ID, 'Other User', 'other@test.com', hashPassword('temp')]
  );
});

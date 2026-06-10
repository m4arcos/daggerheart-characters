import { beforeEach } from 'vitest';
import { clearAll } from '../src/db';

beforeEach(() => {
  clearAll();
});

import { getStore } from '../src/lib/db';
const store = await getStore();
try {
  await store.migrate();
  console.log('All tracked migrations applied successfully.');
} finally {
  await store.close();
}

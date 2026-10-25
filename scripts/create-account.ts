import { z } from 'zod';
import { getAuth } from '../src/lib/auth';
import { getStore } from '../src/lib/db';

// Operator-only stdin, never CLI arguments, committed files, or an HTTP bootstrap endpoint.
let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
  if (Buffer.byteLength(input) > 16384) throw new Error('Account input exceeds 16 KB');
}
const credentials = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email(),
  password: z.string().min(10).max(128),
}).parse(JSON.parse(input));
process.env.DISABLE_SIGNUP = 'false'; // This one CLI process only; public registration stays closed.
try {
  const result = await (await getAuth()).api.signUpEmail({ body: credentials });
  console.log(`Created account: ${result.user.email}`);
} finally {
  await (await getStore()).close();
}

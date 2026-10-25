import { getAuth } from './auth';
import { CollectionError } from './collection';
import { ProviderUnavailable } from './provider';
import { ZodError } from 'zod';
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
export async function requireUser(request: Request) {
  const session = await (await getAuth()).api.getSession({ headers: request.headers });
  if (!session) throw new CollectionError(401, 'Please sign in to access your collection.');
  if (!['GET', 'HEAD'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const expected = new URL(process.env.BETTER_AUTH_URL || 'http://localhost:3000').origin;
    if (origin !== expected) throw new CollectionError(403, 'Request origin is not allowed.');
  }
  return session.user;
}
export async function body(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 5_000_000)
    throw new CollectionError(413, 'Import exceeds the 5 MB limit.');
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new CollectionError(415, 'Expected a JSON request.');
  const reader = request.body?.getReader();
  if (!reader) throw new CollectionError(400, 'Request body is missing.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 5_000_000) {
      await reader.cancel();
      throw new CollectionError(413, 'Import exceeds the 5 MB limit.');
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new CollectionError(400, 'Invalid JSON.');
  }
}
export function failure(error: unknown) {
  if (error instanceof CollectionError)
    return json({ error: error.message, existingId: error.existingId }, error.status);
  if (error instanceof ProviderUnavailable)
    return json({ error: error.message, unavailable: true }, 503);
  if (error instanceof ZodError)
    return json(
      {
        error: error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .slice(0, 5)
          .join('; '),
      },
      400,
    );
  console.error('Game Shelf request failed:', error instanceof Error ? error.name : 'UnknownError');
  return json(
    { error: 'Something went wrong. Your changes may not have been saved. Refresh and try again.' },
    500,
  );
}

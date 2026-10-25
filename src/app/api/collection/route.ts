import { requireUser, body, json, failure } from '@/lib/http';
import { listEntries, saveEntry } from '@/lib/collection';
import { entrySchema } from '@/lib/model';
import { getBggGame, providerConfigured } from '@/lib/provider';
import { reserveMetadataRequest } from '@/lib/provider-quota';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return json({
      entries: await listEntries(user.id),
      user: { id: user.id, name: user.name, email: user.email },
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const input = entrySchema.parse(await body(request));
    if (input.source) {
      if (providerConfigured()) await reserveMetadataRequest(user.id);
      input.source = (await getBggGame(input.source.externalId)).source;
    }
    const id = await saveEntry(user.id, input);
    return json({ id }, 201);
  } catch (error) {
    return failure(error);
  }
}

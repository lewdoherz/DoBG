import { requireUser, body, json, failure } from '@/lib/http';
import { listEntries, saveEntry, removeEntry, CollectionError } from '@/lib/collection';
import { entrySchema } from '@/lib/model';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser(request),
      { id } = await context.params;
    const entry = (await listEntries(user.id)).find((e) => e.id === id);
    if (!entry) throw new CollectionError(404, 'Game not found');
    return json({ entry });
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: Request, context: Context) {
  try {
    const user = await requireUser(request),
      { id } = await context.params;
    return json({ id: await saveEntry(user.id, entrySchema.parse(await body(request)), id) });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireUser(request),
      { id } = await context.params;
    await removeEntry(user.id, id);
    return json({ deleted: true });
  } catch (error) {
    return failure(error);
  }
}

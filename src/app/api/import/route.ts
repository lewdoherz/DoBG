import { requireUser, body, json, failure } from '@/lib/http';
import { importEntries } from '@/lib/collection';
import { archiveSchema } from '@/lib/model';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const archive = archiveSchema.parse(await body(request));
    return json(await importEntries(user.id, archive.entries));
  } catch (error) {
    return failure(error);
  }
}

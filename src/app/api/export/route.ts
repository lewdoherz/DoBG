import { requireUser, json, failure } from '@/lib/http';
import { listEntries } from '@/lib/collection';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const response = json({
      format: 'game-shelf',
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: await listEntries(user.id),
    });
    response.headers.set('Content-Disposition', 'attachment; filename="game-shelf-v1.json"');
    return response;
  } catch (error) {
    return failure(error);
  }
}

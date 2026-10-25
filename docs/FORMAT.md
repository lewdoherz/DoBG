# Game Shelf JSON v1

UTF-8 JSON, MIME `application/json`, downloaded as `game-shelf-YYYY-MM-DD.json`. Runtime validation is defined by `archiveSchema` and `entrySchema` in `src/lib/model.ts`; this is the authoritative contract. Maximum import: 5,000,000 bytes and 2,000 entries. Export is private and includes notes and storage locations.

```json
{
  "format": "game-shelf",
  "version": 1,
  "exportedAt": "2026-10-25T12:00:00.000Z",
  "entries": [
    {
      "id": "6f4626b9-21dc-46b2-8c72-6b11aaebaf7c",
      "metadata": {
        "title": "Example custom game · 示例",
        "aliases": ["Example alias"],
        "description": "A user-authored example, not provider metadata.",
        "cover": "",
        "year": null,
        "minPlayers": 2,
        "maxPlayers": 4,
        "minMinutes": null,
        "maxMinutes": null,
        "age": null,
        "complexity": null,
        "mechanics": [],
        "categories": [],
        "kind": "base",
        "baseGames": [],
        "expansions": []
      },
      "source": null,
      "status": "owned",
      "edition": { "name": "", "language": "简体中文", "publisher": "" },
      "copies": [
        {
          "location": "Living room",
          "edition": { "name": "", "language": "简体中文", "publisher": "" }
        }
      ],
      "notes": "Private user-authored text",
      "pitch": "A short user-authored pitch",
      "tags": ["Family"],
      "rating": null
    }
  ]
}
```

The example is documentation only; no fixture is automatically loaded into the app.

- `id`: optional UUID stable across exports/imports. Internally each account has a separate record even if it imports the same stable ID. Missing IDs are assigned. `updatedAt` may appear in exports; importer ignores it and records import time.
- `metadata`: editable user metadata. Title required (1–240 characters); Unicode is preserved. Unknown numbers are `null`, unknown text is `""`, unknown sets are `[]`. Minimum must not exceed maximum. Player/time counts positive integers up to 10,000; age 0–99; complexity 1–5; rating 0–10. Cover is empty or an HTTPS URL, never HTML or binary data. No purchase data is collected in M1.
- `source`: null for manual entry; otherwise `{provider:"bgg", externalId:"123", url:"https://boardgamegeek.com/boardgame/123", fetchedAt:"…ISO timestamp…", metadata:{…original metadata…}}`. Source metadata remains distinct from user edits. Imported source claims are untrusted historical attribution, not freshly verified live provider results. Import does not contact BGG or grant any new image/content license.
- `edition`: the preferred edition for the collection entry, with optional name, language, publisher. Unknown remains blank.
- `copies`: each copy has its own stable identity, edition, order, and private location. Ordinary edits preserve copy IDs and array order. Copy IDs can appear in export but are not trusted as database IDs on import; import assigns new account-local copy identities. Owned requires 1–100 copies; wishlist requires zero. One canonical game can have multiple physical editions without duplicate collection entries.
- `kind`: `base`, `expansion`, or `unknown` when not recorded. Relationships contain known base/expansion titles, not fabricated IDs; they can be incomplete and are editable.
- `notes`, `pitch`, `tags`, `rating`: personal data separate from source metadata. Notes up to 10,000 characters; pitch 500; up to 50 tags/aliases/mechanics/categories/relationship names per field. No HTML rendering.

## Merge semantics

All entries validate before any insert; the import transaction commits everything or nothing. A record is skipped if its stable ID **or** game identity already exists in the target account. Identity is `bgg:externalId` for source-backed games, otherwise `custom:` + NFKC-normalized/case-folded title. Duplicates within the file are skipped too. Re-import is idempotent. Existing metadata, notes, editions and copies are never overwritten; use Edit to update. Restore into an empty account for an exact collection restoration. Provider metadata imported from a file is not reverified and is labelled accordingly on the detail page.

Exports do not contain account identifiers, email, password hashes, session tokens, provider credentials, or the rest of any other user's collection. Account-level disaster recovery needs a PostgreSQL backup, not this format.

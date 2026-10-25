ALTER TABLE "rateLimit" ALTER COLUMN count TYPE integer USING (count::text)::integer;
ALTER TABLE "rateLimit" ALTER COLUMN "lastRequest" TYPE bigint USING ("lastRequest"::text)::bigint;

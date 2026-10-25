ALTER TABLE physical_copy ADD COLUMN position integer NOT NULL DEFAULT 0;
WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY entry_id ORDER BY id) - 1 AS ordinal
  FROM physical_copy
)
UPDATE physical_copy SET position = ordered.ordinal FROM ordered WHERE physical_copy.id = ordered.id;
CREATE UNIQUE INDEX copy_entry_position ON physical_copy(entry_id, position);

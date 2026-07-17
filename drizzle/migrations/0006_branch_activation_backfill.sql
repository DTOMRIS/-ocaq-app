UPDATE "branches"
SET
	"activated_at" = "created_at",
	"updated_at" = now(),
	"version" = "version" + 1
WHERE
	"is_active" = true
	AND "is_archived" = false
	AND "activated_at" IS NULL;

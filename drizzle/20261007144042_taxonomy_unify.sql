CREATE TABLE "project_tags" (
	"project_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "project_tags_project_id_tag_id_pk" PRIMARY KEY("project_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "sort" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "kind" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "kind" SET DATA TYPE text;--> statement-breakpoint
UPDATE "tags" SET "kind" = 'thread_status' WHERE "kind" IN ('topic', 'skill');
--> statement-breakpoint
UPDATE "tags" SET "label" = 'PROPOSAL', "sort" = 0 WHERE "slug" = 'proposal';
--> statement-breakpoint
UPDATE "tags" SET "label" = 'QUESTION', "sort" = 1 WHERE "slug" = 'question';
--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "sort" DROP DEFAULT;
--> statement-breakpoint
DROP TYPE "public"."tag_kind";--> statement-breakpoint
CREATE TYPE "public"."tag_kind" AS ENUM('thread_status', 'tech', 'ticket_label');--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "kind" SET DATA TYPE "public"."tag_kind" USING "kind"::"public"."tag_kind";--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "kind" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_tags_tag_id_idx" ON "project_tags" USING btree ("tag_id");--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "techs";--> statement-breakpoint
ALTER TABLE "threads" DROP COLUMN "techs";

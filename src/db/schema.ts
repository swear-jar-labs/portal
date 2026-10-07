import { relations, sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// Timestamps are `timestamptz`: the mock phase used naive timestamps and the
// readroom clocks were the first to notice. `updatedAt` columns carry an
// app-level $onUpdate; database triggers stay in the backlog.

export const projectStatus = pgEnum("project_status", ["planned", "active", "archived"]);
export const forgeId = pgEnum("forge_id", ["github", "gitlab"]);
// Membership, project roles and the lead are independent relations: one row
// per (project, user, role), so a person may subscribe, review and maintain at
// once, and the lead is a single partial-unique row.
export const projectRole = pgEnum("project_role", ["member", "reviewer", "maintainer", "lead"]);
export const ticketStatus = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "review",
  "done",
  "closed",
]);
export const ticketSize = pgEnum("ticket_size", ["S", "M", "L"]);
export const ticketPriority = pgEnum("ticket_priority", ["low", "normal", "high"]);
export const ticketLinkKind = pgEnum("ticket_link_kind", ["pr", "commit", "file", "diff"]);
// Member applications and project proposals share one review vocabulary
// (applications.ts / submissions.ts): statuses, versions and event history.
export const submissionStatus = pgEnum("submission_status", [
  "pending",
  "needs-info",
  "approved",
  "rejected",
]);
export const submissionEventKind = pgEnum("submission_event_kind", [
  "submitted",
  "clarification-requested",
  "clarification-sent",
  "approved",
  "rejected",
]);
// Taxonomies (`tags`, `thread_tags`, `project_tags`, `ticket_tags`) share one
// table: `tags.kind` names the vocabulary (`thread_status` for the board's
// proposal/question chips, `tech` for the shared stack, `ticket_label` for
// the tickets card), every binding is a join row, labels and the order
// inside a kind (`sort`) read from the rows. `readroom_tags` and ticket
// label rows arrive with their cards (`backend-readroom`/`backend-tickets`);
// empty tables are not created ahead of them.
export const tagKind = pgEnum("tag_kind", ["thread_status", "tech", "ticket_label"]);
export const voteTarget = pgEnum("vote_target", [
  "post",
  "thread",
  "ticket",
  "readroom_note",
  "readroom",
]);

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  // Community level (participant|member) is text + zod (TECH §3/§4): admin is
  // a separate flag, never a level; project roles live on project_members.
  level: text("level").notNull().default("participant"),
  admin: boolean("admin").notNull().default(false),
  bio: text("bio").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable("verification", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// The settings the shell persists per account: the screensaver switch and its
// delay (see NEXT-STEPS §8; the UI phase kept them in localStorage).
export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  screensaverEnabled: boolean("screensaver_enabled").notNull().default(true),
  screensaverDelayMinutes: integer("screensaver_delay_minutes").notNull().default(5),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const sections = pgTable("sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  repoUrl: text("repo_url"),
  // Structural forge coordinates (forge-integration): the URL stays the UI
  // link, counters read project_forge_stats.
  forge: forgeId("forge"),
  repoHost: text("repo_host"),
  repoPath: text("repo_path"),
  siteUrl: text("site_url"),
  // The stack lives in project_tags (the shared tech vocabulary): join rows,
  // ordered by tags.sort, never a column array.
  contributors: text("contributors"),
  status: projectStatus("status").notNull().default("planned"),
  // The claim ladder (RULES §15): done S tickets open M, done M open L;
  // 0 opens the rung to everyone.
  claimMinSForM: integer("claim_min_s_for_m").notNull().default(2),
  claimMinMForL: integer("claim_min_m_for_l").notNull().default(1),
  requiredApprovals: integer("required_approvals").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectMembers = pgTable(
  "project_members",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: projectRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.userId, table.role] }),
    index("project_members_user_id_idx").on(table.userId),
    // One lead per project; a vacancy is the absence of the row.
    uniqueIndex("project_members_lead_unique")
      .on(table.projectId)
      .where(sql`${table.role} = 'lead'`),
  ],
);

export const projectForgeStats = pgTable("project_forge_stats", {
  projectId: uuid("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  forge: forgeId("forge").notNull(),
  openPrs: integer("open_prs").notNull().default(0),
  merged30d: integer("merged_30d").notNull().default(0),
  commits7d: integer("commits_7d").notNull().default(0),
  releaseTag: text("release_tag"),
  releaseAt: timestamp("release_at", { withTimezone: true }),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  etag: text("etag"),
  error: text("error"),
});

export const threads = pgTable(
  "threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    // Statuses and techs alike bind through thread_tags (tags.kind tells
    // them apart); the column array is gone.
    pinned: boolean("pinned").notNull().default(false),
    locked: boolean("locked").notNull().default(false),
    lastPostAt: timestamp("last_post_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("threads_section_id_idx").on(table.sectionId),
    index("threads_project_id_idx").on(table.projectId),
    index("threads_author_id_idx").on(table.authorId),
    index("threads_last_post_at_idx").on(table.lastPostAt),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // The answered post: the list stays flat, the marker carries the context.
    replyToId: uuid("reply_to_id").references((): AnyPgColumn => posts.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("posts_thread_id_idx").on(table.threadId),
    index("posts_author_id_idx").on(table.authorId),
    index("posts_created_at_idx").on(table.createdAt),
  ],
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // The human key (DOS-12): the dossier route and the readroom chip read it.
    // UUID stays the PK; Phase 5 generates the key per project (serial).
    key: text("key").notNull().unique(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assigneeId: uuid("assignee_id").references(() => user.id, { onDelete: "set null" }),
    // Claiming assigns one project reviewer alongside the assignee.
    reviewerId: uuid("reviewer_id").references(() => user.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: ticketStatus("status").notNull().default("open"),
    // The size flag of RULES §15 and the queue order; the app sets both.
    size: ticketSize("size").notNull().default("S"),
    priority: ticketPriority("priority").notNull().default("normal"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => [
    index("tickets_project_id_idx").on(table.projectId),
    index("tickets_status_idx").on(table.status),
    index("tickets_assignee_id_idx").on(table.assigneeId),
    index("tickets_reviewer_id_idx").on(table.reviewerId),
  ],
);

export const ticketComments = pgTable(
  "ticket_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("ticket_comments_ticket_id_idx").on(table.ticketId)],
);

export const ticketLinks = pgTable(
  "ticket_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    kind: ticketLinkKind("kind").notNull(),
    url: text("url").notNull(),
    label: text("label").notNull(),
    revision: text("revision"),
    addedBy: uuid("added_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ticket_links_ticket_url_unique").on(table.ticketId, table.url),
    index("ticket_links_ticket_id_idx").on(table.ticketId),
    index("ticket_links_added_by_idx").on(table.addedBy),
  ],
);

export const ticketBlocks = pgTable(
  "ticket_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // `blocked_id` waits for `blocker_id` to finish (RULES §15).
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ticket_blocks_pair_unique").on(table.blockerId, table.blockedId),
    index("ticket_blocks_blocker_id_idx").on(table.blockerId),
    index("ticket_blocks_blocked_id_idx").on(table.blockedId),
  ],
);

export const readrooms = pgTable(
  "readrooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    sourceUrl: text("source_url"),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    report: text("report"),
    reportAt: timestamp("report_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("readrooms_deadline_at_idx").on(table.deadlineAt)],
);

export const readroomNotes = pgTable(
  "readroom_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    readroomId: uuid("readroom_id")
      .notNull()
      .references(() => readrooms.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("readroom_notes_readroom_id_idx").on(table.readroomId)],
);

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  kind: tagKind("kind").notNull(),
  // The order inside one kind: status chips, tech pickers and stack rows all
  // sort by it; user-defined order is not supported.
  sort: integer("sort").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const threadTags = pgTable(
  "thread_tags",
  {
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.threadId, table.tagId] }),
    index("thread_tags_tag_id_idx").on(table.tagId),
  ],
);

export const ticketTags = pgTable(
  "ticket_tags",
  {
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.ticketId, table.tagId] }),
    index("ticket_tags_tag_id_idx").on(table.tagId),
  ],
);

export const projectTags = pgTable(
  "project_tags",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.tagId] }),
    index("project_tags_tag_id_idx").on(table.tagId),
  ],
);

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetType: voteTarget("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("votes_user_target_unique").on(table.userId, table.targetType, table.targetId),
    index("votes_target_idx").on(table.targetType, table.targetId),
  ],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: submissionStatus("status").notNull().default("pending"),
    // Optimistic-concurrency counter: the applicant and the admin answer the
    // revision they saw; history carries every step.
    version: integer("version").notNull().default(1),
    experience: text("experience").notNull().default(""),
    weeklyHours: text("weekly_hours").notNull(),
    motivation: text("motivation").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("applications_user_id_idx").on(table.userId),
    index("applications_status_idx").on(table.status),
  ],
);

export const applicationEvents = pgTable(
  "application_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    kind: submissionEventKind("kind").notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("application_events_application_id_idx").on(table.applicationId)],
);

export const projectSubmissions = pgTable(
  "project_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    goal: text("goal").notNull(),
    repoUrl: text("repo_url"),
    stack: text("stack")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    contributors: text("contributors").notNull().default(""),
    status: submissionStatus("status").notNull().default("pending"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("project_submissions_user_id_idx").on(table.userId),
    index("project_submissions_status_idx").on(table.status),
  ],
);

export const projectSubmissionEvents = pgTable(
  "project_submission_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id").notNull(),
    kind: submissionEventKind("kind").notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("project_submission_events_submission_id_idx").on(table.submissionId),
    // Named by hand: the generated name would exceed PostgreSQL's 63-character
    // identifier limit and come back truncated.
    foreignKey({
      columns: [table.submissionId],
      foreignColumns: [projectSubmissions.id],
      name: "project_submission_events_submission_id_fk",
    }).onDelete("cascade"),
  ],
);

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  settings: one(userSettings),
  threads: many(threads),
  posts: many(posts),
  ticketComments: many(ticketComments),
  ticketLinks: many(ticketLinks),
  authoredTickets: many(tickets, { relationName: "ticket_author" }),
  assignedTickets: many(tickets, { relationName: "ticket_assignee" }),
  reviewedTickets: many(tickets, { relationName: "ticket_reviewer" }),
  readroomsLed: many(readrooms),
  readroomNotes: many(readroomNotes),
  votes: many(votes),
  applications: many(applications),
  projectSubmissions: many(projectSubmissions),
  projectMemberships: many(projectMembers),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(user, { fields: [userSettings.userId], references: [user.id] }),
}));

export const sectionRelations = relations(sections, ({ many }) => ({
  threads: many(threads),
}));

export const projectRelations = relations(projects, ({ many, one }) => ({
  threads: many(threads),
  tickets: many(tickets),
  members: many(projectMembers),
  forgeStats: one(projectForgeStats),
  projectTags: many(projectTags),
}));

export const projectMemberRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(user, { fields: [projectMembers.userId], references: [user.id] }),
}));

export const projectForgeStatsRelations = relations(projectForgeStats, ({ one }) => ({
  project: one(projects, { fields: [projectForgeStats.projectId], references: [projects.id] }),
}));

export const threadRelations = relations(threads, ({ one, many }) => ({
  section: one(sections, { fields: [threads.sectionId], references: [sections.id] }),
  project: one(projects, { fields: [threads.projectId], references: [projects.id] }),
  author: one(user, { fields: [threads.authorId], references: [user.id] }),
  posts: many(posts),
  threadTags: many(threadTags),
}));

export const postRelations = relations(posts, ({ one, many }) => ({
  thread: one(threads, { fields: [posts.threadId], references: [threads.id] }),
  author: one(user, { fields: [posts.authorId], references: [user.id] }),
  replyTo: one(posts, {
    fields: [posts.replyToId],
    references: [posts.id],
    relationName: "post_reply",
  }),
  replies: many(posts, { relationName: "post_reply" }),
}));

export const readroomRelations = relations(readrooms, ({ one, many }) => ({
  lead: one(user, { fields: [readrooms.leadId], references: [user.id] }),
  ticket: one(tickets, { fields: [readrooms.ticketId], references: [tickets.id] }),
  notes: many(readroomNotes),
}));

export const readroomNoteRelations = relations(readroomNotes, ({ one }) => ({
  readroom: one(readrooms, { fields: [readroomNotes.readroomId], references: [readrooms.id] }),
  author: one(user, { fields: [readroomNotes.authorId], references: [user.id] }),
}));

export const ticketRelations = relations(tickets, ({ one, many }) => ({
  project: one(projects, { fields: [tickets.projectId], references: [projects.id] }),
  author: one(user, {
    fields: [tickets.authorId],
    references: [user.id],
    relationName: "ticket_author",
  }),
  assignee: one(user, {
    fields: [tickets.assigneeId],
    references: [user.id],
    relationName: "ticket_assignee",
  }),
  reviewer: one(user, {
    fields: [tickets.reviewerId],
    references: [user.id],
    relationName: "ticket_reviewer",
  }),
  comments: many(ticketComments),
  links: many(ticketLinks),
  ticketTags: many(ticketTags),
  blocks: many(ticketBlocks, { relationName: "ticket_blocker" }),
  blockedBy: many(ticketBlocks, { relationName: "ticket_blocked" }),
}));

export const ticketCommentRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketComments.ticketId], references: [tickets.id] }),
  author: one(user, { fields: [ticketComments.authorId], references: [user.id] }),
}));

export const ticketLinkRelations = relations(ticketLinks, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketLinks.ticketId], references: [tickets.id] }),
  addedBy: one(user, { fields: [ticketLinks.addedBy], references: [user.id] }),
}));

export const ticketBlockRelations = relations(ticketBlocks, ({ one }) => ({
  blocker: one(tickets, {
    fields: [ticketBlocks.blockerId],
    references: [tickets.id],
    relationName: "ticket_blocker",
  }),
  blocked: one(tickets, {
    fields: [ticketBlocks.blockedId],
    references: [tickets.id],
    relationName: "ticket_blocked",
  }),
}));

export const tagRelations = relations(tags, ({ many }) => ({
  threadTags: many(threadTags),
  ticketTags: many(ticketTags),
  projectTags: many(projectTags),
}));

export const threadTagRelations = relations(threadTags, ({ one }) => ({
  thread: one(threads, { fields: [threadTags.threadId], references: [threads.id] }),
  tag: one(tags, { fields: [threadTags.tagId], references: [tags.id] }),
}));

export const ticketTagRelations = relations(ticketTags, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketTags.ticketId], references: [tickets.id] }),
  tag: one(tags, { fields: [ticketTags.tagId], references: [tags.id] }),
}));

export const projectTagRelations = relations(projectTags, ({ one }) => ({
  project: one(projects, { fields: [projectTags.projectId], references: [projects.id] }),
  tag: one(tags, { fields: [projectTags.tagId], references: [tags.id] }),
}));

export const voteRelations = relations(votes, ({ one }) => ({
  user: one(user, { fields: [votes.userId], references: [user.id] }),
}));

export const applicationRelations = relations(applications, ({ one, many }) => ({
  user: one(user, { fields: [applications.userId], references: [user.id] }),
  events: many(applicationEvents),
}));

export const applicationEventRelations = relations(applicationEvents, ({ one }) => ({
  application: one(applications, {
    fields: [applicationEvents.applicationId],
    references: [applications.id],
  }),
  actor: one(user, { fields: [applicationEvents.actorId], references: [user.id] }),
}));

export const projectSubmissionRelations = relations(projectSubmissions, ({ one, many }) => ({
  user: one(user, { fields: [projectSubmissions.userId], references: [user.id] }),
  events: many(projectSubmissionEvents),
}));

export const projectSubmissionEventRelations = relations(projectSubmissionEvents, ({ one }) => ({
  submission: one(projectSubmissions, {
    fields: [projectSubmissionEvents.submissionId],
    references: [projectSubmissions.id],
  }),
  actor: one(user, { fields: [projectSubmissionEvents.actorId], references: [user.id] }),
}));

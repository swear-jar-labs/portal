import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const projectStatus = pgEnum("project_status", ["planned", "active", "archived"]);
export const ticketStatus = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "review",
  "done",
  "closed",
]);
export const tagKind = pgEnum("tag_kind", ["topic", "skill"]);
export const voteTarget = pgEnum("vote_target", ["post", "thread", "ticket", "readroom_note"]);
export const applicationRole = pgEnum("application_role", ["op", "learner"]);
export const applicationStatus = pgEnum("application_status", [
  "new",
  "reviewing",
  "accepted",
  "rejected",
]);

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  role: text("role").notNull().default("caller"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable("verification", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sections = pgTable("sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  repoUrl: text("repo_url"),
  stack: text("stack"),
  status: projectStatus("status").notNull().default("planned"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
    pinned: boolean("pinned").notNull().default(false),
    locked: boolean("locked").notNull().default(false),
    lastPostAt: timestamp("last_post_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
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
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    editedAt: timestamp("edited_at"),
    deletedAt: timestamp("deleted_at"),
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
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assigneeId: uuid("assignee_id").references(() => user.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: ticketStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    closedAt: timestamp("closed_at"),
  },
  (table) => [
    index("tickets_project_id_idx").on(table.projectId),
    index("tickets_status_idx").on(table.status),
    index("tickets_assignee_id_idx").on(table.assigneeId),
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
    createdAt: timestamp("created_at").notNull().defaultNow(),
    editedAt: timestamp("edited_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("ticket_comments_ticket_id_idx").on(table.ticketId)],
);

export const readrooms = pgTable(
  "readrooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    sourceUrl: text("source_url"),
    deadlineAt: timestamp("deadline_at").notNull(),
    archivedAt: timestamp("archived_at"),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    report: text("report"),
    reportAt: timestamp("report_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
    createdAt: timestamp("created_at").notNull().defaultNow(),
    editedAt: timestamp("edited_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("readroom_notes_readroom_id_idx").on(table.readroomId)],
);

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  kind: tagKind("kind").notNull().default("topic"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetType: voteTarget("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
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
    role: applicationRole("role").notNull(),
    user: text("user").notNull(),
    email: text("email").notNull(),
    experience: text("experience"),
    weeklyHours: text("weekly_hours"),
    motivation: text("motivation").notNull(),
    status: applicationStatus("status").notNull().default("new"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("applications_status_idx").on(table.status)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  threads: many(threads),
  posts: many(posts),
  ticketComments: many(ticketComments),
  authoredTickets: many(tickets, { relationName: "ticket_author" }),
  assignedTickets: many(tickets, { relationName: "ticket_assignee" }),
  readroomsLed: many(readrooms),
  readroomNotes: many(readroomNotes),
  votes: many(votes),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sectionRelations = relations(sections, ({ many }) => ({
  threads: many(threads),
}));

export const projectRelations = relations(projects, ({ many }) => ({
  threads: many(threads),
  tickets: many(tickets),
}));

export const threadRelations = relations(threads, ({ one, many }) => ({
  section: one(sections, { fields: [threads.sectionId], references: [sections.id] }),
  project: one(projects, { fields: [threads.projectId], references: [projects.id] }),
  author: one(user, { fields: [threads.authorId], references: [user.id] }),
  posts: many(posts),
  threadTags: many(threadTags),
}));

export const postRelations = relations(posts, ({ one }) => ({
  thread: one(threads, { fields: [posts.threadId], references: [threads.id] }),
  author: one(user, { fields: [posts.authorId], references: [user.id] }),
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
  comments: many(ticketComments),
  ticketTags: many(ticketTags),
}));

export const ticketCommentRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketComments.ticketId], references: [tickets.id] }),
  author: one(user, { fields: [ticketComments.authorId], references: [user.id] }),
}));

export const tagRelations = relations(tags, ({ many }) => ({
  threadTags: many(threadTags),
  ticketTags: many(ticketTags),
}));

export const threadTagRelations = relations(threadTags, ({ one }) => ({
  thread: one(threads, { fields: [threadTags.threadId], references: [threads.id] }),
  tag: one(tags, { fields: [threadTags.tagId], references: [tags.id] }),
}));

export const ticketTagRelations = relations(ticketTags, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketTags.ticketId], references: [tickets.id] }),
  tag: one(tags, { fields: [ticketTags.tagId], references: [tags.id] }),
}));

export const voteRelations = relations(votes, ({ one }) => ({
  user: one(user, { fields: [votes.userId], references: [user.id] }),
}));

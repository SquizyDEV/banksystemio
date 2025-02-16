import { pgTable, text, serial, integer, decimal, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  phoneNumber: text("phone_number"),
  fullName: text("full_name"),
  avatar: text("avatar"),
  banner: text("banner"),
  birthDate: text("birth_date"),
  rank: text("rank").default("Новичок"),
  theme: text("theme").default("dark"),
  isAdmin: boolean("is_admin").default(false),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0"),
});

export const virtualCards = pgTable("virtual_cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  cardNumber: text("card_number").notNull(),
  expiryDate: text("expiry_date").notNull(),
  cvv: text("cvv").notNull(),
  cardholderName: text("cardholder_name").notNull(),
  status: text("status").notNull().default("pending"), // pending, active, rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  requestReason: text("request_reason"),
  adminComment: text("admin_comment"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull(),
  toUserId: integer("to_user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // 'transfer', 'payment', 'cashback', 'admin_grant', 'refund'
  status: text("status").notNull().default("completed"), // completed, cancelled
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  originalTransactionId: integer("original_transaction_id"), // для рефандов
});

// Схемы для валидации
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  phoneNumber: true,
  fullName: true,
}).extend({
  theme: z.enum(["dark", "light"]).optional(),
  avatar: z.string().optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().optional(),
  phoneNumber: z.string().optional(),
  theme: z.enum(["dark", "light"]).optional(),
  avatar: z.string().optional(),
  password: z.string().optional(),
  isAdmin: z.boolean().optional(),
  balance: z.number().or(z.string()).transform(val => val.toString()).optional(),
});

export const insertVirtualCardSchema = createInsertSchema(virtualCards).pick({
  userId: true,
  cardholderName: true,
  requestReason: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  fromUserId: true,
  toUserId: true,
  amount: true,
  type: true,
  description: true,
});

export const updateVirtualCardSchema = z.object({
  status: z.enum(["active", "rejected"]),
  adminComment: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export const depositSchema = z.object({
  id: z.number(),
  userId: z.number(),
  amount: z.number(),
  status: z.enum(["pending", "completed", "rejected"]),
  method: z.enum(["card", "freekassa"]),
  comment: z.string(),
  createdAt: z.date().optional(),
});

export type Deposit = z.infer<typeof depositSchema>;
export type User = typeof users.$inferSelect;
export type VirtualCard = typeof virtualCards.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type UpdateVirtualCard = z.infer<typeof updateVirtualCardSchema>;
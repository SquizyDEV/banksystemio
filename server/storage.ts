import { IStorage } from "./storage-interface";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import {
  users,
  virtualCards,
  transactions,
  type User,
  type VirtualCard,
  type Transaction,
  type UpdateUser,
  type UpdateVirtualCard,
} from "@shared/schema";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async deleteVirtualCard(id: number): Promise<void> {
    await db.delete(virtualCards).where(eq(virtualCards.id, id));
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createUser(user: Partial<User>): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(userId: number, update: UpdateUser): Promise<User> {
    const updateData = { ...update };

    if (updateData.balance !== undefined) {
      updateData.balance = updateData.balance.toString().replace(/[^\d.-]/g, '');
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async updateUserBalance(userId: number, amount: number): Promise<User> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    const newBalance = parseFloat(user.balance || "0") + amount;
    const [updatedUser] = await db
      .update(users)
      .set({ balance: newBalance.toFixed(2) })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async getVirtualCardsByUserId(userId: number): Promise<VirtualCard[]> {
    return db.select().from(virtualCards).where(eq(virtualCards.userId, userId));
  }

  async getVirtualCardById(id: number): Promise<VirtualCard | undefined> {
    const [card] = await db
      .select()
      .from(virtualCards)
      .where(eq(virtualCards.id, id));
    return card;
  }

  async getVirtualCardByNumber(cardNumber: string): Promise<VirtualCard | undefined> {
    const [card] = await db
      .select()
      .from(virtualCards)
      .where(eq(virtualCards.cardNumber, cardNumber));
    return card;
  }

  async getPendingCards(): Promise<VirtualCard[]> {
    return db
      .select()
      .from(virtualCards)
      .where(eq(virtualCards.status, "pending"));
  }

  async getRejectedCards(): Promise<VirtualCard[]> {
    return db
      .select()
      .from(virtualCards)
      .where(eq(virtualCards.status, "rejected"));
  }

  async getActiveCards(): Promise<VirtualCard[]> {
    return db
      .select()
      .from(virtualCards)
      .where(eq(virtualCards.status, "active"));
  }

  async createVirtualCard(card: Partial<VirtualCard>): Promise<VirtualCard> {
    const cardNumber = '2200' + Math.random().toString().slice(2, 16);
    const expiryDate = "12/25";
    const cvv = Math.random().toString().slice(2, 5);

    const [newCard] = await db
      .insert(virtualCards)
      .values({
        ...card,
        cardNumber,
        expiryDate,
        cvv,
        status: "pending",
      })
      .returning();
    return newCard;
  }

  async updateVirtualCard(cardId: number, update: UpdateVirtualCard): Promise<VirtualCard | null> {
    if (update.status === 'rejected') {
      await db.delete(virtualCards).where(eq(virtualCards.id, cardId));
      return null;
    }

    const [updatedCard] = await db
      .update(virtualCards)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(virtualCards.id, cardId))
      .returning();
    return updatedCard;
  }

  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.fromUserId, userId),
          eq(transactions.toUserId, userId)
        )
      )
      .orderBy(desc(transactions.createdAt));
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(tx: Partial<Transaction>): Promise<Transaction> {
    const [newTx] = await db
      .insert(transactions)
      .values({
        ...tx,
        status: "completed",
      })
      .returning();

    if (tx.type !== 'refund') {
      await this.updateUserBalance(tx.fromUserId!, -parseFloat(tx.amount!.toString()));
      await this.updateUserBalance(tx.toUserId!, parseFloat(tx.amount!.toString()));
    }

    return newTx;
  }

  async cancelTransaction(txId: number): Promise<Transaction> {
    const [tx] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, txId));

    if (!tx) throw new Error("Transaction not found");
    if (tx.status === "cancelled") throw new Error("Transaction already cancelled");

    const refundTx = await this.createTransaction({
      fromUserId: tx.toUserId,
      toUserId: tx.fromUserId,
      amount: tx.amount,
      type: "refund",
      description: `Refund for transaction ${tx.id}`,
      originalTransactionId: tx.id,
    });

    const [cancelledTx] = await db
      .update(transactions)
      .set({ status: "cancelled" })
      .where(eq(transactions.id, txId))
      .returning();

    return cancelledTx;
  }
}

export const storage = new DatabaseStorage();


export class DepositStorage {
  constructor(private db: typeof import('./db').db) {}

  async createDeposit(data: { userId: number; amount: number; method: string; status: string; comment?: string }) {
    const [deposit] = await this.db.insert(deposits)
      .values({
        userId: data.userId,
        amount: data.amount,
        method: data.method,
        status: data.status,
        comment: data.comment
      })
      .returning();
    return deposit;
  }

  async getDeposits() {
    return this.db.select().from(deposits).orderBy(desc(deposits.createdAt));
  }

  async approveDeposit(id: number) {
    const [deposit] = await this.db.select().from(deposits).where(eq(deposits.id, id));
    if (!deposit) throw new Error('Deposit not found');

    await this.db.update(deposits)
      .set({ status: 'completed' })
      .where(eq(deposits.id, id));

    await this.db.update(users)
      .set({ balance: sql`CAST(balance AS DECIMAL) + ${deposit.amount}` })
      .where(eq(users.id, deposit.userId));

    return { ...deposit, status: 'completed' };
  }
}

export const depositStorage = new DepositStorage(db);
import { User, VirtualCard, Transaction, UpdateVirtualCard, UpdateUser } from "@shared/schema";
import { Store } from "express-session";

export interface IStorage {
  sessionStore: Store;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: Partial<User>): Promise<User>;
  updateUser(userId: number, update: UpdateUser): Promise<User>;
  updateUserBalance(userId: number, amount: number): Promise<User>;

  // Virtual card operations
  getVirtualCardsByUserId(userId: number): Promise<VirtualCard[]>;
  getVirtualCardById(cardId: number): Promise<VirtualCard | undefined>;
  getPendingCards(): Promise<VirtualCard[]>;
  createVirtualCard(card: Partial<VirtualCard>): Promise<VirtualCard>;
  updateVirtualCard(cardId: number, update: UpdateVirtualCard): Promise<VirtualCard>;

  // Transaction operations
  getTransactionsByUserId(userId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  createTransaction(tx: Partial<Transaction>): Promise<Transaction>;
  cancelTransaction(txId: number): Promise<Transaction>;
}
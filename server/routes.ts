import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage, depositStorage } from "./storage";
import {
  insertTransactionSchema,
  insertVirtualCardSchema,
  updateVirtualCardSchema,
  updateUserSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Обновление профиля пользователя
  app.patch("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const updateData = updateUserSchema.parse(req.body);
    const user = await storage.updateUser(req.user.id, updateData);
    res.json(user);
  });

  // Админ: получение списка всех пользователей
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(401);
    const users = await storage.getAllUsers();
    res.json(users);
  });

  // Админ: обновление пользователя
  app.patch("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(401);
    const userId = parseInt(req.params.id);
    const updateData = updateUserSchema.parse(req.body);

    try {
      const user = await storage.updateUser(userId, updateData);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Получение виртуальных карт пользователя
  app.get("/api/virtual-cards", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const cards = await storage.getVirtualCardsByUserId(req.user.id);
    res.json(cards);
  });

  // Получение конкретной карты
  app.get("/api/virtual-cards/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const card = await storage.getVirtualCardById(parseInt(req.params.id));
    if (!card || (card.userId !== req.user.id && !req.user.isAdmin)) {
      return res.sendStatus(404);
    }
    res.json(card);
  });

  // Запрос на выпуск новой карты
  app.post("/api/virtual-cards", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const card = await storage.createVirtualCard({
      ...req.body,
      userId: req.user.id,
    });
    res.json(card);
  });

  // Админ: получение всех ожидающих подтверждения карт
  app.get("/api/admin/pending-cards", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(401);
    const cards = await storage.getPendingCards();
    res.json(cards);
  });

  app.get("/api/admin/rejected-cards", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(401);
    const cards = await storage.getRejectedCards();
    res.json(cards);
  });

  app.get("/api/admin/active-cards", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(401);
    const cards = await storage.getActiveCards();
    res.json(cards);
  });

  app.delete("/api/admin/virtual-cards/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(401);
    await storage.deleteVirtualCard(parseInt(req.params.id));
    res.sendStatus(200);
  });

  // Админ: обновление статуса карты
  app.patch("/api/admin/virtual-cards/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(401);
    const updateData = updateVirtualCardSchema.parse(req.body);
    const card = await storage.updateVirtualCard(parseInt(req.params.id), updateData);
    if (updateData.status === 'rejected' || !card) {
      res.json({ deleted: true });
    } else {
      res.json(card);
    }
  });

  // Перевод по номеру карты
  app.post("/api/transfer-by-card", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { cardNumber, amount, description } = req.body;
    const card = await storage.getVirtualCardByNumber(cardNumber);

    if (!card) {
      return res.status(404).json({ message: "Карта не найдена" });
    }

    const sender = await storage.getUser(req.user.id);
    if (!card.status || card.status !== 'active') {
      return res.status(400).json({ message: "Карта не активирована" });
    }
    if (parseFloat(sender.balance) < amount) {
      return res.status(400).json({ message: "Недостаточно средств" });
    }

    const transaction = await storage.createTransaction({
      fromUserId: req.user.id,
      toUserId: card.userId,
      amount,
      type: "transfer",
      description,
    });
    res.json(transaction);
  });

  // Перевод по номеру телефона
  app.post("/api/transfer-by-phone", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const receiver = await storage.getUserByPhone(req.body.phoneNumber);
    if (!receiver) {
      return res.status(404).json({ message: "Получатель не найден" });
    }

    const transaction = await storage.createTransaction({
      fromUserId: req.user.id,
      toUserId: receiver.id,
      amount: req.body.amount,
      type: "transfer",
      description: req.body.description,
    });
    res.json(transaction);
  });

  // Админ: создание перевода по номеру телефона
  app.post("/api/admin/transfer-by-phone", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(401);
    const user = await storage.getUserByPhone(req.body.phoneNumber);
    if (!user) return res.status(404).json({ message: "Пользователь не найден" });

    const transaction = await storage.createTransaction({
      fromUserId: req.user.id,
      toUserId: user.id,
      amount: req.body.amount,
      type: "admin_grant",
      description: req.body.description,
    });
    res.json(transaction);
  });

  // Админ: отмена транзакции
  app.post("/api/admin/cancel-transaction/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(401);
    const transaction = await storage.cancelTransaction(parseInt(req.params.id));
    res.json(transaction);
  });

  // Получение истории транзакций пользователя
  app.get("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const transactions = await storage.getTransactionsByUserId(req.user.id);
    res.json(transactions);
  });

  // Админ: получение всех транзакций
  app.get("/api/admin/transactions", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(401);
    const transactions = await storage.getAllTransactions();
    res.json(transactions);
  });

  //Сохранение сервисов
  app.get("/api/services", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const services = await storage.getAllServices();
    res.json(services);
  });

  app.post("/api/services", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(401);
    const service = await storage.createService(req.body);
    res.json(service);
  });

  // Создание депозита
  app.post("/api/deposits", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const deposit = await storage.createDeposit({
        userId: req.user.id,
        amount: req.body.amount,
        method: req.body.method,
        comment: req.body.comment,
        status: "pending"
      });
      res.json(deposit);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Админ: получение всех депозитов
  app.get("/api/admin/deposits", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(401);
    const deposits = await depositStorage.getDeposits();
    res.json(deposits);
  });

  app.get("/api/admin/freekassa-settings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(401);
    res.json({
      merchantId: process.env.FREEKASSA_MERCHANT_ID || '',
      secret1: process.env.FREEKASSA_SECRET_1 || '',
      secret2: process.env.FREEKASSA_SECRET_2 || ''
    });
  });

  app.post("/api/admin/freekassa-settings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(401);
    const { merchantId, secret1, secret2 } = req.body;
    
    // In production, you would want to store these in a secure way
    process.env.FREEKASSA_MERCHANT_ID = merchantId;
    process.env.FREEKASSA_SECRET_1 = secret1;
    process.env.FREEKASSA_SECRET_2 = secret2;
    
    res.json({ success: true });
  });

  // Админ: подтверждение депозита
  app.post("/api/admin/deposits/:id/approve", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(401);
    const deposit = await storage.approveDeposit(parseInt(req.params.id));
    res.json(deposit);
  });

  // FreeKassa webhook
  app.post("/api/freekassa/webhook", async (req, res) => {
    const { MERCHANT_ID, SECRET_2 } = process.env;
    const { MERCHANT_ORDER_ID, AMOUNT, SIGN } = req.body;

    // Verify signature
    const signature = crypto
      .createHash('md5')
      .update(`${MERCHANT_ID}:${AMOUNT}:${SECRET_2}:${MERCHANT_ORDER_ID}`)
      .digest('hex');

    if (signature !== SIGN) {
      return res.status(400).send('Bad signature');
    }

    await storage.approveDeposit(parseInt(MERCHANT_ORDER_ID));
    res.send('YES');
  });

  // Create FreeKassa payment
  app.get("/api/freekassa/create", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { MERCHANT_ID, SECRET_1 } = process.env;
    const amount = req.query.amount;

    const deposit = await storage.createDeposit({
      userId: req.user.id,
      amount: parseFloat(amount as string),
      method: "freekassa",
      status: "pending",
      comment: "freekassa"
    });

    const signature = crypto
      .createHash('md5')
      .update(`${MERCHANT_ID}:${amount}:${SECRET_1}:${deposit.id}`)
      .digest('hex');

    const url = `https://pay.freekassa.ru/?m=${MERCHANT_ID}&oa=${amount}&o=${deposit.id}&s=${signature}`;
    res.redirect(url);
  });


  const httpServer = createServer(app);
  return httpServer;
}
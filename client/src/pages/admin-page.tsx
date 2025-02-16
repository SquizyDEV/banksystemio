import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Redirect } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VirtualCard, Transaction, User } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function AdminPage() {
  const { user } = useAuth();
  const transferForm = useForm();
  const cardForm = useForm();

  // Получение списка пользователей
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Получение списка ожидающих подтверждения карт
  const { data: pendingCards, isLoading: pendingCardsLoading } = useQuery<VirtualCard[]>({
    queryKey: ["/api/admin/pending-cards"],
  });

  const { data: rejectedCards, isLoading: rejectedCardsLoading } = useQuery<VirtualCard[]>({
    queryKey: ["/api/admin/rejected-cards"],
  });

  const { data: activeCards, isLoading: activeCardsLoading } = useQuery<VirtualCard[]>({
    queryKey: ["/api/admin/active-cards"],
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: number) => {
      await apiRequest("DELETE", `/api/admin/virtual-cards/${cardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rejected-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/active-cards"] });
    },
  });

  // Получение всех транзакций
  const { data: transactions, isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
  });

  // Мутация для обновления пользователя
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  // Мутация для обновления статуса карты
  const updateCardStatusMutation = useMutation({
    mutationFn: async ({ cardId, status, comment }: { cardId: number; status: "active" | "rejected"; comment?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/virtual-cards/${cardId}`, {
        status,
        adminComment: comment,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-cards"] });
      cardForm.reset();
    },
  });

  // Мутация для перевода средств по номеру телефона
  const transferByPhoneMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; amount: number; description?: string }) => {
      const res = await apiRequest("POST", "/api/admin/transfer-by-phone", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      transferForm.reset();
    },
  });

  // Мутация для отмены транзакции
  const cancelTransactionMutation = useMutation({
    mutationFn: async (txId: number) => {
      const res = await apiRequest("POST", `/api/admin/cancel-transaction/${txId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
    },
  });

  // Deposits
  const { data: deposits, isLoading: depositsLoading } = useQuery({
    queryKey: ["/api/admin/deposits"],
  });

  const approveDepositMutation = useMutation({
    mutationFn: async (depositId: number) => {
      await apiRequest("POST", `/api/admin/deposits/${depositId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deposits"] });
    },
  });


  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  if (pendingCardsLoading || rejectedCardsLoading || activeCardsLoading || txLoading || usersLoading || depositsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Панель администратора</h1>

        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users">Пользователи</TabsTrigger>
            <TabsTrigger value="cards">Активация карт</TabsTrigger>
            <TabsTrigger value="active">Активные карты</TabsTrigger>
            <TabsTrigger value="rejected">Отклоненные карты</TabsTrigger>
            <TabsTrigger value="transfers">Переводы</TabsTrigger>
            <TabsTrigger value="transactions">Транзакции</TabsTrigger>
            <TabsTrigger value="deposits">Депозиты</TabsTrigger>
            <TabsTrigger value="services">Сервисы</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Управление пользователями</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {users?.map((u) => (
                      <Card key={u.id}>
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{u.fullName || u.username}</div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {u.id} | Телефон: {u.phoneNumber}
                                </div>
                                <div className="text-sm">
                                  Баланс: ₽{u.balance || "0"}
                                </div>
                              </div>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline">Редактировать</Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Редактирование пользователя</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 pt-4">
                                    <div className="flex items-center justify-between">
                                      <Label>Администратор</Label>
                                      <Switch
                                        checked={u.isAdmin}
                                        onCheckedChange={(checked) =>
                                          updateUserMutation.mutate({
                                            userId: u.id,
                                            data: { isAdmin: checked },
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label>Баланс</Label>
                                      <Input
                                        type="text"
                                        pattern="[0-9]*\.?[0-9]*"
                                        defaultValue={u.balance?.toString()}
                                        onChange={(e) => {
                                          const value = e.target.value.replace(/[^0-9.]/g, '');
                                          if (value) {
                                            updateUserMutation.mutate({
                                              userId: u.id,
                                              data: { balance: parseFloat(value) },
                                            });
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cards">
            <Card>
              <CardHeader>
                <CardTitle>Ожидающие подтверждения карты</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {pendingCards?.map((card) => (
                      <Card key={card.id}>
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            <div>
                              <div className="font-medium">Карта #{card.id}</div>
                              <div className="text-sm text-muted-foreground">
                                Пользователь ID: {card.userId}
                              </div>
                              {card.requestReason && (
                                <div className="text-sm">
                                  Причина запроса: {card.requestReason}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Комментарий"
                                {...cardForm.register(`comment_${card.id}`)}
                              />
                              <Button
                                onClick={() =>
                                  updateCardStatusMutation.mutate({
                                    cardId: card.id,
                                    status: "active",
                                    comment: cardForm.getValues(`comment_${card.id}`),
                                  })
                                }
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Подтвердить
                              </Button>
                              <Button
                                onClick={() =>
                                  updateCardStatusMutation.mutate({
                                    cardId: card.id,
                                    status: "rejected",
                                    comment: cardForm.getValues(`comment_${card.id}`),
                                  })
                                }
                                variant="destructive"
                              >
                                Отклонить
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="active">
            <Card>
              <CardHeader>
                <CardTitle>Активные карты</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {activeCards?.map((card) => (
                      <Card key={card.id}>
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            <div>
                              <div className="font-medium">Карта #{card.id}</div>
                              <div className="text-sm text-muted-foreground">
                                Номер карты: {card.cardNumber}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Пользователь ID: {card.userId}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Срок действия: {card.expiryDate}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline">Редактировать</Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Редактирование карты</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 pt-4">
                                    <div>
                                      <Label>Имя держателя</Label>
                                      <Input
                                        defaultValue={card.cardholderName}
                                        onChange={(e) =>
                                          updateCardStatusMutation.mutate({
                                            cardId: card.id,
                                            status: "active",
                                            cardholderName: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                onClick={() => deleteCardMutation.mutate(card.id)}
                                variant="destructive"
                              >
                                Удалить
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejected">
            <Card>
              <CardHeader>
                <CardTitle>Отклоненные карты</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {rejectedCards?.map((card) => (
                      <Card key={card.id}>
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            <div>
                              <div className="font-medium">Карта #{card.id}</div>
                              <div className="text-sm text-muted-foreground">
                                Пользователь ID: {card.userId}
                              </div>
                              {card.requestReason && (
                                <div className="text-sm">
                                  Причина запроса: {card.requestReason}
                                </div>
                              )}
                              {card.adminComment && (
                                <div className="text-sm text-red-500">
                                  Комментарий админа: {card.adminComment}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() =>
                                  updateCardStatusMutation.mutate({
                                    cardId: card.id,
                                    status: "active",
                                  })
                                }
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Активировать
                              </Button>
                              <Button
                                onClick={() => deleteCardMutation.mutate(card.id)}
                                variant="destructive"
                              >
                                Удалить
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transfers">
            <Card>
              <CardHeader>
                <CardTitle>Перевод по номеру телефона</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={transferForm.handleSubmit((data) =>
                    transferByPhoneMutation.mutate({
                      phoneNumber: data.phoneNumber,
                      amount: parseFloat(data.amount),
                      description: data.description,
                    })
                  )}
                  className="space-y-4"
                >
                  <Input
                    placeholder="Номер телефона"
                    {...transferForm.register("phoneNumber")}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Сумма"
                    {...transferForm.register("amount")}
                  />
                  <Input
                    placeholder="Описание"
                    {...transferForm.register("description")}
                  />
                  <Button type="submit" disabled={transferByPhoneMutation.isPending}>
                    {transferByPhoneMutation.isPending ? "Отправка..." : "Отправить"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>История транзакций</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {transactions?.map((tx) => (
                      <Card key={tx.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">
                                Транзакция #{tx.id} ({tx.type})
                              </div>
                              <div className="text-sm text-muted-foreground">
                                От: {tx.fromUserId} → Кому: {tx.toUserId}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Сумма: ₽{tx.amount}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Статус: {tx.status}
                              </div>
                              {tx.description && (
                                <div className="text-sm">
                                  Описание: {tx.description}
                                </div>
                              )}
                            </div>
                            {tx.status === "completed" && (
                              <Button
                                variant="destructive"
                                onClick={() => cancelTransactionMutation.mutate(tx.id)}
                                disabled={cancelTransactionMutation.isPending}
                              >
                                Отменить
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="deposits">
              <Card>
                <CardHeader>
                  <CardTitle>Запросы на пополнение</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {deposits?.map((deposit) => (
                        <Card key={deposit.id} className="bg-black">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium">
                                  Пополнение на {deposit.amount} ₽
                                </div>
                                <div className="text-sm text-gray-400">
                                  Метод: {deposit.method === 'card' ? 'Перевод на карту' : 'FreeKassa'}
                                </div>
                                <div className="text-sm text-gray-400">
                                  Комментарий: {deposit.comment}
                                </div>
                              </div>
                              <Button
                                onClick={() => approveDepositMutation.mutate(deposit.id)}
                                disabled={deposit.status !== 'pending'}
                              >
                                {deposit.status === 'completed' ? 'Подтверждено' : 'Подтвердить'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle>Настройки FreeKassa</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  fetch('/api/admin/freekassa-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      merchantId: formData.get('merchantId'),
                      secret1: formData.get('secret1'),
                      secret2: formData.get('secret2')
                    })
                  });
                }} className="space-y-4">
                  <div>
                    <Label>Merchant ID</Label>
                    <Input name="merchantId" />
                  </div>
                  <div>
                    <Label>Secret 1</Label>
                    <Input type="password" name="secret1" />
                  </div>
                  <div>
                    <Label>Secret 2</Label>
                    <Input type="password" name="secret2" />
                  </div>
                  <Button type="submit">Сохранить</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
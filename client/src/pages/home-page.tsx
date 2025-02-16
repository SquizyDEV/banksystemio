import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { VirtualCard, Transaction, UpdateUser } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CreditCard, Send, Home, Info, Gift, Menu, Settings, User } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'cards' | 'transfers' | 'profile' | 'settings'>('cards');
  const [selectedCard, setSelectedCard] = useState<VirtualCard | null>(null);
  const { toast } = useToast();

  const { data: virtualCards, isLoading: cardsLoading } = useQuery<VirtualCard[]>({
    queryKey: ["/api/virtual-cards"],
  });

  const { data: transactions, isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const createCardForm = useForm();
  const transferForm = useForm();
  const profileForm = useForm({
    defaultValues: {
      fullName: user?.fullName,
      phoneNumber: user?.phoneNumber,
      theme: user?.theme || "dark",
      avatar: user?.avatar,
    },
  });

  const createCardMutation = useMutation({
    mutationFn: async (data: { cardholderName: string }) => {
      const res = await apiRequest("POST", "/api/virtual-cards", {
        userId: user?.id,
        cardholderName: data.cardholderName,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/virtual-cards"] });
      createCardForm.reset();
      toast({
        title: "Запрос отправлен",
        description: "Ваша заявка на выпуск карты будет рассмотрена",
      });
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; amount: number }) => {
      const res = await apiRequest("POST", "/api/transfer-by-phone", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      transferForm.reset();
      toast({
        title: "Перевод выполнен",
        description: "Средства успешно отправлены",
      });
    },
  });

  const cardTransferMutation = useMutation({ // Added mutation for card transfers
    mutationFn: async (data: { cardNumber: string; amount: number; description: string }) => {
      const res = await apiRequest("POST", "/api/transfer-by-card", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      transferForm.reset();
      toast({
        title: "Перевод выполнен",
        description: "Средства успешно отправлены",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка перевода",
        description: error.message, //Handle specific errors like insufficient balance here
        color: "red",
      });
    }
  });


  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUser) => {
      const res = await apiRequest("PATCH", "/api/user", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Профиль обновлен",
        description: "Ваши данные успешно сохранены",
      });
    },
  });

  const createDepositMutation = useMutation({
    mutationFn: async (data: { amount: number; method: string; comment: string }) => {
      const res = await apiRequest("POST", "/api/deposit", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Запрос на пополнение отправлен", description: "Ожидайте подтверждения администратора" });
      transferForm.reset();
    },
    onError: (error) => {
      toast({ title: "Ошибка пополнения", description: error.message, color: "red" });
    }
  });

  if (cardsLoading || txLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-gray-800 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Dialog>
            <DialogTrigger asChild>
              <div className="flex items-center gap-4 cursor-pointer">
                <Avatar>
                  {user?.avatar ? (
                    <AvatarImage src={user.avatar} />
                  ) : (
                    <AvatarFallback>{user?.username.charAt(0).toUpperCase()}</AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <div className="text-primary font-medium">{user?.username}</div>
                  <div className="text-2xl font-bold">₽ {user?.balance || '0'}</div>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Профиль</DialogTitle>
              </DialogHeader>
              <div className="relative h-32 w-full rounded-t-lg overflow-hidden">
                <div className="w-full h-full">
                  {user?.banner ? (
                    <img 
                      src={user.banner}
                      alt="Banner" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <span className="text-gray-400">Загрузите баннер</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 -mt-12 relative z-10 flex items-start gap-4">
                <Avatar className="w-24 h-24 border-4 border-background">
                  {user?.avatar ? (
                    <AvatarImage src={user.avatar} />
                  ) : (
                    <AvatarFallback>{user?.username.charAt(0).toUpperCase()}</AvatarFallback>
                  )}
                </Avatar>
                <div className="pt-12">
                  <h3 className="text-2xl font-bold">{user?.fullName || user?.username}</h3>
                  <p className="text-muted-foreground">{user?.rank}</p>
                </div>
                <div className="ml-auto pt-12">
                  <p className="text-xl font-bold">₽ {user?.balance || '0'}</p>
                </div>
              </div>
              <form onSubmit={profileForm.handleSubmit((data) => {
                updateProfileMutation.mutate(data);
                queryClient.invalidateQueries({ queryKey: ["/api/user"] });
              })} className="space-y-4 mt-6">
                <div>
                  <Label>Аватар (URL)</Label>
                  <Input {...profileForm.register("avatar")} />
                </div>
                <div>
                  <Label>Баннер (URL)</Label>
                  <Input {...profileForm.register("banner")} />
                </div>
                <div>
                  <Label>Дата рождения</Label>
                  <Input type="date" {...profileForm.register("birthDate")} />
                </div>
                <div>
                  <Label>ФИО</Label>
                  <Input {...profileForm.register("fullName")} />
                </div>
                <div>
                  <Label>Телефон</Label>
                  <Input {...profileForm.register("phoneNumber")} />
                </div>
                <Button type="submit">Сохранить</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-primary text-primary ml-auto">
                Пополнить баланс
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Пополнение баланса</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="card">
                <TabsList className="w-full">
                  <TabsTrigger value="card" className="w-1/2">Перевод на карту</TabsTrigger>
                  <TabsTrigger value="freekassa" className="w-1/2">FreeKassa</TabsTrigger>
                </TabsList>

                <TabsContent value="card">
                  <div className="space-y-4">
                    <div>
                      <Label>Номер карты для перевода</Label>
                      <div className="text-xl font-mono bg-black p-3 rounded-md">9112 3801 2537 8861</div>
                    </div>
                    <div>
                      <Label>Сумма</Label>
                      <Input type="number" placeholder="Введите сумму" {...transferForm.register("depositAmount")} />
                    </div>
                    <div>
                      <Label>Комментарий к переводу</Label>
                      <div className="bg-black p-3 rounded-md text-sm">
                        {user?.id}-{Math.random().toString(36).substring(7)}
                      </div>
                      <Input type="hidden" {...transferForm.register("depositComment")} />
                    </div>
                    <Button 
                      onClick={() => {
                        const comment = `${user?.id}-${Math.random().toString(36).substring(7)}`;
                        transferForm.setValue("depositComment", comment);
                        createDepositMutation.mutate({
                          amount: parseFloat(transferForm.getValues("depositAmount")),
                          method: "card",
                          comment
                        });
                      }}
                    >
                      Подтвердить перевод
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="freekassa">
                  <div className="space-y-4">
                    <div>
                      <Label>Сумма</Label>
                      <Input type="number" placeholder="Введите сумму" {...transferForm.register("freekassaAmount")} />
                    </div>
                    <Button
                      onClick={() => {
                        const amount = parseFloat(transferForm.getValues("freekassaAmount"));
                        window.location.href = `/api/freekassa/create?amount=${amount}`;
                      }}
                    >
                      Перейти к оплате
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          {user?.isAdmin && (
            <Link to="/admin">
              <Button variant="outline" className="border-primary text-primary">
                Админ панель
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="container mx-auto py-8 pb-24">
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="text-primary mb-2">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="font-medium">Мои карты</div>
              <div className="text-sm text-gray-400">
                {virtualCards?.length || 0} карт
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6" onClick={() => setSelectedTab('transfers')}>
              <div className="text-primary mb-2">
                <Send className="h-6 w-6" />
              </div>
              <div className="font-medium">Переводы</div>
              <div className="text-sm text-gray-400">
                Быстрые переводы
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {selectedTab === 'cards' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Виртуальные карты</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Выпустить карту</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Выпуск новой карты</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={createCardForm.handleSubmit((data) => createCardMutation.mutate(data))} className="space-y-4">
                      <div>
                        <Label>Имя и фамилия латиницей</Label>
                        <Input {...createCardForm.register("cardholderName")} placeholder="IVAN IVANOV" />
                      </div>
                      <Button type="submit">Отправить заявку</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {virtualCards?.map((card) => (
                  <Dialog key={card.id}>
                    <DialogTrigger asChild>
                      <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800 cursor-pointer">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <div className="text-xl font-medium text-primary">
                                •••• {card.cardNumber.slice(-4)}
                              </div>
                              <div className="text-sm text-gray-400">
                                Статус: {card.status}
                              </div>
                            </div>
                            <div className="text-primary">
                              <CreditCard className="h-6 w-6" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Информация о карте</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Номер карты</Label>
                          <div className="text-xl font-mono">{card.cardNumber}</div>
                        </div>
                        <div>
                          <Label>Держатель карты</Label>
                          <div>{card.cardholderName}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Срок действия</Label>
                            <div>{card.expiryDate}</div>
                          </div>
                          <div>
                            <Label>CVV</Label>
                            <div>{card.cvv}</div>
                          </div>
                        </div>
                        <div>
                          <Label>Статус</Label>
                          <div>{card.status}</div>
                        </div>
                        {card.adminComment && (
                          <div>
                            <Label>Комментарий</Label>
                            <div>{card.adminComment}</div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </div>
          )}

          {selectedTab === 'transfers' && (
            <div className="space-y-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle>Сделать перевод</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="phone">
                    <TabsList className="mb-4">
                      <TabsTrigger value="phone">По телефону</TabsTrigger>
                      <TabsTrigger value="card">По номеру карты</TabsTrigger>
                    </TabsList>

                    <TabsContent value="phone">
                      <form
                        onSubmit={transferForm.handleSubmit((data) =>
                          transferMutation.mutate({
                            phoneNumber: data.phoneNumber,
                            amount: parseFloat(data.amount),
                          })
                        )}
                        className="space-y-4"
                      >
                        <Input
                          placeholder="Номер телефона получателя"
                          className="bg-black border-gray-800"
                          {...transferForm.register("phoneNumber")}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Сумма"
                          className="bg-black border-gray-800"
                          {...transferForm.register("amount")}
                        />
                        <Button type="submit" disabled={transferMutation.isPending}>
                          {transferMutation.isPending ? "Отправка..." : "Отправить"}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="card">
                      <form
                        onSubmit={transferForm.handleSubmit((data) =>
                          cardTransferMutation.mutate({
                            cardNumber: data.cardNumber,
                            amount: parseFloat(data.amount),
                            description: data.description,
                          })
                        )}
                        className="space-y-4"
                      >
                        <Input
                          placeholder="Номер карты получателя"
                          className="bg-black border-gray-800"
                          {...transferForm.register("cardNumber")}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Сумма"
                          className="bg-black border-gray-800"
                          {...transferForm.register("amount")}
                        />
                        <Input
                          placeholder="Комментарий"
                          className="bg-black border-gray-800"
                          {...transferForm.register("description")}
                        />
                        <Button type="submit" disabled={cardTransferMutation.isPending}>
                          {cardTransferMutation.isPending ? "Отправка..." : "Отправить"}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle>История операций</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {transactions?.map((tx) => (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Card className="bg-black border-gray-800 hover:bg-gray-900 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 border border-primary/20">
                                    <AvatarImage 
                                      src={tx.fromUserId === user?.id ? tx.toUser?.avatar : tx.fromUser?.avatar} 
                                      className="object-cover"
                                    />
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                      {tx.fromUserId === user?.id 
                                        ? tx.toUser?.username?.charAt(0).toUpperCase() 
                                        : tx.fromUser?.username?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium flex items-center gap-2">
                                      {tx.fromUserId === user?.id 
                                        ? <Send className="h-4 w-4 text-red-500" /> 
                                        : <Send className="h-4 w-4 text-green-500 rotate-180" />}
                                      {tx.fromUserId === user?.id ? tx.toUser?.username : tx.fromUser?.username}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                      {new Date(tx.createdAt!).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <div className={`${tx.fromUserId === user?.id ? "text-red-500" : "text-green-500"} font-bold text-lg cursor-pointer hover:opacity-80 transition-opacity`}>
                                      {tx.fromUserId === user?.id ? "-" : "+"}₽{tx.amount}
                                    </div>
                                  </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                  <DialogHeader>
                                    <DialogTitle className="text-xl">Детали перевода</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                      <Avatar className="h-16 w-16 border-2 border-primary">
                                        <AvatarImage 
                                          src={tx.fromUserId === user?.id ? tx.toUser?.avatar : tx.fromUser?.avatar}
                                          className="object-cover" 
                                        />
                                        <AvatarFallback className="text-lg">
                                          {tx.fromUserId === user?.id 
                                            ? tx.toUser?.username?.charAt(0).toUpperCase() 
                                            : tx.fromUser?.username?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="text-xl font-bold">
                                          {tx.fromUserId === user?.id ? tx.toUser?.username : tx.fromUser?.username}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          {tx.fromUserId === user?.id ? "Получатель" : "Отправитель"}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="bg-black/50 p-4 rounded-lg space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Сумма</span>
                                        <span className={`text-xl font-bold ${tx.fromUserId === user?.id ? "text-red-500" : "text-green-500"}`}>
                                          {tx.fromUserId === user?.id ? "-" : "+"}₽{tx.amount}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Дата</span>
                                        <span>{new Date(tx.createdAt).toLocaleString()}</span>
                                      </div>
                                      {tx.description && (
                                        <div className="flex justify-between items-center">
                                          <span className="text-gray-400">Описание</span>
                                          <span>{tx.description}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </CardContent>
                        </Card>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedTab === 'settings' && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Настройки</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label>Темная тема</Label>
                  <Switch
                    checked={user?.theme === "dark"}
                    onCheckedChange={(checked) =>
                      updateProfileMutation.mutate({ theme: checked ? "dark" : "light" })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {selectedTab === 'profile' && (
            <div>
              {/* Profile content here */}
            </div>
          )}
        </div>
      </main>

      {/* Нижняя навигация */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800">
        <div className="container mx-auto">
          <div className="flex justify-around p-4">
            <Button
              variant="ghost"
              className="flex-1 mx-2"
              onClick={() => setSelectedTab('cards')}
            >
              <CreditCard className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="flex-1 mx-2"
              onClick={() => setSelectedTab('transfers')}
            >
              <Send className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="flex-1 mx-2"
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="flex-1 mx-2"
            >
              <Info className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="flex-1 mx-2"
              onClick={() => setSelectedTab('settings')}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
}
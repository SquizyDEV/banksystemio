import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Redirect } from "wouter";
import { motion } from "framer-motion";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();

  const loginForm = useForm({
    resolver: zodResolver(insertUserSchema.pick({ username: true, password: true })),
  });

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
  });

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex bg-black">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-1/2 p-8 flex items-center justify-center"
      >
        <Card className="w-[400px] bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-primary">Добро пожаловать в Т-Банк</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="w-full">
                <TabsTrigger value="login" className="w-1/2">Вход</TabsTrigger>
                <TabsTrigger value="register" className="w-1/2">Регистрация</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                    <div>
                      <Label htmlFor="username">Email</Label>
                      <Input {...loginForm.register("username")} placeholder="mail@example.com" />
                    </div>
                    <div>
                      <Label htmlFor="password">Пароль</Label>
                      <Input type="password" {...loginForm.register("password")} placeholder="••••••••" />
                    </div>
                    <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? "Вход..." : "Войти"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                    <div>
                      <Label htmlFor="username">Email</Label>
                      <Input {...registerForm.register("username")} placeholder="mail@example.com" />
                    </div>
                    <div>
                      <Label htmlFor="password">Пароль</Label>
                      <Input type="password" {...registerForm.register("password")} placeholder="••••••••" />
                    </div>
                    <div>
                      <Label htmlFor="phoneNumber">Номер телефона</Label>
                      <Input {...registerForm.register("phoneNumber")} placeholder="+7" />
                    </div>
                    <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? "Регистрация..." : "Зарегистрироваться"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-1/2 bg-gradient-to-br from-black to-gray-900 p-8 flex items-center justify-center text-white"
      >
        <div className="max-w-md space-y-6">
          <h1 className="text-4xl font-bold text-primary">Современный банкинг</h1>
          <p className="text-lg">Удобные цифровые сервисы с виртуальными картами и мгновенными переводами.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-black/50 rounded-lg backdrop-blur">
              <h3 className="font-semibold text-primary">Виртуальные карты</h3>
              <p className="text-sm">Создавайте и управляйте картами</p>
            </div>
            <div className="p-4 bg-black/50 rounded-lg backdrop-blur">
              <h3 className="font-semibold text-primary">Быстрые переводы</h3>
              <p className="text-sm">Мгновенные переводы без комиссии</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
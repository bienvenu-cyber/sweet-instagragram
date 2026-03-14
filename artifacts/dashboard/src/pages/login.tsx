import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Bot, AlertTriangle, ShieldCheck, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogin, useAuthStatus } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const [challengeError, setChallengeError] = useState(false);
  const { data: auth, isLoading: checkingAuth } = useAuthStatus();
  const loginMutation = useLogin();
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" }
  });

  useEffect(() => {
    if (!checkingAuth && auth?.logged_in) {
      setLocation("/");
    }
  }, [checkingAuth, auth?.logged_in, setLocation]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (auth?.logged_in) return null;

  const onSubmit = (data: LoginForm) => {
    setChallengeError(false);
    const cleanUsername = data.username.replace(/^@/, "");
    loginMutation.mutate({ username: cleanUsername, password: data.password }, {
      onSuccess: (res) => {
        if (res.success) {
          toast({
            title: "Connected Successfully",
            description: `Logged in as @${res.username}`,
          });
          setLocation("/");
        } else {
          if (res.message?.toLowerCase().includes("challenge") || res.message?.toLowerCase().includes("verification")) {
            setChallengeError(true);
          }
          toast({
            title: "Login Failed",
            description: res.message,
            variant: "destructive",
          });
        }
      },
      onError: (err) => {
        const msg = err.message || "Login failed";
        if (msg.toLowerCase().includes("challenge") || msg.toLowerCase().includes("verification")) {
          setChallengeError(true);
        }
        toast({
          title: "Connection Failed",
          description: msg,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <img 
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
          alt="Background" 
          className="w-full h-full object-cover opacity-40 mix-blend-screen"
        />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md p-4 z-10"
      >
        <Card className="border-border/50 shadow-2xl bg-card/60 backdrop-blur-xl rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-primary"></div>
          
          <CardHeader className="text-center pt-10 pb-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 flex items-center justify-center mb-6 shadow-lg shadow-primary/10">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-display text-foreground tracking-tight">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Connect your Instagram account to start automating.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-8 pb-10">
            <div className="mb-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex gap-3 text-yellow-200">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-yellow-500" />
              <div className="text-sm leading-relaxed">
                If you have 2FA enabled, approve the login from your Instagram app first.
              </div>
            </div>

            {challengeError && (
              <div className="mb-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3 text-blue-200">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
                <div className="text-sm leading-relaxed space-y-1">
                  <p className="font-semibold text-blue-300">Instagram Security Check Required</p>
                  <p>Instagram has flagged this login from a new location. Please:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs mt-1">
                    <li>Open the <strong>Instagram app</strong> on your phone</li>
                    <li>Check for a security alert or notification</li>
                    <li>Approve the login or enter the code sent by email/SMS</li>
                    <li>Then try connecting again here</li>
                  </ol>
                </div>
              </div>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="username">Instagram Username</Label>
                <Input 
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="username (without @)" 
                  className="bg-background/50 h-12 rounded-xl focus-visible:ring-primary/30 focus-visible:border-primary transition-all"
                  {...form.register("username")} 
                />
                {form.formState.errors.username && (
                  <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••" 
                  className="bg-background/50 h-12 rounded-xl focus-visible:ring-primary/30 focus-visible:border-primary transition-all"
                  {...form.register("password")} 
                />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/25 mt-2"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Connexion en cours...</>
                ) : (
                  <><ShieldCheck className="mr-2 h-5 w-5" /> Secure Connect</>
                )}
              </Button>
              {loginMutation.isPending && (
                <p className="text-xs text-center text-muted-foreground animate-pulse">
                  Instagram vérifie vos identifiants... Cela peut prendre jusqu'à 60 secondes.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

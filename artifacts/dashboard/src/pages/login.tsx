import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Bot, AlertTriangle, ShieldCheck, Loader2, Globe, RefreshCw, CheckCircle2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLogin, useAuthStatus } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(1, "Username required"),
  password: z.string().min(1, "Password required"),
  challenge_code: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

type ChallengeState = {
  active: boolean;
  type: "code" | "approve" | null;
  geoBlocked: boolean;
  username: string;
  password: string;
};

const BASE_URL = "/api/bot-api";

export default function Login() {
  const [, setLocation] = useLocation();
  const [challenge, setChallenge] = useState<ChallengeState>({
    active: false, type: null, geoBlocked: false, username: "", password: ""
  });
  const [codeSubmitting, setCodeSubmitting] = useState(false);
  const { data: auth, isLoading: checkingAuth } = useAuthStatus();
  const loginMutation = useLogin();
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "", challenge_code: "" }
  });

  useEffect(() => {
    if (!checkingAuth && auth?.logged_in) setLocation("/");
  }, [checkingAuth, auth?.logged_in, setLocation]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (auth?.logged_in) return null;

  const handleLoginResult = (res: any, username: string, password: string) => {
    if (res.success) {
      toast({ title: "Connecté !", description: `Connecté en tant que @${res.username}` });
      setLocation("/");
      return;
    }
    if (res.challenge) {
      setChallenge({
        active: true,
        type: res.challenge_type || "approve",
        geoBlocked: res.geo_blocked ?? true,
        username,
        password,
      });
      return;
    }
    toast({ title: "Connexion échouée", description: res.message, variant: "destructive" });
  };

  const onSubmit = (data: LoginForm) => {
    const username = data.username.replace(/^@/, "").trim();
    setChallenge(c => ({ ...c, active: false }));
    loginMutation.mutate({ username, password: data.password }, {
      onSuccess: (res) => handleLoginResult(res, username, data.password),
      onError: (err) => {
        const msg = err.message || "Connexion échouée";
        toast({ title: "Erreur", description: msg, variant: "destructive" });
      }
    });
  };

  const handleRetryAfterApproval = () => {
    loginMutation.mutate({ username: challenge.username, password: challenge.password }, {
      onSuccess: (res) => handleLoginResult(res, challenge.username, challenge.password),
      onError: (err) => toast({ title: "Erreur", description: err.message, variant: "destructive" })
    });
  };

  const handleSubmitCode = async () => {
    const code = form.getValues("challenge_code")?.trim();
    if (!code) {
      toast({ title: "Erreur", description: "Entre le code de vérification.", variant: "destructive" });
      return;
    }
    setCodeSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Connecté !", description: `Connecté en tant que @${data.username}` });
        setLocation("/");
      } else {
        toast({ title: "Code invalide", description: data.message, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setCodeSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
          alt=""
          className="w-full h-full object-cover opacity-40 mix-blend-screen"
        />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md p-4 z-10"
      >
        <Card className="border-border/50 shadow-2xl bg-card/60 backdrop-blur-xl rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-primary" />

          <CardHeader className="text-center pt-10 pb-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 flex items-center justify-center mb-6 shadow-lg shadow-primary/10">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-display text-foreground tracking-tight">Instagram Bot</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Connecte ton compte Instagram pour commencer.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-10 space-y-4">

            {/* GEO-BLOCK CHALLENGE */}
            {challenge.active && challenge.geoBlocked && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-3"
              >
                <div className="flex items-center gap-2 text-orange-400">
                  <Globe className="w-5 h-5 shrink-0" />
                  <p className="font-semibold text-sm">Connexion bloquée — IP USA détectée</p>
                </div>
                <p className="text-xs text-orange-200/80 leading-relaxed">
                  Instagram a détecté que la connexion vient des <strong>États-Unis</strong> (serveurs Replit en Caroline du Nord)
                  alors que ton compte est utilisé depuis le <strong>Bénin</strong>. C'est une protection anti-piratage normale.
                </p>
                <div className="border-t border-orange-500/20 pt-3 space-y-2">
                  <p className="text-xs font-semibold text-orange-300">Comment débloquer :</p>
                  <div className="space-y-1.5 text-xs text-orange-200/80">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 shrink-0 text-[10px] font-bold mt-0.5">1</span>
                      <span>Ouvre l'app <strong>Instagram</strong> sur ton téléphone</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 shrink-0 text-[10px] font-bold mt-0.5">2</span>
                      <span>Cherche la <strong>notification de sécurité</strong> (tentative de connexion)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 shrink-0 text-[10px] font-bold mt-0.5">3</span>
                      <span>Appuie sur <strong>"C'était moi"</strong> ou approuve la connexion</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 shrink-0 text-[10px] font-bold mt-0.5">4</span>
                      <span>Clique sur <strong>"J'ai approuvé"</strong> ci-dessous</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    onClick={handleRetryAfterApproval}
                    disabled={loginMutation.isPending}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white h-10 rounded-xl text-sm"
                  >
                    {loginMutation.isPending
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Tentative...</>
                      : <><CheckCircle2 className="w-4 h-4 mr-2" /> J'ai approuvé — Réessayer</>
                    }
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Ou configure un <button className="underline text-primary" onClick={() => setLocation("/settings")}>proxy dans Paramètres</button> pour éviter ce blocage permanent.
                  </p>
                </div>
              </motion.div>
            )}

            {/* CODE CHALLENGE */}
            {challenge.active && challenge.type === "code" && !challenge.geoBlocked && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-3"
              >
                <div className="flex items-center gap-2 text-blue-400">
                  <ShieldCheck className="w-5 h-5" />
                  <p className="font-semibold text-sm">Code de vérification envoyé</p>
                </div>
                <p className="text-xs text-blue-200/80">
                  Instagram a envoyé un code à ton téléphone/email. Entre-le ci-dessous.
                </p>
                <div className="space-y-2">
                  <Input
                    placeholder="123456"
                    maxLength={8}
                    className="bg-background/50 h-11 rounded-xl text-center text-lg tracking-widest font-mono"
                    {...form.register("challenge_code")}
                  />
                  <Button
                    onClick={handleSubmitCode}
                    disabled={codeSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 rounded-xl"
                  >
                    {codeSubmitting
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Vérification...</>
                      : "Valider le code"
                    }
                  </Button>
                </div>
              </motion.div>
            )}

            {/* LOGIN FORM */}
            {!challenge.active && (
              <>
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex gap-3 text-yellow-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-yellow-500" />
                  <p className="text-xs leading-relaxed">
                    Si Instagram bloque la connexion, configure d'abord un <strong>proxy</strong> dans{" "}
                    <button className="underline text-primary" onClick={() => setLocation("/settings")}>Paramètres</button>.
                  </p>
                </div>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="username">Nom d'utilisateur Instagram</Label>
                    <Input
                      id="username"
                      type="text"
                      autoComplete="username"
                      placeholder="username (sans @)"
                      className="bg-background/50 h-12 rounded-xl focus-visible:ring-primary/30 focus-visible:border-primary transition-all"
                      {...form.register("username")}
                    />
                    {form.formState.errors.username && (
                      <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
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
                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/25"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending
                      ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Connexion en cours...</>
                      : <><ShieldCheck className="mr-2 h-5 w-5" /> Connexion sécurisée</>
                    }
                  </Button>
                  {loginMutation.isPending && (
                    <p className="text-xs text-center text-muted-foreground animate-pulse">
                      Vérification auprès d'Instagram... jusqu'à 60 secondes.
                    </p>
                  )}
                </form>
              </>
            )}

            {challenge.active && (
              <button
                onClick={() => setChallenge(c => ({ ...c, active: false }))}
                className="w-full text-xs text-muted-foreground hover:text-foreground text-center pt-1 flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Recommencer avec d'autres identifiants
              </button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

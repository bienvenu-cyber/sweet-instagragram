import { useEffect } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Settings as SettingsIcon, Save, ShieldAlert, Zap } from "lucide-react";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

const settingsSchema = z.object({
  dm_daily_limit: z.coerce.number().min(1).max(200),
  dm_delay_min: z.coerce.number().min(5),
  dm_delay_max: z.coerce.number().min(10),
  comment_daily_limit: z.coerce.number().min(1).max(100),
  comment_delay_min: z.coerce.number().min(5),
  comment_delay_max: z.coerce.number().min(10),
  post_daily_limit: z.coerce.number().min(1).max(10),
  auto_dm_enabled: z.boolean(),
  auto_comment_enabled: z.boolean(),
}).refine(data => data.dm_delay_max >= data.dm_delay_min, {
  message: "Max delay must be >= Min delay", path: ["dm_delay_max"]
}).refine(data => data.comment_delay_max >= data.comment_delay_min, {
  message: "Max delay must be >= Min delay", path: ["comment_delay_max"]
});

export default function Settings() {
  const { toast } = useToast();
  const { data: currentSettings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      dm_daily_limit: 50, dm_delay_min: 30, dm_delay_max: 120,
      comment_daily_limit: 30, comment_delay_min: 20, comment_delay_max: 90,
      post_daily_limit: 3, auto_dm_enabled: false, auto_comment_enabled: false
    }
  });

  useEffect(() => {
    if (currentSettings) form.reset(currentSettings);
  }, [currentSettings, form]);

  const onSubmit = (data: z.infer<typeof settingsSchema>) => {
    updateSettings.mutate(data, {
      onSuccess: () => toast({ title: "Settings Saved", description: "Your bot configuration has been updated." }),
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  if (isLoading) return <div className="text-center p-12 animate-pulse text-muted-foreground">Loading settings...</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Bot Settings</h1>
        <p className="text-muted-foreground mt-1">Configure limits and automation behaviors.</p>
      </div>

      <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex items-start gap-3 text-destructive-foreground">
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-destructive" />
        <div className="text-sm">
          <p className="font-semibold text-destructive">Anti-Spam Warning</p>
          <p className="text-destructive/80 mt-1">Setting limits too high or delays too low increases the risk of your Instagram account being temporarily restricted or permanently banned. Use conservative settings.</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Direct Messages Config */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Direct Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Daily Limit</Label>
                  <span className="font-mono text-sm font-semibold">{form.watch("dm_daily_limit")}</span>
                </div>
                <Slider 
                  value={[form.watch("dm_daily_limit")]} 
                  max={200} step={1}
                  onValueChange={v => form.setValue("dm_daily_limit", v[0])}
                  className="py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Delay (sec)</Label>
                  <Input type="number" {...form.register("dm_delay_min")} className="bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label>Max Delay (sec)</Label>
                  <Input type="number" {...form.register("dm_delay_max")} className="bg-background/50" />
                </div>
              </div>
            </div>
            {form.formState.errors.dm_delay_max && <p className="text-xs text-destructive">{form.formState.errors.dm_delay_max.message}</p>}
          </CardContent>
        </Card>

        {/* Comments Config */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Comments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Daily Limit</Label>
                  <span className="font-mono text-sm font-semibold">{form.watch("comment_daily_limit")}</span>
                </div>
                <Slider 
                  value={[form.watch("comment_daily_limit")]} 
                  max={100} step={1}
                  onValueChange={v => form.setValue("comment_daily_limit", v[0])}
                  className="py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Delay (sec)</Label>
                  <Input type="number" {...form.register("comment_delay_min")} className="bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label>Max Delay (sec)</Label>
                  <Input type="number" {...form.register("comment_delay_max")} className="bg-background/50" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Behaviors */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Automation Master Switches
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-border/50 rounded-xl bg-secondary/20">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-process DM Queue</Label>
                <p className="text-sm text-muted-foreground">Continuously run through queued DMs in background</p>
              </div>
              <Switch 
                checked={form.watch("auto_dm_enabled")} 
                onCheckedChange={v => form.setValue("auto_dm_enabled", v)} 
                className="data-[state=checked]:bg-primary"
              />
            </div>
            <div className="flex items-center justify-between p-4 border border-border/50 rounded-xl bg-secondary/20">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-process Comment Queue</Label>
                <p className="text-sm text-muted-foreground">Continuously run through queued comments in background</p>
              </div>
              <Switch 
                checked={form.watch("auto_comment_enabled")} 
                onCheckedChange={v => form.setValue("auto_comment_enabled", v)} 
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button type="submit" disabled={updateSettings.isPending} className="bg-primary text-white h-12 px-8 text-base shadow-lg shadow-primary/20">
            {updateSettings.isPending ? "Saving..." : <><Save className="w-5 h-5 mr-2" /> Save Configuration</>}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { tenantUsersCollectionPath } from "@/lib/tenant-context";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Send, Image as ImageIcon, Users, UserCircle2, BellRing, Smartphone, Loader2, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const notificationSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(50, "Title is too long"),
  body: z.string().min(5, "Message body must be at least 5 characters.").max(150, "Message body is too long"),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  targetType: z.enum(["all", "specific"]),
  targetUserId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.targetType === "specific" && !data.targetUserId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Target User ID is required when sending to a specific user.",
      path: ["targetUserId"],
    });
  }
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

export default function NotificationsClient() {
  const [isSending, setIsSending] = useState(false);
  const [users, setUsers] = useState<{id: string, email: string, displayName?: string}[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, ...tenantUsersCollectionPath()), orderBy("email"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          email: doc.data().email,
          displayName: doc.data().displayName
        }));
        setUsers(data);
      } catch (error) {
        console.error("Failed to load users for notifications", error);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: "",
      body: "",
      imageUrl: "",
      targetType: "all",
      targetUserId: "",
    },
  });

  const { watch } = form;
  const targetType = watch("targetType");
  const watchTitle = watch("title");
  const watchBody = watch("body");
  const watchImage = watch("imageUrl");

  const onSubmit = async (values: NotificationFormValues) => {
    setIsSending(true);
    try {
      const payload = {
        title: values.title,
        body: values.body,
        imageUrl: values.imageUrl || undefined,
        targetType: values.targetType,
        targetUserId: values.targetType === "specific" ? values.targetUserId : undefined,
      };

      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send notification");
      }

      toast.success("Notification dispatched successfully!");
      form.reset();
    } catch (error: any) {
      console.error("Push Error:", error);
      toast.error(error.message || "Failed to send notification.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 pt-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight font-rajdhani">Push Notifications</h2>
          <p className="text-muted-foreground text-sm">
            Compose and dispatch rich notifications to Android and Web clients.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Composer Form */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-border/40 shadow-sm bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-primary" />
                Notification Composer
              </CardTitle>
              <CardDescription>
                Craft your message. Emojis are supported!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  {/* Audience Selector */}
                  <div className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border/30">
                    <Label className="text-base font-semibold">Target Audience</Label>
                    <RadioGroup
                      value={targetType}
                      onValueChange={(val) => form.setValue("targetType", val as "all" | "specific")}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                      <div 
                        onClick={() => form.setValue("targetType", "all")}
                        className={cn(
                        "relative flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                        targetType === "all" ? "bg-primary/5 border-primary ring-1 ring-primary/20" : "hover:bg-muted/50 border-border/50"
                      )}>
                        <RadioGroupItem value="all" id="target-all" className="mt-1" />
                        <div className="space-y-1">
                          <Label htmlFor="target-all" className="font-medium cursor-pointer">Global Broadcast</Label>
                          <p className="text-xs text-muted-foreground">Send to all registered users (Topic: all_users)</p>
                        </div>
                      </div>
                      <div 
                        onClick={() => form.setValue("targetType", "specific")}
                        className={cn(
                        "relative flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                        targetType === "specific" ? "bg-primary/5 border-primary ring-1 ring-primary/20" : "hover:bg-muted/50 border-border/50"
                      )}>
                        <RadioGroupItem value="specific" id="target-specific" className="mt-1" />
                        <div className="space-y-1">
                          <Label htmlFor="target-specific" className="font-medium cursor-pointer">Specific User</Label>
                          <p className="text-xs text-muted-foreground">Target a single user by their UID</p>
                        </div>
                      </div>
                    </RadioGroup>

                    {targetType === "specific" && (
                      <FormField
                        control={form.control}
                        name="targetUserId"
                        render={({ field }) => (
                          <FormItem className="pt-2 animate-in slide-in-from-top-2 opacity-0 fade-in duration-200 fill-mode-forwards">
                            <FormLabel>Select Target User</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder={isLoadingUsers ? "Loading users..." : "Select a user"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {users.map(user => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.displayName || "User"} ({user.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Choose a registered player to receive this notification directly.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Season 2 is here! 🏆" {...field} className="bg-background/50" />
                          </FormControl>
                          <CardDescription className="text-xs text-right mt-1">
                            {field.value.length}/50
                          </CardDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="body"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message Body</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Jump in now and battle for the grand prize pool!" 
                              className="resize-none h-24 bg-background/50" 
                              {...field} 
                            />
                          </FormControl>
                          <CardDescription className="text-xs text-right mt-1">
                            {field.value.length}/150
                          </CardDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            Image Attachment URL (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/promo.jpg" {...field} className="bg-background/50" />
                          </FormControl>
                          <FormDescription>
                            Adds a rich 'BigPictureStyle' expanding image to the notification.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" disabled={isSending} className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20">
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Dispatching...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-5 w-5" />
                        Send Notification
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Side Panel */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border/40 shadow-sm bg-card/60 backdrop-blur-xl sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Fake Phone Screen Wrapper */}
              <div className="relative mx-auto w-full max-w-[320px] aspect-[9/19] bg-zinc-950 rounded-[40px] border-[6px] border-zinc-800 shadow-2xl overflow-hidden flex flex-col p-4">
                {/* Dynamic Lock Screen Details */}
                <div className="text-center pt-8 text-white/90">
                  <div className="text-5xl font-light tracking-tight">{format(new Date(), 'HH:mm')}</div>
                  <div className="text-sm mt-1 text-white/60 font-medium">{format(new Date(), 'EEEE, MMMM d')}</div>
                </div>

                {/* Simulated Notification Card */}
                <div className="mt-8 animate-in slide-in-from-top-4 fade-in duration-500 fill-mode-forwards relative z-10 w-full bg-zinc-900/80 backdrop-blur-md rounded-2xl p-3 border border-white/5 shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-zinc-800 flex items-center justify-center border border-white/10">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-white/80">ANU PAID SCRIM</span>
                    <span className="text-[10px] text-white/40 ml-auto">now</span>
                  </div>
                  
                  <div className="px-1 space-y-1">
                    <p className="text-[14px] font-semibold text-white leading-tight break-words">
                      {watchTitle || "Notification Title"}
                    </p>
                    <p className="text-[13px] text-white/70 leading-snug line-clamp-2">
                      {watchBody || "Your message body will appear here."}
                    </p>
                  </div>

                  {watchImage && !form.getFieldState('imageUrl').invalid && (
                    <div className="mt-3 -mx-3 -mb-3 rounded-b-xl overflow-hidden h-32 relative bg-zinc-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={watchImage} 
                        alt="Rich Attachment Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIiByeT0iMiI+PC9yZWN0PjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ij48L2NpcmNsZT48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCAxMiAxNCI+PC9wb2x5bGluZT48L3N2Zz4=';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Phone Bottom Grabber/Flashlight Mocks */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-between px-8 text-white/30">
                  <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-sm border border-current" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full border border-current" />
                  </div>
                </div>
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-white/30 rounded-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

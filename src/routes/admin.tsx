import { createFileRoute } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Loader2,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { callFunction, getAccessToken } from "@/lib/functions";
import type {
  DeleteInviteResponse,
  DisableInviteResponse,
  GenerateInviteResponse,
  InvitationCodeRow,
  RsvpResponseRow,
} from "@/lib/rsvp-types";
import { cn } from "@/lib/utils";

type AdminState = "checking" | "logged_out" | "denied" | "admin";
type LoginMode = "magic" | "password";
type InviteStatus = "unused" | "used" | "disabled";
type BulkAction = "disable" | "delete";

export const Route = createFileRoute("/admin")({
  component: AdminRoute,
});

function inviteStatus(invite: InvitationCodeRow): InviteStatus {
  if (invite.disabled) return "disabled";
  if (invite.used) return "used";
  return "unused";
}

function isAccessError(error: { code?: string; status?: number; message?: string } | null) {
  if (!error) return false;

  return (
    error.status === 401 ||
    error.status === 403 ||
    error.code === "42501" ||
    error.message?.toLowerCase().includes("permission denied")
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getBasePath() {
  const basePath = import.meta.env.BASE_URL || "/";

  return basePath.endsWith("/") ? basePath : `${basePath}/`;
}

function makeInvitationUrl(code: string) {
  const invitationPath = `${getBasePath()}invitation`;

  if (typeof window === "undefined") {
    return `${invitationPath}?code=${encodeURIComponent(code)}`;
  }

  const url = new URL(invitationPath, window.location.origin);
  url.searchParams.set("code", code);

  return url.toString();
}

function makeAdminUrl() {
  const adminPath = `${getBasePath()}admin`;

  if (typeof window === "undefined") {
    return adminPath;
  }

  return new URL(adminPath, window.location.origin).toString();
}

async function copyInvitationUrl(code: string) {
  await navigator.clipboard.writeText(makeInvitationUrl(code));
}

function StatusBadge({ status }: { status: InviteStatus }) {
  if (status === "disabled") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="size-3" />
        disabled
      </Badge>
    );
  }

  if (status === "used") {
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle2 className="size-3" />
        used
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-800">
      <ShieldCheck className="size-3" />
      unused
    </Badge>
  );
}

function AdminRoute() {
  const [session, setSession] = useState<Session | null>(null);
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [loginMode, setLoginMode] = useState<LoginMode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [invites, setInvites] = useState<InvitationCodeRow[]>([]);
  const [responses, setResponses] = useState<RsvpResponseRow[]>([]);
  const [songRequests, setSongRequests] = useState<Array<{ invite_code: string }>>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [disablingCode, setDisablingCode] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const loadRequest = useRef(0);

  const totals = useMemo(() => {
    return responses.reduce(
      (summary, response) => {
        if (response.attending) {
          summary.attending += 1;
          summary.guests += response.guest_count;
        } else {
          summary.declined += 1;
        }

        return summary;
      },
      { attending: 0, declined: 0, guests: 0 },
    );
  }, [responses]);

  const selectedInvites = useMemo(() => {
    const selectedCodeSet = new Set(selectedCodes);

    return invites.filter((invite) => selectedCodeSet.has(invite.code));
  }, [invites, selectedCodes]);

  const selectedActiveInvites = useMemo(() => {
    return selectedInvites.filter((invite) => !invite.disabled);
  }, [selectedInvites]);

  const allInvitesSelected =
    invites.length > 0 && invites.every((invite) => selectedCodes.includes(invite.code));
  const someInvitesSelected = selectedCodes.length > 0 && !allInvitesSelected;

  const loadAdminData = useCallback(async (activeSession: Session | null) => {
    if (!activeSession) {
      setAdminState("logged_out");
      return;
    }

    const requestId = loadRequest.current + 1;
    loadRequest.current = requestId;
    setLoadingData(true);
    setAdminState("checking");

    try {
      const { data: adminUser, error: adminError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", activeSession.user.id)
        .maybeSingle();

      if (requestId !== loadRequest.current) return;

      if (adminError || !adminUser) {
        if (adminError && !isAccessError(adminError)) {
          console.error(adminError);
        }
        setAdminState("denied");
        setInvites([]);
        setResponses([]);
        return;
      }

      const [
        { data: inviteRows, error: inviteError },
        { data: responseRows, error: responseError },
        { data: songRows, error: songError },
      ] = await Promise.all([
        supabase.from("invitation_codes").select("*").order("created_at", { ascending: false }),
        supabase.from("rsvp_responses").select("*").order("submitted_at", { ascending: false }),
        supabase.from("song_requests").select("invite_code"),
      ]);

      if (requestId !== loadRequest.current) return;

      if (inviteError || responseError || songError) {
        const error = inviteError ?? responseError ?? songError;

        if (isAccessError(error)) {
          setAdminState("denied");
          return;
        }

        console.error(error);
        toast.error("Could not load admin data.");
        setAdminState("denied");
        return;
      }

      setInvites(inviteRows ?? []);
      setResponses(responseRows ?? []);
      setSongRequests((songRows as Array<{ invite_code: string }> | null) ?? []);
      setAdminState("admin");
    } finally {
      if (requestId === loadRequest.current) {
        setLoadingData(false);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAdminState(data.session ? "checking" : "logged_out");
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAdminState(nextSession ? "checking" : "logged_out");
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      void loadAdminData(session);
    } else {
      loadRequest.current += 1;
      setInvites([]);
      setResponses([]);
      setSongRequests([]);
    }
  }, [loadAdminData, session]);

  useEffect(() => {
    const inviteCodes = new Set(invites.map((invite) => invite.code));
    setSelectedCodes((current) => current.filter((code) => inviteCodes.has(code)));
  }, [invites]);

  function toggleInviteSelection(code: string, checked: boolean) {
    setSelectedCodes((current) => {
      if (checked) {
        return current.includes(code) ? current : [...current, code];
      }

      return current.filter((selectedCode) => selectedCode !== code);
    });
  }

  function toggleAllInviteSelection(checked: boolean) {
    setSelectedCodes(checked ? invites.map((invite) => invite.code) : []);
  }

  async function onLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoggingIn(true);

    try {
      if (loginMode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: makeAdminUrl(),
          },
        });

        if (error) throw error;
        toast.success("Magic link sent.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      toast.success("Signed in.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function onSignOut() {
    await supabase.auth.signOut();
    setSession(null);
    setAdminState("logged_out");
  }

  async function onGenerateInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerating(true);

    try {
      const token = await getAccessToken();
      const response = await callFunction<GenerateInviteResponse>(
        "generate-invite",
        { notes: notes.trim() || null },
        token,
      );
      setNotes("");
      if (response.ok) {
        try {
          await copyInvitationUrl(response.code);
          toast.success("Invitation code generated and URL copied.");
        } catch (error) {
          console.error(error);
          toast.success("Invitation code generated.");
          toast.error("Could not copy link.");
        }
      }
      await loadAdminData(session);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not generate invite.");
    } finally {
      setGenerating(false);
    }
  }

  async function onDisableInvite(code: string) {
    setDisablingCode(code);

    try {
      const token = await getAccessToken();
      await callFunction<DisableInviteResponse>("disable-invite", { code }, token);
      toast.success("Invitation code disabled.");
      await loadAdminData(session);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not disable invite.");
    } finally {
      setDisablingCode(null);
    }
  }

  async function onDeleteInvite(code: string) {
    setDeletingCode(code);

    try {
      const token = await getAccessToken();
      await callFunction<DeleteInviteResponse>("delete-invite", { code }, token);
      toast.success("Invitation code deleted.");
      await loadAdminData(session);
    } catch (error) {
      console.error(error);

      if (error instanceof Error && error.message === "has_related_records") {
        toast.error("This code has RSVP or music records. Disable it instead.");
        return;
      }

      toast.error(error instanceof Error ? error.message : "Could not delete invite.");
    } finally {
      setDeletingCode(null);
    }
  }

  async function onBulkDisableInvites() {
    if (selectedActiveInvites.length === 0) {
      toast.error("Selected codes are already disabled.");
      return;
    }

    setBulkAction("disable");

    try {
      const token = await getAccessToken();

      await Promise.all(
        selectedActiveInvites.map((invite) =>
          callFunction<DisableInviteResponse>("disable-invite", { code: invite.code }, token),
        ),
      );

      toast.success(`${selectedActiveInvites.length} invitation code(s) disabled.`);
      setSelectedCodes([]);
      await loadAdminData(session);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not disable selected invites.");
    } finally {
      setBulkAction(null);
    }
  }

  async function onBulkDeleteInvites() {
    if (selectedInvites.length === 0) return;

    setBulkAction("delete");

    let deletedCount = 0;
    let blockedCount = 0;
    let failedCount = 0;

    try {
      const token = await getAccessToken();

      for (const invite of selectedInvites) {
        try {
          await callFunction<DeleteInviteResponse>("delete-invite", { code: invite.code }, token);
          deletedCount += 1;
        } catch (error) {
          console.error(error);

          if (error instanceof Error && error.message === "has_related_records") {
            blockedCount += 1;
          } else {
            failedCount += 1;
          }
        }
      }

      if (deletedCount > 0) {
        toast.success(`${deletedCount} invitation code(s) deleted.`);
      }

      if (blockedCount > 0) {
        toast.error(`${blockedCount} code(s) have RSVP or music records. Disable them instead.`);
      }

      if (failedCount > 0) {
        toast.error(`${failedCount} code(s) could not be deleted.`);
      }

      setSelectedCodes([]);
      await loadAdminData(session);
    } finally {
      setBulkAction(null);
    }
  }

  async function copyLink(code: string) {
    try {
      await copyInvitationUrl(code);
      toast.success("Invitation URL copied.");
    } catch (error) {
      console.error(error);
      toast.error("Could not copy link.");
    }
  }

  if (adminState === "logged_out") {
    return (
      <section className="min-h-[70vh] bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-md">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Admin sign in</CardTitle>
              <CardDescription>Use a wedding admin account to manage invitations.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={loginMode} onValueChange={(value) => setLoginMode(value as LoginMode)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="magic">Magic link</TabsTrigger>
                  <TabsTrigger value="password">Password</TabsTrigger>
                </TabsList>
                <form onSubmit={onLogin} className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                  <TabsContent value="password" className="mt-0">
                    <div className="space-y-2">
                      <Label htmlFor="admin-password">Password</Label>
                      <Input
                        id="admin-password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required={loginMode === "password"}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="magic" className="mt-0">
                    <Alert>
                      <Mail className="size-4" />
                      <AlertTitle>Email sign in</AlertTitle>
                      <AlertDescription>
                        A one-time link will be sent to the admin email address.
                      </AlertDescription>
                    </Alert>
                  </TabsContent>
                  <Button type="submit" className="w-full" disabled={loggingIn}>
                    {loggingIn ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                    {loginMode === "magic" ? "Send magic link" : "Sign in"}
                  </Button>
                </form>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  if (adminState === "checking") {
    return (
      <section className="grid min-h-[60vh] place-items-center bg-slate-50 px-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Checking admin access
        </div>
      </section>
    );
  }

  if (adminState === "denied") {
    return (
      <section className="min-h-[70vh] bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-lg">
          <Alert variant="destructive">
            <ShieldAlert className="size-4" />
            <AlertTitle>Access denied</AlertTitle>
            <AlertDescription>
              This account is authenticated, but it is not authorized as an admin.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="outline" onClick={onSignOut}>
              <LogOut />
              Sign out
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-slate-50 px-4 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-lg border bg-background p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Admin</p>
            <h1 className="text-2xl font-semibold tracking-normal text-foreground">
              Invitation dashboard
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void loadAdminData(session)}>
              <RefreshCw className={cn(loadingData && "animate-spin")} />
              Refresh
            </Button>
            <Button type="button" variant="outline" onClick={onSignOut}>
              <LogOut />
              Sign out
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-lg">
            <CardHeader className="pb-2">
              <CardDescription>Total invites</CardDescription>
              <CardTitle className="text-3xl">{invites.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg">
            <CardHeader className="pb-2">
              <CardDescription>Attending responses</CardDescription>
              <CardTitle className="text-3xl">{totals.attending}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg">
            <CardHeader className="pb-2">
              <CardDescription>Expected guests</CardDescription>
              <CardTitle className="text-3xl">{totals.guests}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Generate invitation</CardTitle>
            <CardDescription>Create a unique invite code.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onGenerateInvite} className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="invite-notes">Notes</Label>
                <Textarea
                  id="invite-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional label, household name, or delivery note"
                  maxLength={1000}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={generating}>
                  {generating ? <Loader2 className="animate-spin" /> : <Plus />}
                  Generate code
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Invitation codes</CardTitle>
            <CardDescription>
              Copy invitation URLs, monitor limits, disable, or delete unused codes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invites.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                No invitation codes have been generated yet.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedCodes.length > 0 && (
                  <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      {selectedCodes.length} invitation code(s) selected
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={bulkAction !== null || selectedActiveInvites.length === 0}
                          >
                            {bulkAction === "disable" ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <XCircle />
                            )}
                            Disable selected
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Disable selected codes?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will disable {selectedActiveInvites.length} selected active
                              code(s). Disabled codes can no longer be used to RSVP or request
                              music.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className={buttonVariants({ variant: "destructive" })}
                              onClick={() => void onBulkDisableInvites()}
                            >
                              Disable codes
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={bulkAction !== null}
                          >
                            {bulkAction === "delete" ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <Trash2 />
                            )}
                            Delete selected
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete selected codes?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete {selectedCodes.length} selected code(s).
                              Codes with RSVP or music records cannot be deleted; disable them
                              instead.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className={buttonVariants({ variant: "destructive" })}
                              onClick={() => void onBulkDeleteInvites()}
                            >
                              Delete codes
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            allInvitesSelected
                              ? true
                              : someInvitesSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={(checked) => toggleAllInviteSelection(checked === true)}
                          aria-label="Select all invitation codes"
                        />
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invitation URL</TableHead>
                      <TableHead>RSVPs</TableHead>
                      <TableHead>Music requests</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => {
                      const url = makeInvitationUrl(invite.code);
                      const status = inviteStatus(invite);
                      const rsvpCount = responses.filter(
                        (response) => response.invite_code === invite.code,
                      ).length;
                      const musicCount = songRequests.filter(
                        (request) => request.invite_code === invite.code,
                      ).length;
                      const selected = selectedCodes.includes(invite.code);

                      return (
                        <TableRow key={invite.id} data-state={selected ? "selected" : undefined}>
                          <TableCell className="font-mono text-xs">{invite.code}</TableCell>
                          <TableCell>
                            <Checkbox
                              checked={selected}
                              onCheckedChange={(checked) =>
                                toggleInviteSelection(invite.code, checked === true)
                              }
                              aria-label={`Select invitation code ${invite.code}`}
                            />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={status} />
                          </TableCell>
                          <TableCell className="max-w-80 break-all text-xs text-muted-foreground">
                            {url}
                          </TableCell>
                          <TableCell>{rsvpCount} / 1</TableCell>
                          <TableCell>{musicCount} / 3</TableCell>
                          <TableCell className="max-w-56 whitespace-normal">
                            {invite.notes || "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(invite.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void copyLink(invite.code)}
                              >
                                <Copy />
                                Copy
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={status === "disabled" || disablingCode === invite.code}
                                onClick={() => void onDisableInvite(invite.code)}
                              >
                                {disablingCode === invite.code ? (
                                  <Loader2 className="animate-spin" />
                                ) : (
                                  <XCircle />
                                )}
                                Disable
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={deletingCode === invite.code}
                                  >
                                    {deletingCode === invite.code ? (
                                      <Loader2 className="animate-spin" />
                                    ) : (
                                      <Trash2 />
                                    )}
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete invitation code?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete {invite.code}. Codes with RSVP or
                                      music records cannot be deleted; disable them instead.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className={buttonVariants({ variant: "destructive" })}
                                      onClick={() => void onDeleteInvite(invite.code)}
                                    >
                                      Delete code
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>RSVP responses</CardTitle>
            <CardDescription>
              {responses.length} submitted, {totals.declined} declined.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                No RSVP responses have been submitted yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Dietary</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response) => (
                    <TableRow key={response.id}>
                      <TableCell className="font-medium">{response.full_name}</TableCell>
                      <TableCell className="font-mono text-xs">{response.invite_code}</TableCell>
                      <TableCell>
                        <Badge variant={response.attending ? "outline" : "secondary"}>
                          {response.attending ? "attending" : "declined"}
                        </Badge>
                      </TableCell>
                      <TableCell>{response.guest_count}</TableCell>
                      <TableCell className="max-w-56 whitespace-normal">
                        {response.dietary_requirements || "None"}
                      </TableCell>
                      <TableCell className="max-w-56 whitespace-normal">
                        {response.notes || "None"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(response.submitted_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

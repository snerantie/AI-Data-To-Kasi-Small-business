import { useCallback, useEffect, useState } from "react";
import type { Lang } from "./i18n";
import { isCloudConfigured } from "./lib/supabase";
import {
  createInvite as remoteCreateInvite,
  createStokvel as remoteCreateStokvel,
  ensureSession,
  fetchLatestInvite,
  fetchProfile,
  fetchSales,
  fetchTabs,
  fetchUserPrimaryStokvel,
  getCurrentAuth,
  insertContribution as remoteInsertContribution,
  insertSale as remoteInsertSale,
  insertSales as remoteInsertSales,
  insertTab as remoteInsertTab,
  joinStokvelByCode as remoteJoinStokvel,
  leaveStokvel as remoteLeaveStokvel,
  linkEmail as remoteLinkEmail,
  saveStokvelBanking as remoteSaveStokvelBanking,
  setContributionStatus as remoteSetContributionStatus,
  onAuthChange,
  resetToFreshAnon,
  sendSignInLink as remoteSendSignInLink,
  signOut as remoteSignOut,
  updateStokvel as remoteUpdateStokvel,
  updateTabPaid as remoteUpdateTabPaid,
  upsertProfile as remoteUpsertProfile,
} from "./lib/remote";
import type { AuthResult, CurrentAuth } from "./lib/remote";
import {
  createCheckout as paymentCreateCheckout,
  fetchPaymentConfigStatus,
  savePaymentConfig as paymentSaveConfig,
  subscribeToStokvelPayments,
} from "./lib/payments";
import type {
  PaymentConfigStatus,
  SavePaymentConfigResult,
} from "./lib/payments";
import { computeKasiScore } from "./lib/score";
import type { ScoreDetail, ScoreTier, ScoreFactorKey, ScoreFactor } from "./lib/score";

// Re-export score types so screens can import from a single place.
export type { ScoreDetail, ScoreTier, ScoreFactorKey, ScoreFactor };

// ---- Types -----------------------------------------------------------------

export type BusinessType =
  | "spaza"
  | "salon"
  | "taxi"
  | "tailor"
  | "food"
  | "other";

export type Profile = {
  ownerName: string | null;
  businessName: string | null;
  businessType: BusinessType | null;
};

export type Sale = {
  id: string;
  item: string;
  qty: number;
  price: number;
  createdAt: number;
  raw?: string;
  source?: "voice" | "manual";
};

export type Tab = {
  id: string;
  customer: string;
  amount: number;
  createdAt: number;
  paid?: boolean;
};

export type MemberRole = "admin" | "member";

export type StokvelMember = {
  userId: string;
  role: MemberRole;
  displayName: string;
  joinedAt: number;
};

// Verification lifecycle for a contribution. Introduced in migration
// 007. Rows created before 007 land as "confirmed" (grandfathered).
//   pending   — member says they paid, admin hasn't verified yet
//   confirmed — verified by admin, or a Yoco card charge that landed
//   rejected  — admin explicitly rejected (e.g. transfer never arrived)
export type ContributionStatus = "pending" | "confirmed" | "rejected";

// How the money moved (or is claimed to have moved). Used both to
// present the right icon/copy in the UI and to feed KasiScore weights
// later.
export type ContributionMethod =
  | "manual"
  | "eft"
  | "cash"
  | "yoco"
  | "payshap"
  | "other";

export type Contribution = {
  id: string;
  amount: number;
  createdAt: number;
  note?: string;
  memberName?: string; // For display: who contributed
  ownerId?: string;
  // Migration 007 fields. All optional so the type still fits rows
  // from older code paths (e.g. Yoco webhook contributions inserted
  // before 007 was applied).
  status?: ContributionStatus;
  method?: ContributionMethod;
  reference?: string;
  confirmedAt?: number;
  rejectedReason?: string;
};

// Bank account attached to the stokvel — where members must EFT
// contributions. Every field is optional because a stokvel might have
// no banking configured yet (fresh stokvel) or only some fields.
export type StokvelBankAccount = {
  bankName: string | null;
  accountHolder: string | null;
  accountNumber: string | null;
  branchCode: string | null;
  payshapPhone: string | null;
};

export type Stokvel = {
  id: string;
  name: string;
  goal: number;
  members: number; // Target member count set on creation
  memberships: StokvelMember[];
  contributions: Contribution[];
  role: MemberRole; // Current user's role in this stokvel
  bankAccount: StokvelBankAccount | null;
};

export type StokvelInvite = {
  code: string;
  createdAt: number;
  expiresAt: number | null;
};

export type AppState = {
  lang: Lang | null;
  profile: Profile;
  sales: Sale[];
  tabs: Tab[];
  stokvel: Stokvel | null;
  paymentConfig: PaymentConfigStatus | null;
  onboarded: boolean;
};

export type ContributeAction =
  | { kind: "logged"; amount: number }
  | { kind: "redirect"; url: string; paymentId: string; isTest: boolean }
  | { kind: "error"; error: string };

export type SyncStatus = "local" | "connecting" | "synced" | "error";

// ---- Empty starting state -------------------------------------------------

const emptyState: AppState = {
  lang: null,
  onboarded: false,
  profile: {
    ownerName: null,
    businessName: null,
    businessType: null,
  },
  sales: [],
  tabs: [],
  stokvel: null,
  paymentConfig: null,
};

// ---- Persistence ----------------------------------------------------------

const KEY = "kasikash-state-v4";
const LEGACY_KEYS = ["kasikash-state-v3", "kasikash-state-v2"];

function loadInitial(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      return {
        ...emptyState,
        ...parsed,
        profile: { ...emptyState.profile, ...(parsed.profile ?? {}) },
      };
    }
    // Migrate from older cache versions
    for (const legacyKey of LEGACY_KEYS) {
      const legacy = localStorage.getItem(legacyKey);
      if (legacy) {
        const parsed = JSON.parse(legacy) as Partial<AppState> & {
          stokvel?: { name?: string };
        };
        return {
          ...emptyState,
          lang: parsed.lang ?? null,
          onboarded: Boolean(parsed.onboarded),
          sales: parsed.sales ?? [],
          tabs: parsed.tabs ?? [],
          profile: { ...emptyState.profile, ...(parsed.profile ?? {}) },
          // Legacy stokvel shape is discarded; will be re-hydrated from server
          stokvel: null,
        };
      }
    }
  } catch {
    // ignore
  }
  return emptyState;
}

function saveLocal(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

// ---- Module-level state ---------------------------------------------------

let state: AppState = loadInitial();
let userId: string | null = null;
let stokvelId: string | null = null;
let syncStatus: SyncStatus = isCloudConfigured ? "connecting" : "local";
let authInfo: CurrentAuth = {
  userId: null,
  email: null,
  isAnonymous: false,
};
export type PendingAuth = "verification" | "signin" | null;
let pendingAuth: PendingAuth = null;
const subs = new Set<() => void>();

// Realtime subscription for the current stokvel's payments — teardown on
// stokvel change so we don't leak channels.
let paymentUnsub: (() => void) | null = null;

function attachPaymentSubscription(newStokvelId: string | null) {
  if (paymentUnsub) {
    paymentUnsub();
    paymentUnsub = null;
  }
  if (!newStokvelId || !isCloudConfigured) return;
  paymentUnsub = subscribeToStokvelPayments(newStokvelId, () => {
    // Any change to a stokvel_payments row for this stokvel → refetch.
    // The DB trigger handles inserting the contribution row on succeed;
    // re-hydrating pulls it into state alongside any other members'
    // contributions that landed since the last fetch.
    hydrateFromRemote();
  });
}

function notify() {
  subs.forEach((fn) => fn());
}

function setSync(next: SyncStatus) {
  if (syncStatus === next) return;
  syncStatus = next;
  notify();
}

function setState(
  patch: Partial<AppState> | ((s: AppState) => Partial<AppState>),
) {
  const delta = typeof patch === "function" ? patch(state) : patch;
  state = {
    ...state,
    ...delta,
    profile:
      delta.profile !== undefined
        ? { ...state.profile, ...delta.profile }
        : state.profile,
    // stokvel is either null or replaced wholesale
    stokvel:
      delta.stokvel !== undefined ? delta.stokvel : state.stokvel,
  };
  saveLocal(state);
  notify();
}

// ---- Cloud hydration ------------------------------------------------------
//
// Hydration is coalesced: if a hydrate is already in-flight when
// another is requested, we don't start a second one. Instead we set a
// `hydrateRequested` flag; when the current hydrate finishes, we
// re-run once more if requested. This means:
//   - No concurrent hydrations \u2192 no `userId` write-race
//   - Auth events + explicit re-hydrates always converge to the
//     latest session state within one extra pass
//
// `suppressAuthHydrate` is a separate switch used only during atomic
// operations (reset / sign-out) where we're explicitly managing auth
// and don't want the SIGNED_OUT/SIGNED_IN listener to interleave.

let hydrating: Promise<void> | null = null;
let currentHydrate: Promise<void> | null = null;
let hydrateRequested = false;
let suppressAuthHydrate = false;

async function performHydrate(): Promise<void> {
  if (!isCloudConfigured) return;
  setSync("connecting");
  try {
    const uid = await ensureSession();
    if (!uid) {
      setSync("error");
      return;
    }
    userId = uid;
    authInfo = await getCurrentAuth();

    const [profileFetch, sales, tabs, stokvelRes] = await Promise.all([
      fetchProfile(uid),
      fetchSales(uid),
      fetchTabs(uid),
      fetchUserPrimaryStokvel(uid),
    ]);

    // Fetch payment config if a stokvel exists (needs to happen after
    // we know the stokvel id — separate call, small overhead)
    const paymentConfig = stokvelRes?.stokvelId
      ? await fetchPaymentConfigStatus(stokvelRes.stokvelId)
      : null;

    const previousStokvelId = stokvelId;
    const nextStokvelId = stokvelRes?.stokvelId ?? null;

    const merged: AppState = {
      ...state,
      lang: profileFetch?.language ?? state.lang,
      onboarded: profileFetch ? profileFetch.onboarded : state.onboarded,
      profile: profileFetch?.profile ?? state.profile,
      sales: sales ?? state.sales,
      tabs: tabs ?? state.tabs,
      stokvel: stokvelRes?.stokvel ?? null,
      paymentConfig,
    };

    state = merged;
    stokvelId = nextStokvelId;
    saveLocal(state);

    // If the stokvel changed (or first load), re-attach realtime sub
    if (previousStokvelId !== nextStokvelId) {
      attachPaymentSubscription(nextStokvelId);
    }

    setSync("synced");
    notify();
  } catch (err) {
    console.warn("[kasikash] performHydrate failed:", err);
    setSync("error");
  }
}

async function hydrateFromRemote(): Promise<void> {
  if (currentHydrate) {
    hydrateRequested = true;
    return currentHydrate;
  }
  currentHydrate = (async () => {
    do {
      hydrateRequested = false;
      await performHydrate();
    } while (hydrateRequested);
  })();
  try {
    await currentHydrate;
  } finally {
    currentHydrate = null;
  }
}

if (isCloudConfigured && typeof window !== "undefined") {
  hydrating = hydrateFromRemote();

  onAuthChange((event) => {
    // While an atomic auth operation (reset / sign-out) is running,
    // ignore the SIGNED_OUT/SIGNED_IN storm it produces \u2014 that caller
    // is responsible for triggering the single reconciling hydrate.
    if (suppressAuthHydrate) return;

    if (
      event === "SIGNED_IN" ||
      event === "USER_UPDATED" ||
      event === "SIGNED_OUT"
    ) {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        pendingAuth = null;
      }
      hydrateFromRemote();
    }
  });
}

function sync<T>(op: () => Promise<T>) {
  if (!isCloudConfigured) return;
  op().catch((err) => {
    console.warn("[kasikash] remote sync failed:", err);
  });
}

// ---- Hook -----------------------------------------------------------------

export function useStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  }, []);

  // -- Onboarding actions --

  const setLang = useCallback((lang: Lang) => {
    setState({ lang });
    if (userId) {
      sync(() => remoteUpsertProfile(userId!, { language: lang }));
    } else if (isCloudConfigured) {
      (async () => {
        await hydrating;
        if (userId) await remoteUpsertProfile(userId, { language: lang });
      })();
    }
  }, []);

  const setProfile = useCallback((patch: Partial<Profile>) => {
    setState({ profile: patch as Profile });
    if (userId) {
      sync(() =>
        remoteUpsertProfile(userId!, {
          ownerName: patch.ownerName,
          businessName: patch.businessName,
          businessType: patch.businessType,
        }),
      );
    } else if (isCloudConfigured) {
      (async () => {
        await hydrating;
        if (userId) {
          await remoteUpsertProfile(userId, {
            ownerName: patch.ownerName,
            businessName: patch.businessName,
            businessType: patch.businessType,
          });
        }
      })();
    }
  }, []);

  const finishOnboarding = useCallback(() => {
    setState({ onboarded: true });
    if (userId) {
      sync(() => remoteUpsertProfile(userId!, { onboarded: true }));
    }
  }, []);

  // -- Stokvel actions --

  /**
   * Create a new stokvel with the current user as admin. Returns the created
   * stokvel's id on success.
   */
  const createStokvelAsAdmin = useCallback(
    async (input: {
      name: string;
      goal: number;
      members: number;
    }): Promise<string | null> => {
      if (!userId) return null;
      const id = await remoteCreateStokvel(userId, input);
      if (id) {
        stokvelId = id;
        // Re-hydrate to pick up the new membership + stokvel row
        await hydrateFromRemote();
      }
      return id;
    },
    [],
  );

  /**
   * Join an existing stokvel using an invite code.
   */
  const joinStokvelByCode = useCallback(async (code: string) => {
    if (!isCloudConfigured) {
      return { ok: false, error: "Cloud not configured" } as const;
    }
    const result = await remoteJoinStokvel(code);
    if (result.ok) {
      stokvelId = result.stokvelId;
      await hydrateFromRemote();
    }
    return result;
  }, []);

  /**
   * Generate a fresh invite code (admin only). Returns the code on success.
   */
  const generateInvite = useCallback(async (): Promise<
    StokvelInvite | null
  > => {
    if (!userId || !stokvelId) return null;
    return await remoteCreateInvite(userId, stokvelId);
  }, []);

  /**
   * Fetch the most recent existing invite for the current stokvel (if any).
   */
  const getLatestInvite = useCallback(async (): Promise<
    StokvelInvite | null
  > => {
    if (!stokvelId) return null;
    return await fetchLatestInvite(stokvelId);
  }, []);

  /**
   * Leave the current stokvel. Refuses if the user is the sole admin.
   */
  const leaveStokvel = useCallback(async () => {
    if (!userId || !stokvelId) {
      return { ok: false, error: "no_stokvel" } as const;
    }
    const result = await remoteLeaveStokvel(userId, stokvelId);
    if (result.ok) {
      stokvelId = null;
      setState({ stokvel: null });
      await hydrateFromRemote();
    }
    return result;
  }, []);

  const setStokvelMeta = useCallback(
    (patch: Partial<Pick<Stokvel, "name" | "goal" | "members">>) => {
      if (!state.stokvel) return;
      // Optimistic local update (only admins should call this; UI enforces)
      setState({
        stokvel: {
          ...state.stokvel,
          ...patch,
        },
      });
      if (stokvelId) sync(() => remoteUpdateStokvel(stokvelId!, patch));
    },
    [],
  );

  // -- Sales --

  const addSale = useCallback((sale: Omit<Sale, "id" | "createdAt">) => {
    const full: Sale = {
      ...sale,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setState((s) => ({ sales: [full, ...s.sales] }));
    if (userId) sync(() => remoteInsertSale(userId!, full));
    return full;
  }, []);

  const addSales = useCallback((sales: Omit<Sale, "id" | "createdAt">[]) => {
    const now = Date.now();
    const full: Sale[] = sales.map((sale, i) => ({
      ...sale,
      id: crypto.randomUUID(),
      createdAt: now + i,
    }));
    setState((s) => ({ sales: [...full, ...s.sales] }));
    if (userId) sync(() => remoteInsertSales(userId!, full));
  }, []);

  const undoSale = useCallback((id: string) => {
    setState((s) => ({ sales: s.sales.filter((x) => x.id !== id) }));
    if (userId && isCloudConfigured) {
      sync(async () => {
        const { supabase } = await import("./lib/supabase");
        if (supabase) {
          await supabase.from("sales").delete().eq("id", id);
        }
      });
    }
  }, []);

  // -- Tabs --

  const addTab = useCallback((tab: Omit<Tab, "id" | "createdAt">) => {
    const full: Tab = {
      ...tab,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setState((s) => ({ tabs: [full, ...s.tabs] }));
    if (userId) sync(() => remoteInsertTab(userId!, full));
  }, []);

  const markTabPaid = useCallback((id: string) => {
    setState((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, paid: true } : t)),
    }));
    sync(() => remoteUpdateTabPaid(id));
  }, []);

  const addContribution = useCallback(
    (
      amount: number,
      note?: string,
      opts?: { method?: ContributionMethod; reference?: string },
    ) => {
      if (!state.stokvel) return;
      const c: Contribution = {
        id: crypto.randomUUID(),
        amount,
        note,
        createdAt: Date.now(),
        memberName:
          state.stokvel.memberships.find((m) => m.userId === userId)
            ?.displayName ?? state.profile.ownerName ?? undefined,
        ownerId: userId ?? undefined,
        // Every client-initiated contribution starts life as pending —
        // an admin has to verify that the EFT / cash actually arrived
        // before it counts toward the pot. Yoco-originated rows are
        // written by the server-side handle_payment_succeeded trigger
        // (see migration 007) and land already-confirmed.
        status: "pending",
        method: opts?.method ?? "eft",
        reference: opts?.reference,
      };
      setState((s) => ({
        stokvel: s.stokvel
          ? {
              ...s.stokvel,
              contributions: [c, ...s.stokvel.contributions],
            }
          : null,
      }));
      if (userId && stokvelId) {
        sync(() => remoteInsertContribution(userId!, stokvelId!, c));
      }
    },
    [],
  );

  /**
   * Admin-only. Save the stokvel's bank account details (or clear
   * them by passing empty strings). Server-side RPC enforces the
   * admin check.
   */
  const saveStokvelBanking = useCallback(
    async (bank: {
      bankName: string;
      accountHolder: string;
      accountNumber: string;
      branchCode: string;
      payshapPhone?: string;
    }) => {
      if (!stokvelId) {
        return { ok: false as const, error: "no_stokvel" };
      }
      const result = await remoteSaveStokvelBanking(stokvelId, bank);
      if (result.ok) {
        // Optimistically update local state so the ContributeSheet
        // picks up the new bank details on its next open, without
        // waiting for a full refetch.
        setState((s) => ({
          stokvel: s.stokvel
            ? {
                ...s.stokvel,
                bankAccount: {
                  bankName: bank.bankName || null,
                  accountHolder: bank.accountHolder || null,
                  accountNumber: bank.accountNumber || null,
                  branchCode: bank.branchCode || null,
                  payshapPhone: bank.payshapPhone || null,
                },
              }
            : null,
        }));
      }
      return result;
    },
    [],
  );

  /**
   * Admin-only. Mark a pending contribution as verified — money
   * arrived in the stokvel account — so it counts toward the pot.
   */
  const confirmContribution = useCallback(async (contributionId: string) => {
    const result = await remoteSetContributionStatus(contributionId, "confirmed");
    if (result.ok) {
      setState((s) => ({
        stokvel: s.stokvel
          ? {
              ...s.stokvel,
              contributions: s.stokvel.contributions.map((c) =>
                c.id === contributionId
                  ? { ...c, status: "confirmed" as const, confirmedAt: Date.now() }
                  : c,
              ),
            }
          : null,
      }));
    }
    return result;
  }, []);

  /**
   * Admin-only. Mark a pending contribution as rejected (didn't
   * arrive, wrong amount, etc.). Optional reason is displayed to the
   * member on their pending badge.
   */
  const rejectContribution = useCallback(
    async (contributionId: string, reason?: string) => {
      const result = await remoteSetContributionStatus(
        contributionId,
        "rejected",
        reason,
      );
      if (result.ok) {
        setState((s) => ({
          stokvel: s.stokvel
            ? {
                ...s.stokvel,
                contributions: s.stokvel.contributions.map((c) =>
                  c.id === contributionId
                    ? {
                        ...c,
                        status: "rejected" as const,
                        rejectedReason: reason,
                      }
                    : c,
                ),
              }
            : null,
        }));
      }
      return result;
    },
    [],
  );

  /**
   * Smart contribute: routes through Yoco when the stokvel has an active
   * payment config, otherwise falls back to the manual record-keeping
   * path. Returns a typed result the caller acts on:
   *   - "logged"   → contribution was recorded locally, show success UI
   *   - "redirect" → navigate window.location to the checkout URL
   *   - "error"    → surface error to the user
   */
  const startContribution = useCallback(
    async (
      amount: number,
      note?: string,
      opts?: { method?: ContributionMethod; reference?: string },
    ): Promise<ContributeAction> => {
      if (!state.stokvel || !stokvelId) {
        return { kind: "error", error: "no_stokvel" };
      }
      const cfg = state.paymentConfig;
      // Yoco is only used when the caller explicitly wants a card
      // payment. Everything else (bank transfer, cash, PayShap) goes
      // through the manual-ledger path even if a Yoco config exists,
      // so members can still contribute via their own banking app
      // when they don't want to be charged a card fee.
      const wantsCard = !opts?.method || opts.method === "yoco";
      if (wantsCard && cfg && cfg.isActive && isCloudConfigured) {
        // Real payment path: create a Yoco checkout session. The
        // contribution row is created server-side by the payment
        // webhook once Yoco confirms the charge — so nothing hits
        // the UI until money has actually moved. Note isn't
        // plumbed through this path yet (Edge Function change).
        const result = await paymentCreateCheckout(stokvelId, amount);
        if (result.ok) {
          return {
            kind: "redirect",
            url: result.checkoutUrl,
            paymentId: result.paymentId,
            isTest: result.isTest,
          };
        }
        return { kind: "error", error: result.error };
      }
      // Manual-ledger path: user is recording a payment they made
      // outside the app (EFT / cash / bank transfer / PayShap). The
      // sheet UI has already told them their money doesn't move
      // through the app — no silent logging. Row lands as pending
      // until the admin verifies it.
      addContribution(amount, note, opts);
      return { kind: "logged", amount };
    },
    [addContribution],
  );

  /**
   * Admin-only: save/update the Yoco payment config for the current
   * stokvel. Client passes the Yoco secret key + test/live flag; the
   * Edge Function registers a webhook against it and stores the secrets
   * server-side. On success, refresh paymentConfig in state.
   */
  const savePaymentConfig = useCallback(
    async (
      yocoSecretKey: string,
      isTest: boolean,
    ): Promise<SavePaymentConfigResult> => {
      if (!stokvelId) {
        return { ok: false, error: "no_stokvel" };
      }
      const result = await paymentSaveConfig(stokvelId, yocoSecretKey, isTest);
      if (result.ok) {
        setState({
          paymentConfig: { isActive: result.isActive, isTest: result.isTest },
        });
      }
      return result;
    },
    [],
  );

  /**
   * Force a full re-hydrate from the server. Used by the App payment
   * return handler to make sure the newly-inserted contribution appears
   * even if the Realtime channel missed it.
   */
  const refreshFromRemote = useCallback(async (): Promise<void> => {
    await hydrateFromRemote();
  }, []);

  // -- Email auth --

  const linkEmailToAccount = useCallback(
    async (email: string): Promise<AuthResult> => {
      const result = await remoteLinkEmail(email);
      if (result.ok) {
        pendingAuth = "verification";
        notify();
      }
      return result;
    },
    [],
  );

  const signInWithEmail = useCallback(
    async (email: string): Promise<AuthResult> => {
      const result = await remoteSendSignInLink(email);
      if (result.ok) {
        pendingAuth = "signin";
        notify();
        hydrateFromRemote();
      }
      return result;
    },
    [],
  );

  const clearPendingAuth = useCallback(() => {
    if (pendingAuth === null) return;
    pendingAuth = null;
    notify();
  }, []);

  const signOut = useCallback(async (): Promise<AuthResult> => {
    // Silence the auth listener so its parallel SIGNED_OUT hydrate
    // doesn't race with the one we trigger explicitly below.
    suppressAuthHydrate = true;
    try {
      const result = await remoteSignOut();
      try {
        localStorage.removeItem(KEY);
        for (const key of LEGACY_KEYS) localStorage.removeItem(key);
      } catch {
        // ignore
      }
      state = { ...emptyState };
      userId = null;
      stokvelId = null;
      authInfo = { userId: null, email: null, isAnonymous: false };
      pendingAuth = null;
      notify();
      // Fresh anonymous session + full re-hydrate as one atomic step.
      await hydrateFromRemote();
      return result;
    } finally {
      suppressAuthHydrate = false;
    }
  }, []);

  const resetAccount = useCallback(async () => {
    // Silence the auth listener while we sign out + sign back in.
    // Otherwise the SIGNED_OUT and SIGNED_IN events fire their own
    // hydrations in parallel with ours, and end up with a stale
    // userId that no longer matches auth.uid() on the server \u2014 which
    // makes every subsequent INSERT fail with RLS 403.
    suppressAuthHydrate = true;
    try {
      try {
        localStorage.removeItem(KEY);
        for (const key of LEGACY_KEYS) localStorage.removeItem(key);
      } catch {
        // ignore
      }
      state = { ...emptyState };
      stokvelId = null;
      userId = null;
      authInfo = { userId: null, email: null, isAnonymous: false };
      pendingAuth = null;
      notify();

      if (isCloudConfigured) {
        const uid = await resetToFreshAnon();
        if (!uid) {
          setSync("error");
          return;
        }
        userId = uid;
        // One deterministic reconciling hydrate now that we know the
        // real session id. Subsequent auth events are suppressed
        // (see suppressAuthHydrate above) so they can't race.
        await hydrateFromRemote();
      }
    } finally {
      suppressAuthHydrate = false;
    }
  }, []);

  return {
    state,
    syncStatus,
    isCloud: isCloudConfigured,
    userId,
    email: authInfo.email,
    isSignedIn: Boolean(authInfo.email) && !authInfo.isAnonymous,
    isAnonymous: authInfo.isAnonymous,
    pendingAuth,
    // onboarding
    setLang,
    setProfile,
    finishOnboarding,
    // stokvel
    createStokvelAsAdmin,
    joinStokvelByCode,
    generateInvite,
    getLatestInvite,
    leaveStokvel,
    setStokvelMeta,
    saveStokvelBanking,
    confirmContribution,
    rejectContribution,
    // sales/tabs/contributions
    addSale,
    addSales,
    undoSale,
    addTab,
    markTabPaid,
    addContribution,
    startContribution,
    // payments
    savePaymentConfig,
    refreshFromRemote,
    // account
    resetAccount,
    linkEmailToAccount,
    signInWithEmail,
    signOut,
    clearPendingAuth,
  };
}

// ---- Derived selectors ----------------------------------------------------

export function todayRange(now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function sumSalesToday(sales: Sale[]) {
  const from = todayRange();
  return sales
    .filter((s) => s.createdAt >= from)
    .reduce((acc, s) => acc + s.qty * s.price, 0);
}

export function estimatedProfitToday(sales: Sale[]) {
  return Math.round(sumSalesToday(sales) * 0.22);
}

export function sumWeekProfit(sales: Sale[]) {
  const from = Date.now() - 1000 * 60 * 60 * 24 * 7;
  const week = sales.filter((s) => s.createdAt >= from);
  const rev = week.reduce((a, s) => a + s.qty * s.price, 0);
  return Math.round(rev * 0.22);
}

export function totalOwed(tabs: Tab[]) {
  return tabs.filter((t) => !t.paid).reduce((a, t) => a + t.amount, 0);
}

export function topSeller(sales: Sale[]) {
  const totals: Record<string, number> = {};
  for (const s of sales) {
    totals[s.item] = (totals[s.item] || 0) + s.qty * s.price;
  }
  let best: { item: string; rev: number } | null = null;
  for (const [item, rev] of Object.entries(totals)) {
    if (!best || rev > best.rev) best = { item, rev };
  }
  return best;
}

// A contribution counts toward the pot / member totals only when
// verified — either by the stokvel admin (EFT / cash flow) or by
// Yoco having actually charged the card. Rows without a status field
// (pre-migration-007 data) are treated as confirmed so historical
// totals don't suddenly drop.
const isConfirmed = (c: Contribution) =>
  (c.status ?? "confirmed") === "confirmed";

const isPending = (c: Contribution) => c.status === "pending";

export function stokvelTotal(stokvel: Stokvel | null) {
  if (!stokvel) return 0;
  return stokvel.contributions
    .filter(isConfirmed)
    .reduce((a, c) => a + c.amount, 0);
}

export function stokvelProgress(stokvel: Stokvel | null) {
  if (!stokvel || !stokvel.goal || stokvel.goal <= 0) return 0;
  return Math.max(0, Math.min(1, stokvelTotal(stokvel) / stokvel.goal));
}

/** Sum of one member's confirmed contributions to a stokvel. */
export function memberContributed(stokvel: Stokvel, userId: string) {
  return stokvel.contributions
    .filter((c) => c.ownerId === userId && isConfirmed(c))
    .reduce((a, c) => a + c.amount, 0);
}

/** Sum of contributions still awaiting admin verification (all members). */
export function stokvelPendingTotal(stokvel: Stokvel | null) {
  if (!stokvel) return 0;
  return stokvel.contributions
    .filter(isPending)
    .reduce((a, c) => a + c.amount, 0);
}

/** Count of contributions still awaiting admin verification. */
export function stokvelPendingCount(stokvel: Stokvel | null) {
  if (!stokvel) return 0;
  return stokvel.contributions.filter(isPending).length;
}

/** All pending contributions on this stokvel, newest first. */
export function stokvelPendingContributions(
  stokvel: Stokvel | null,
): Contribution[] {
  if (!stokvel) return [];
  return stokvel.contributions
    .filter(isPending)
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Generate a short human-friendly payment reference like "KASI-J8M7".
 * Uses an unambiguous alphabet (no 0/O/1/I/L). Nine characters total
 * so it fits comfortably in banking-app reference fields (SA banks
 * usually allow 20–30 chars).
 *
 * Note: not guaranteed unique — collision odds are ~1-in-800k per
 * stokvel and the reference is only ever used to help the admin
 * match a bank statement line to a pending contribution, so the odd
 * duplicate is fine.
 */
export function generateReference(): string {
  const chars = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
  const pick = () => chars[Math.floor(Math.random() * chars.length)];
  const seg = Array.from({ length: 4 }, pick).join("");
  return `KASI-${seg}`;
}

/**
 * KasiScore v2 lives in `./lib/score`. This wrapper preserves the
 * legacy `kasiScore(state) → number` signature so existing callers
 * (Insights screen, computeInsights, etc.) keep working, while
 * routing through the new multi-factor engine.
 *
 * The engine needs a userId to attribute contributions correctly.
 * We use the module-level userId that hydrateFromRemote maintains —
 * for anonymous cloud users it's the anon uid, for demo mode it's
 * null (which the engine handles gracefully with neutral defaults).
 */
export function kasiScore(state: AppState): number {
  return computeKasiScore(state, userId).score;
}

/**
 * Full breakdown for the Insights screen + PDF passport. Includes
 * per-factor scores + weights + human-readable raw values.
 */
export function kasiScoreDetail(state: AppState): ScoreDetail {
  return computeKasiScore(state, userId);
}

export function formatRand(n: number) {
  return "R" + n.toLocaleString("en-ZA", { maximumFractionDigits: 0 });
}

export function needsOnboarding(state: AppState): boolean {
  if (!state.onboarded) return true;
  if (!state.lang) return true;
  if (!state.profile.ownerName) return true;
  // Business info is optional — KasiKash is also used by people who
  // only want a stokvel with friends and don't run a spaza/salon/etc.
  // Stokvel is optional too — user can skip and add later.
  return false;
}

// ---- Dynamic insights engine ---------------------------------------------

export type Insight = {
  id: string;
  key: string;
  accent: "green" | "gold" | "coral";
  priority: number;
  params: Record<string, string | number>;
};

const daysAgo = (ts: number) =>
  Math.max(0, Math.round((Date.now() - ts) / (1000 * 60 * 60 * 24)));

export function computeInsights(state: AppState): Insight[] {
  const insights: Insight[] = [];
  const now = Date.now();

  const oldTabs = state.tabs.filter((t) => !t.paid && daysAgo(t.createdAt) >= 7);
  if (oldTabs.length > 0) {
    const worst = [...oldTabs].sort((a, b) => a.createdAt - b.createdAt)[0];
    insights.push({
      id: "old-tabs",
      key: "insightOldTabs",
      accent: "coral",
      priority: 90,
      params: {
        count: oldTabs.length,
        name: worst.customer,
        days: daysAgo(worst.createdAt),
      },
    });
  }

  const last24h = state.sales.filter(
    (s) => now - s.createdAt < 1000 * 60 * 60 * 24,
  );
  const cnt: Record<string, number> = {};
  for (const s of last24h) cnt[s.item] = (cnt[s.item] || 0) + 1;
  const hot = Object.entries(cnt).find(([, c]) => c >= 3);
  if (hot) {
    insights.push({
      id: "hot-item",
      key: "insightHotItem",
      accent: "green",
      priority: 80,
      params: { item: hot[0], count: hot[1] },
    });
  }

  const today = sumSalesToday(state.sales);
  const weekRev =
    state.sales
      .filter((s) => now - s.createdAt < 1000 * 60 * 60 * 24 * 7)
      .reduce((a, s) => a + s.qty * s.price, 0) || 1;
  const avg = weekRev / 7;
  if (today > 0 && avg > 0) {
    const pct = Math.round(((today - avg) / avg) * 100);
    if (pct >= 15) {
      insights.push({
        id: "up-today",
        key: "insightUpToday",
        accent: "green",
        priority: 70,
        params: { pct },
      });
    } else if (pct <= -20 && new Date().getHours() >= 12) {
      insights.push({
        id: "down-today",
        key: "insightDownToday",
        accent: "gold",
        priority: 60,
        params: { pct: Math.abs(pct) },
      });
    }
  }

  if (today === 0 && new Date().getHours() >= 12) {
    insights.push({
      id: "silent-day",
      key: "insightSilentDay",
      accent: "gold",
      priority: 75,
      params: {},
    });
  }

  const score = kasiScore(state);
  if (score >= 700) {
    insights.push({
      id: "credit-unlocked",
      key: "insightCreditUnlocked",
      accent: "green",
      priority: 65,
      params: { amount: 2000 },
    });
  } else if (score >= 600) {
    insights.push({
      id: "score-climbing",
      key: "insightScoreClimbing",
      accent: "gold",
      priority: 50,
      params: { score, needed: 700 - score },
    });
  }

  const stokvel = state.stokvel;
  const potPct = stokvelProgress(stokvel) * 100;
  if (stokvel && potPct >= 80 && potPct < 100) {
    const remain = stokvel.goal - stokvelTotal(stokvel);
    insights.push({
      id: "stokvel-close",
      key: "insightStokvelClose",
      accent: "green",
      priority: 55,
      params: { remain, name: stokvel.name },
    });
  } else if (stokvel && potPct < 30) {
    insights.push({
      id: "stokvel-start",
      key: "insightStokvelStart",
      accent: "gold",
      priority: 40,
      params: { name: stokvel.name },
    });
  }

  const owed = totalOwed(state.tabs);
  if (owed >= 200) {
    insights.push({
      id: "big-owed",
      key: "insightBigOwed",
      accent: "coral",
      priority: 45,
      params: { owed, half: Math.round(owed / 2) },
    });
  }

  return insights.sort((a, b) => b.priority - a.priority).slice(0, 3);
}

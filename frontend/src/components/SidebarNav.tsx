"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bookmark,
  ChevronDown,
  Film,
  Layers,
  LineChart,
  MonitorPlay,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Settings,
  SquareTerminal,
} from "lucide-react";

import { ApiError, getRuntimeStatus, stopRuntimeService, stopWebStack } from "@/lib/api";
import type { RuntimeService, RuntimeServiceName, RuntimeServiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAvpStore } from "@/lib/store";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Tier 1", icon: Film },
  { href: "/tier2", label: "Tier 2", icon: Layers },
  { href: "/watch-later", label: "あとで見る", icon: Bookmark },
  { href: "/ranking", label: "ランキング", icon: BarChart3 },
  { href: "/analysis", label: "分析", icon: LineChart },
  { href: "/search", label: "検索", icon: Search },
  { href: "/avp", label: "AVP", icon: MonitorPlay },
  { href: "/settings", label: "設定", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  const avpCount = useAvpStore((state) => state.avpCandidateIds.length);
  const [open, setOpen] = useState(true);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-[linear-gradient(180deg,var(--sidebar)_0%,color-mix(in_oklch,var(--sidebar),var(--background)_6%)_100%)] py-4 transition-[width] duration-200",
        open ? "w-72 px-3" : "w-14 px-2",
      )}
    >
      {/* ヘッダー + トグル */}
      <div className="mb-4 flex items-center justify-between gap-2">
        {open && (
          <div className="min-w-0 flex-1 rounded-2xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-3 shadow-sm">
            <div className="text-lg font-semibold tracking-tight">ClipBox</div>
            <div className="mt-1 text-xs text-muted-foreground">ローカル動画判定パネル</div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent/70 hover:text-foreground",
            !open && "w-full",
          )}
          aria-label={open ? "サイドバーを閉じる" : "サイドバーを開く"}
          title={open ? "サイドバーを閉じる" : "サイドバーを開く"}
        >
          {open ? (
            <PanelLeftClose className="size-4" />
          ) : (
            <PanelLeftOpen className="size-4" />
          )}
        </button>
      </div>

      {/* ナビゲーション */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const displayLabel = href === "/avp" ? `${label} (${avpCount})` : label;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-xl py-2 text-sm transition-colors",
                open ? "px-3" : "justify-center px-2",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
              )}
              title={!open ? displayLabel : undefined}
            >
              <Icon className="size-4 shrink-0" />
              {open && <span>{displayLabel}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Runtime パネル: 展開時はコンテンツが上に開く */}
      {open && (
        <div className="mt-auto">
          <RuntimeControlPanel />
        </div>
      )}
    </aside>
  );
}

type StopTarget = "streamlit" | "web-stack";

function RuntimeControlPanel() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<StopTarget | null>(null);

  const runtimeQuery = useQuery({
    queryKey: ["runtime-status"],
    queryFn: getRuntimeStatus,
    refetchInterval: 4_000,
    refetchIntervalInBackground: true,
    // 無効時（404）は retry しない。
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 1,
  });

  // CLIPBOX_ENABLE_RUNTIME_CONTROL 未設定だと /api/runtime は 404 → パネルを出さない。
  const controlDisabled =
    runtimeQuery.error instanceof ApiError && runtimeQuery.error.status === 404;

  // Streamlit は個別停止。Web/API（FastAPI + Next.js）は web-stack で一括停止する。
  const stopStreamlit = useMutation({
    mutationFn: async () => {
      const res = await stopRuntimeService("streamlit");
      // 念のため: 200 でも非 success ならエラー扱い（通常は 409/500 で例外）。
      if (res.status !== "success") {
        throw new ApiError(409, res.message || "停止できませんでした");
      }
      return res;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["runtime-status"] });
      setConfirmTarget(null);
    },
  });

  const serviceMap = new Map<RuntimeServiceName, RuntimeService>();
  for (const service of runtimeQuery.data?.services ?? []) {
    serviceMap.set(service.name, service);
  }
  const resolve = (name: RuntimeServiceName): RuntimeService =>
    serviceMap.get(name) ?? {
      name,
      label: name === "nextjs" ? "Next.js" : name === "fastapi" ? "FastAPI" : "Streamlit",
      port: name === "nextjs" ? 3000 : name === "fastapi" ? 8000 : 8501,
      status: "unknown" as RuntimeServiceStatus,
      pid: null,
    };
  const streamlit = resolve("streamlit");
  const fastapi = resolve("fastapi");
  const nextjs = resolve("nextjs");
  const webRunning = fastapi.status === "running" || nextjs.status === "running";

  const lastUpdatedText = runtimeQuery.data
    ? new Intl.DateTimeFormat("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(runtimeQuery.dataUpdatedAt))
    : "未取得";

  if (controlDisabled) {
    return null;
  }

  const handleConfirm = async () => {
    if (confirmTarget === "streamlit") {
      try {
        await stopStreamlit.mutateAsync();
      } catch {
        // ダイアログにエラーを残す（onError 経由で表示）。
      }
      return;
    }
    if (confirmTarget === "web-stack") {
      // FastAPI 停止で API も落ちるため、応答を待たずに遷移する。
      void stopWebStack().catch(() => {});
      window.location.replace("about:blank");
    }
  };

  return (
    <div className="rounded-2xl border border-sidebar-border bg-sidebar/90 shadow-sm">
      {/* 展開コンテンツ（上方向に開く） */}
      {isOpen && (
        <div className="space-y-2 p-3 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Runtime</h2>
              <p className="text-[11px] text-muted-foreground">最終更新: {lastUpdatedText}</p>
            </div>
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted"
              onClick={() => runtimeQuery.refetch()}
              aria-label="ランプを更新"
              title="ランプを更新"
            >
              <RefreshCw className={cn("size-4", runtimeQuery.isFetching && "animate-spin")} />
            </button>
          </div>

          <div className="space-y-2">
            <StopRow
              label="Streamlit"
              statuses={[streamlit.status]}
              meta={`Port ${streamlit.port}${streamlit.pid ? ` / PID ${streamlit.pid}` : ""}`}
              busy={stopStreamlit.isPending}
              disabled={streamlit.status !== "running" || stopStreamlit.isPending}
              onStop={() => setConfirmTarget("streamlit")}
            />
            <StopRow
              label="Web/API"
              statuses={[fastapi.status, nextjs.status]}
              meta={`FastAPI ${fastapi.port} / Next.js ${nextjs.port}`}
              busy={false}
              disabled={!webRunning}
              onStop={() => setConfirmTarget("web-stack")}
            />
          </div>
        </div>
      )}

      {/* トリガー（常時最下部） */}
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl p-3"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="sr-only">Runtime status</span>
        <div className="flex items-center gap-2">
          <RuntimeLamp status={streamlit.status} title={streamlit.label} />
          <RuntimeLamp status={fastapi.status} title={fastapi.label} />
          <RuntimeLamp status={nextjs.status} title={nextjs.label} />
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <StopConfirmDialog
        target={confirmTarget}
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
        pending={stopStreamlit.isPending}
        onConfirm={handleConfirm}
        error={stopStreamlit.error instanceof Error ? stopStreamlit.error.message : null}
      />
    </div>
  );
}

function StopRow({
  label,
  statuses,
  meta,
  busy,
  disabled,
  onStop,
}: {
  label: string;
  statuses: RuntimeServiceStatus[];
  meta: string;
  busy: boolean;
  disabled: boolean;
  onStop: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {statuses.map((status, index) => (
              <RuntimeLamp key={index} status={status} />
            ))}
            <span className="truncate text-sm font-medium">{label}</span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">{meta}</div>
        </div>
        <Button type="button" size="sm" variant="destructive" disabled={disabled} onClick={onStop}>
          {busy ? "停止中" : "停止"}
        </Button>
      </div>
    </div>
  );
}

function RuntimeLamp({
  status,
  title,
}: {
  status: RuntimeServiceStatus;
  title?: string;
}) {
  const lampClassName =
    status === "running"
      ? "bg-emerald-500 ring-4 ring-emerald-500/20"
      : status === "stopped"
        ? "bg-slate-300"
        : "bg-amber-400 ring-4 ring-amber-400/20";

  return (
    <span
      className={cn("size-2.5 rounded-full", lampClassName)}
      aria-hidden={title ? undefined : "true"}
      title={title}
    />
  );
}

function StopConfirmDialog({
  target,
  open,
  onOpenChange,
  onConfirm,
  pending,
  error,
}: {
  target: StopTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  pending: boolean;
  error: string | null;
}) {
  const isWeb = target === "web-stack";
  const label = isWeb ? "Web/API（FastAPI + Next.js）" : "Streamlit";
  const note = isWeb
    ? "Next.js → FastAPI の順に停止します。停止後はこの画面も終了します。"
    : "停止するとプロセスが終了します。";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>停止の確認</DialogTitle>
          <DialogDescription>
            {label} を停止しますか。{note}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm text-muted-foreground">
          {error ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            キャンセル
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || target === null}
            onClick={() => {
              void onConfirm();
            }}
          >
            <SquareTerminal className="size-4" />
            {pending ? "停止中" : "停止する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

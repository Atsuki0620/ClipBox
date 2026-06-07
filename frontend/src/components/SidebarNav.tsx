"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
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

import { stopRuntimeService, getRuntimeStatus } from "@/lib/api";
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
  { href: "/ranking", label: "ランキング", icon: BarChart3 },
  { href: "/analysis", label: "分析", icon: LineChart },
  { href: "/search", label: "検索", icon: Search },
  { href: "/avp", label: "AVP", icon: MonitorPlay },
  { href: "/settings", label: "設定", icon: Settings },
];

const RUNTIME_ORDER: RuntimeServiceName[] = ["streamlit", "fastapi", "nextjs"];

export function SidebarNav() {
  const pathname = usePathname();
  const avpCount = useAvpStore((state) => state.avpSelectedIds.length);
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

function RuntimeControlPanel() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<RuntimeServiceName | null>(null);

  const runtimeQuery = useQuery({
    queryKey: ["runtime-status"],
    queryFn: getRuntimeStatus,
    refetchInterval: 4_000,
    refetchIntervalInBackground: true,
    retry: 1,
  });

  const stopMutation = useMutation({
    mutationFn: stopRuntimeService,
    onSuccess: async (_data, service) => {
      if (service === "nextjs") {
        window.location.replace("about:blank");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["runtime-status"] });
    },
  });

  const serviceMap = new Map<RuntimeServiceName, RuntimeService>();
  for (const service of runtimeQuery.data?.services ?? []) {
    serviceMap.set(service.name, service);
  }

  const runtimeServices = RUNTIME_ORDER.map((name) => {
    const current = serviceMap.get(name);
    return (
      current ?? {
        name,
        label: name === "nextjs" ? "Next.js" : name === "fastapi" ? "FastAPI" : "Streamlit",
        port: name === "nextjs" ? 3000 : name === "fastapi" ? 8000 : 8501,
        status: "unknown" as RuntimeServiceStatus,
        pid: null,
      }
    );
  });

  const lastUpdatedText = runtimeQuery.data
    ? new Intl.DateTimeFormat("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(runtimeQuery.dataUpdatedAt))
    : "未取得";

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
            {runtimeServices.map((service) => (
              <RuntimeServiceRow
                key={service.name}
                service={service}
                busy={stopMutation.isPending && stopMutation.variables === service.name}
                onStop={() => setConfirmTarget(service.name)}
              />
            ))}
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
          {runtimeServices.map((service) => (
            <RuntimeLamp key={service.name} status={service.status} title={service.label} />
          ))}
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <StopConfirmDialog
        service={runtimeServices.find((item) => item.name === confirmTarget) ?? null}
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
        pending={stopMutation.isPending}
        onConfirm={async () => {
          if (!confirmTarget) return;
          try {
            await stopMutation.mutateAsync(confirmTarget);
            setConfirmTarget(null);
          } catch {
            // dialog remains open so the error can be read
          }
        }}
        error={
          stopMutation.error instanceof Error
            ? stopMutation.error.message
            : runtimeQuery.error instanceof Error
              ? runtimeQuery.error.message
              : null
        }
      />
    </div>
  );
}

function RuntimeServiceRow({
  service,
  busy,
  onStop,
}: {
  service: RuntimeService;
  busy: boolean;
  onStop: () => void;
}) {
  const disabled = service.status !== "running" || busy;

  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <RuntimeLamp status={service.status} />
            <span className="truncate text-sm font-medium">{service.label}</span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Port {service.port}
            {service.pid ? ` / PID ${service.pid}` : ""}
          </div>
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
  service,
  open,
  onOpenChange,
  onConfirm,
  pending,
  error,
}: {
  service: RuntimeService | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  pending: boolean;
  error: string | null;
}) {
  const serviceLabel = service?.label ?? "サービス";
  const note =
    service?.name === "nextjs"
      ? "Next.js を停止するとこのページは閉じます。"
      : "停止するとプロセスが終了します。";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>停止の確認</DialogTitle>
          <DialogDescription>
            {serviceLabel} を停止しますか。{note}
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
            disabled={pending || !service}
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

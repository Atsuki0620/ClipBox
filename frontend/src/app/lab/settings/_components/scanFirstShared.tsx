// UIラボ scan-first 設定画面の共有モジュール（単一カラム版 / カテゴリレール版で再利用）。
// 【役割】scan-first の「状態フック（useScanFirstState）」と「表示部品（スキャン/履歴/フォルダ・再生/カード表示/保守情報/
//   自動保存ステータス）」、共有テーマ、ヘルパをまとめる。両 Variant はこれを import して構成だけ変える。
// 【設計制約】API/DB/localStorage 非接続。状態はすべてローカル。テーマは div の CSS 変数のみ。決定論的（SSR安全：
//   現在時刻は runScan のクリック時のみ生成）。サムネ/<img> 不使用。
// 【サンプルカード】tier1-library の共有カード ConsoleCard と同デザインに合わせるため、LevelButtons / useMockCard /
//   formatFileSize（_data/labMock）/ storageLabel（lib/levels）を再利用し、表示トグルで内容を出し分ける。
// 【本体対応メモ】Tier1フォルダ→library_roots / Tier2フォルダ→selection_folder / デフォルトプレイヤー→default_player /
//   AVP実行ファイルパス→avp_exe_path。

"use client";

import {
  useEffect,
  useRef,
  useState,
  Fragment,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  RefreshCcw,
  DatabaseBackup,
  CircleAlert,
  CheckIcon,
  ChevronDownIcon,
  ArrowRight,
  Play,
  Heart,
  Bookmark,
  Check,
} from "lucide-react";
import { SettingsField } from "../../_components/SettingsField";
import { LevelButtons } from "../../_components/LevelButtons";
import { useMockCard } from "../../_components/useMockCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { storageLabel } from "@/lib/levels";
import { formatFileSize, type LabVideo } from "../../_data/labMock";
import {
  SETTINGS_DEFAULTS,
  SETTINGS_SCAN_STATUS,
  SETTINGS_BACKUP_HISTORY_DETAILED,
  SETTINGS_MAINTENANCE,
  SAMPLE_CARD,
  formatBytes,
} from "../../_data/settingsMock";

// クールニュートラル＋寒色アクセント（ライブラリ／設定 J と同一 THEME）。
export const SETTINGS_THEME: CSSProperties = {
  "--background": "oklch(0.985 0.003 250)",
  "--foreground": "oklch(0.21 0.015 258)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.21 0.015 258)",
  "--popover": "oklch(1 0 0)",
  "--popover-foreground": "oklch(0.21 0.015 258)",
  "--primary": "oklch(0.55 0.16 256)",
  "--primary-foreground": "oklch(0.99 0.005 250)",
  "--secondary": "oklch(0.96 0.005 250)",
  "--secondary-foreground": "oklch(0.30 0.015 258)",
  "--muted": "oklch(0.965 0.004 250)",
  "--muted-foreground": "oklch(0.47 0.015 258)",
  "--accent": "oklch(0.94 0.012 256)",
  "--accent-foreground": "oklch(0.28 0.015 258)",
  "--border": "oklch(0.91 0.005 250)",
  "--input": "oklch(0.91 0.005 250)",
  "--ring": "oklch(0.62 0.12 256)",
  "--radius": "0.5rem",
  "--sidebar": "oklch(0.98 0.003 250)",
  "--sidebar-foreground": "oklch(0.24 0.015 258)",
  "--sidebar-accent": "oklch(0.94 0.012 256)",
  "--sidebar-border": "oklch(0.91 0.005 250)",
} as CSSProperties;

// ───────────────────────── 型 ─────────────────────────

export type SaveState = "idle" | "saving" | "saved" | "error";
export type StepStatus = "idle" | "running" | "done" | "skipped";
export type FormState = {
  tier1Folders: string; // 本体: library_roots（複数行・1行1パス）
  tier2Folder: string; // 本体: selection_folder
  defaultPlayer: string; // 本体: default_player
  avpExePath: string; // 本体: avp_exe_path
};
export type FormErrors = Partial<Record<keyof FormState, string>>;
export type CardSettings = {
  storage: boolean;
  fileSize: boolean;
  createdDate: boolean;
  modifiedDate: boolean;
  viewCount: boolean;
  lastViewedDate: boolean;
  judgedDate: boolean;
};
export type LevelScope = "current" | "all";

// ───────────────────────── 状態フック ─────────────────────────

export function useScanFirstState() {
  // 自動保存（保存ボタンは置かない）。
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // フォルダ・再生設定の draft（合成初期値）。
  const [form, setForm] = useState<FormState>({
    tier1Folders: SETTINGS_DEFAULTS.library_roots.join("\n"),
    tier2Folder: SETTINGS_DEFAULTS.selection_folder,
    defaultPlayer: SETTINGS_DEFAULTS.default_player,
    avpExePath: SETTINGS_DEFAULTS.avp_exe_path,
  });
  const errors = validateForm(form);

  // スキャン進行（モック）。
  const [scanning, setScanning] = useState(false);
  const [steps, setSteps] = useState<{ key: string; label: string; status: StepStatus }[] | null>(null);
  const [lastScanAt, setLastScanAt] = useState(SETTINGS_SCAN_STATUS.last_scan_at);
  const [lastScanResult, setLastScanResult] = useState(SETTINGS_SCAN_STATUS.last_scan_result);
  const [lastBackupAt, setLastBackupAt] = useState(SETTINGS_SCAN_STATUS.last_backup_at);
  const scanTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // バックアップ履歴の展開。
  const [showAllBackups, setShowAllBackups] = useState(false);

  // 動画カード表示設定。
  const [cardSettings, setCardSettings] = useState<CardSettings>({
    storage: true,
    fileSize: true,
    createdDate: true,
    modifiedDate: false,
    viewCount: true,
    lastViewedDate: true,
    judgedDate: false,
  });
  const [levelScope, setLevelScope] = useState<LevelScope>("current");
  const [sampleTier, setSampleTier] = useState<1 | 2>(1);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      scanTimers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const scheduleSave = (hasError: boolean) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (hasError) {
      setSaveState("error");
      return;
    }
    setSaveState("saving");
    saveTimer.current = setTimeout(() => setSaveState("saved"), 700);
  };

  const updateForm = (patch: Partial<FormState>) => {
    const next = { ...form, ...patch };
    setForm(next);
    scheduleSave(Object.keys(validateForm(next)).length > 0);
  };

  const updateCard = (patch: Partial<CardSettings>) => {
    setCardSettings((prev) => ({ ...prev, ...patch }));
    scheduleSave(false);
  };

  const changeLevelScope = (v: LevelScope) => {
    setLevelScope(v);
    scheduleSave(false);
  };

  const runScan = () => {
    if (scanning) return;
    const hasTier2 = form.tier2Folder.trim().length > 0;
    const initial: { key: string; label: string; status: StepStatus }[] = [
      { key: "backup", label: "DBバックアップを自動作成", status: "idle" },
      { key: "tier1", label: "Tier1フォルダをスキャン", status: "idle" },
      {
        key: "tier2",
        label: hasTier2 ? "Tier2フォルダをスキャン" : "Tier2フォルダ（未設定・スキップ）",
        status: hasTier2 ? "idle" : "skipped",
      },
    ];
    scanTimers.current.forEach((t) => clearTimeout(t));
    scanTimers.current = [];
    setScanning(true);
    setSteps(initial);

    const seq = hasTier2 ? ["backup", "tier1", "tier2"] : ["backup", "tier1"];
    let delay = 450;
    seq.forEach((key) => {
      scanTimers.current.push(
        setTimeout(() => {
          setSteps((prev) => prev?.map((s) => (s.key === key ? { ...s, status: "running" } : s)) ?? null);
          if (key === "backup") setLastBackupAt(formatNow());
        }, delay),
      );
      delay += 750;
      scanTimers.current.push(
        setTimeout(() => {
          setSteps((prev) => prev?.map((s) => (s.key === key ? { ...s, status: "done" } : s)) ?? null);
        }, delay),
      );
      delay += 200;
    });
    scanTimers.current.push(
      setTimeout(() => {
        setScanning(false);
        setLastScanResult("成功");
        setLastScanAt(formatNow());
      }, delay),
    );
  };

  const hasTier2 = form.tier2Folder.trim().length > 0;
  const displaySteps =
    steps ??
    [
      { key: "backup", label: "DBバックアップを自動作成", status: "idle" as StepStatus },
      { key: "tier1", label: "Tier1フォルダをスキャン", status: "idle" as StepStatus },
      {
        key: "tier2",
        label: hasTier2 ? "Tier2フォルダをスキャン" : "Tier2フォルダ（未設定・スキップ）",
        status: (hasTier2 ? "idle" : "skipped") as StepStatus,
      },
    ];

  const visibleBackups = showAllBackups
    ? SETTINGS_BACKUP_HISTORY_DETAILED
    : SETTINGS_BACKUP_HISTORY_DETAILED.slice(0, 3);

  return {
    saveState,
    form,
    errors,
    updateForm,
    scanning,
    displaySteps,
    lastScanAt,
    lastScanResult,
    lastBackupAt,
    runScan,
    showAllBackups,
    toggleShowAllBackups: () => setShowAllBackups((v) => !v),
    visibleBackups,
    totalBackups: SETTINGS_BACKUP_HISTORY_DETAILED.length,
    cardSettings,
    updateCard,
    levelScope,
    changeLevelScope,
    sampleTier,
    setSampleTier,
  };
}

export type ScanFirstState = ReturnType<typeof useScanFirstState>;

// ───────────────────────── 自動保存ステータス ─────────────────────────

export function AutoSaveStatus({ state }: { state: SaveState }) {
  const map: Record<SaveState, { text: string; cls: string; icon: ReactNode }> = {
    idle: {
      text: "変更は自動保存されます",
      cls: "border-border bg-muted/40 text-muted-foreground",
      icon: <span className="size-1.5 rounded-full bg-muted-foreground/50" aria-hidden />,
    },
    saving: {
      text: "保存中…",
      cls: "border-primary/30 bg-primary/5 text-primary",
      icon: <RefreshCcw className="size-3.5 animate-spin" />,
    },
    saved: {
      text: "保存しました",
      cls: "border-emerald-300 bg-emerald-50 text-emerald-700",
      icon: <CheckIcon className="size-3.5" />,
    },
    error: {
      text: "未保存（入力エラー）",
      cls: "border-destructive/40 bg-destructive/5 text-destructive",
      icon: <CircleAlert className="size-3.5" />,
    },
  };
  const s = map[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        s.cls,
      )}
      role="status"
      aria-live="polite"
    >
      {s.icon}
      {s.text}
    </span>
  );
}

// ───────────────────────── スキャンカード ─────────────────────────

export function ScanCard({
  scanning,
  steps,
  lastScanAt,
  lastScanResult,
  lastBackupAt,
  onRun,
}: {
  scanning: boolean;
  steps: { key: string; label: string; status: StepStatus }[];
  lastScanAt: string;
  lastScanResult: string;
  lastBackupAt: string;
  onRun: () => void;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm ring-1 ring-primary/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <RefreshCcw className={cn("size-4", scanning && "animate-spin")} />
            </span>
            <h2 className="text-base font-semibold tracking-tight">スキャン</h2>
          </div>
          <div className="text-[12px] leading-relaxed text-muted-foreground">
            <p>Tier1フォルダとTier2フォルダをスキャンし、動画一覧を更新します。</p>
            <p>スキャン前にDBバックアップを自動作成します。</p>
          </div>
        </div>
        <Button className="h-10 px-5" onClick={onRun} disabled={scanning}>
          <RefreshCcw className={cn("size-4", scanning && "animate-spin")} />
          {scanning ? "スキャン中…" : "スキャン実行"}
        </Button>
      </div>

      {/* フロー可視化：バックアップ → Tier1 → Tier2（未設定はスキップ） */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-center gap-2">
            <StepNode label={step.label} status={step.status} />
            {i < steps.length - 1 && <ArrowRight className="size-4 shrink-0 text-muted-foreground/60" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatCell label="最終スキャン日時" value={lastScanAt} />
        <StatCell
          label="最終スキャン結果"
          value={
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                lastScanResult === "成功"
                  ? "bg-emerald-50 text-emerald-700"
                  : lastScanResult === "失敗"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {lastScanResult}
            </span>
          }
        />
        <StatCell label="最終バックアップ日時" value={lastBackupAt} />
      </div>
    </section>
  );
}

function StepNode({ label, status }: { label: string; status: StepStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
        status === "idle" && "border-border bg-card text-muted-foreground",
        status === "running" && "border-primary/40 bg-primary/5 text-primary",
        status === "done" && "border-emerald-300 bg-emerald-50 text-emerald-700",
        status === "skipped" && "border-dashed border-border bg-muted/40 text-muted-foreground",
      )}
    >
      {status === "running" && <RefreshCcw className="size-3 animate-spin" />}
      {status === "done" && <CheckIcon className="size-3" />}
      {label}
      {status === "skipped" && <span className="ml-0.5 rounded bg-muted px-1 text-[9px]">スキップ</span>}
    </span>
  );
}

function StatCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-muted/20 px-3 py-2">
      <span className="text-[10px] tracking-wide text-muted-foreground">{label}</span>
      <span className="text-[12px] font-medium tabular-nums">{value}</span>
    </div>
  );
}

// ───────────────────────── バックアップ履歴 ─────────────────────────

export function BackupHistory({
  rows,
  total,
  showAll,
  onToggle,
}: {
  rows: typeof SETTINGS_BACKUP_HISTORY_DETAILED;
  total: number;
  showAll: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <DatabaseBackup className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight">バックアップ履歴</h2>
        </div>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          バックアップはスキャン前に自動作成されます（手動作成ボタンはありません）。
        </p>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-left text-[12px]">
          <thead className="bg-muted/60 text-[11px] text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">作成日時</th>
              <th className="px-3 py-2 font-medium">ファイル名</th>
              <th className="px-3 py-2 font-medium">サイズ</th>
              <th className="px-3 py-2 font-medium">作成契機</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((b) => (
              <tr key={b.filename} className="transition-colors hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{b.created_at}</td>
                <td className="px-3 py-2 font-mono text-[12px]">{b.filename}</td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatBytes(b.size_bytes)}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {b.trigger}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 3 && (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-fit items-center gap-1 text-[12px] font-medium text-primary transition-colors hover:text-primary/80"
        >
          <ChevronDownIcon className={cn("size-4 transition-transform", showAll && "rotate-180")} />
          {showAll ? "閉じる" : `さらに表示（残り ${total - 3} 件）`}
        </button>
      )}
    </section>
  );
}

// ───────────────────────── 折りたたみセクション（単一カラム版で使用） ─────────────────────────

export function CollapsibleSection({
  icon: Icon,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold tracking-tight">{title}</span>
          {description && <span className="text-[12px] text-muted-foreground">{description}</span>}
        </span>
        <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="flex flex-col gap-4 border-t px-5 py-4">{children}</div>}
    </div>
  );
}

// ───────────────────────── フォルダ・再生設定 ─────────────────────────

export function FolderPlaybackSection({
  form,
  errors,
  onChange,
}: {
  form: FormState;
  errors: FormErrors;
  onChange: (patch: Partial<FormState>) => void;
}) {
  return (
    <>
      <SettingsField
        label="Tier1フォルダ"
        required
        htmlFor="sf-tier1"
        badge={<InfoTip text="Tier1として扱う動画フォルダです。" />}
        hint="1行に1パス。絶対パスで入力します（例: D:\Library\... / C:\... / \\NAS\...）。"
      >
        <Textarea
          id="sf-tier1"
          value={form.tier1Folders}
          onChange={(e) => onChange({ tier1Folders: e.target.value })}
          className="min-h-24 font-mono text-[12px]"
          spellCheck={false}
          aria-invalid={!!errors.tier1Folders}
        />
        {errors.tier1Folders && <FieldError text={errors.tier1Folders} />}
      </SettingsField>

      <SettingsField
        label="Tier2フォルダ"
        htmlFor="sf-tier2"
        badge={<InfoTip text="Tier2として扱う動画フォルダです。" />}
        hint="任意・絶対パス。未設定の場合、スキャンでは自動でスキップされます。"
      >
        <Input
          id="sf-tier2"
          value={form.tier2Folder}
          onChange={(e) => onChange({ tier2Folder: e.target.value })}
          className="font-mono"
          spellCheck={false}
          aria-invalid={!!errors.tier2Folder}
        />
        {errors.tier2Folder && <FieldError text={errors.tier2Folder} />}
      </SettingsField>

      <SettingsField
        label="デフォルトプレイヤー"
        required
        htmlFor="sf-player"
        badge={<InfoTip text="動画再生に使う実行ファイルのパスです。" />}
        hint="未入力だと再生できません。"
      >
        <Input
          id="sf-player"
          value={form.defaultPlayer}
          onChange={(e) => onChange({ defaultPlayer: e.target.value })}
          className="font-mono"
          spellCheck={false}
          aria-invalid={!!errors.defaultPlayer}
        />
        {errors.defaultPlayer && <FieldError text={errors.defaultPlayer} />}
      </SettingsField>

      <SettingsField
        label="AVP実行ファイルパス"
        htmlFor="sf-avp"
        badge={<InfoTip text="複数動画を並べて再生する AVP の実行ファイルです。" />}
        hint="任意・絶対パス。未設定なら AVP は使用しません。"
      >
        <Input
          id="sf-avp"
          value={form.avpExePath}
          onChange={(e) => onChange({ avpExePath: e.target.value })}
          className="font-mono"
          spellCheck={false}
          aria-invalid={!!errors.avpExePath}
        />
        {errors.avpExePath && <FieldError text={errors.avpExePath} />}
      </SettingsField>
    </>
  );
}

// ───────────────────────── 動画カード表示設定 ─────────────────────────

export function CardDisplaySection({
  settings,
  onChange,
  levelScope,
  onLevelScope,
  sampleTier,
  onSampleTier,
}: {
  settings: CardSettings;
  onChange: (patch: Partial<CardSettings>) => void;
  levelScope: LevelScope;
  onLevelScope: (v: LevelScope) => void;
  sampleTier: 1 | 2;
  onSampleTier: (v: 1 | 2) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* 左：設定 */}
      <div className="flex flex-col gap-4">
        <ToggleGroup title="ファイル情報">
          <ToggleRow label="ストレージ" checked={settings.storage} onChange={(v) => onChange({ storage: v })} />
          <ToggleRow label="ファイルサイズ" checked={settings.fileSize} onChange={(v) => onChange({ fileSize: v })} />
          <ToggleRow label="作成日" checked={settings.createdDate} onChange={(v) => onChange({ createdDate: v })} />
          <ToggleRow label="更新日" checked={settings.modifiedDate} onChange={(v) => onChange({ modifiedDate: v })} />
        </ToggleGroup>

        <ToggleGroup title="再生履歴">
          <ToggleRow label="視聴回数" checked={settings.viewCount} onChange={(v) => onChange({ viewCount: v })} />
          <ToggleRow label="最終再生日" checked={settings.lastViewedDate} onChange={(v) => onChange({ lastViewedDate: v })} />
        </ToggleGroup>

        <ToggleGroup title="判定情報">
          <ToggleRow label="判定日" checked={settings.judgedDate} onChange={(v) => onChange({ judgedDate: v })} />
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-medium">レベル表示対象</span>
              <InfoTip text="お気に入りレベルを、該当 Tier のカードだけに出すか、全 Tier に出すか。" />
            </div>
            <Segmented
              options={[
                { value: "current", label: "該当Tierのみ" },
                { value: "all", label: "全Tier" },
              ]}
              value={levelScope}
              onChange={(v) => onLevelScope(v as LevelScope)}
            />
          </div>
        </ToggleGroup>
      </div>

      {/* 右：サンプルカード（tier1-library の ConsoleCard デザイン） */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-medium text-muted-foreground">サンプルカード（設定反映後の見た目）</span>
          <Segmented
            options={[
              { value: "1", label: "Tier1" },
              { value: "2", label: "Tier2" },
            ]}
            value={String(sampleTier)}
            onChange={(v) => onSampleTier(Number(v) as 1 | 2)}
          />
        </div>
        <SampleConsoleCard settings={settings} levelScope={levelScope} sampleTier={sampleTier} />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          動画ファイル名は常時表示です。プレビュー対象 Tier を切り替えると「レベル表示対象」の効き方が確認できます。
        </p>
      </div>
    </div>
  );
}

// tier1-library の ConsoleCard と同デザインのサンプルカード（表示トグルで内容を出し分ける）。
// 実 ConsoleCard は固定メタのため、ここではマークアップを踏襲しつつメタ行をトグル連動にする。
const sampleVideo: LabVideo = {
  id: 0,
  essential_filename: SAMPLE_CARD.title,
  current_full_path: SAMPLE_CARD.title,
  current_favorite_level: SAMPLE_CARD.level,
  storage_location: SAMPLE_CARD.storage,
  file_size: SAMPLE_CARD.file_size_bytes,
  last_viewed: SAMPLE_CARD.last_viewed_at,
  last_file_modified: SAMPLE_CARD.modified_at,
  view_count: SAMPLE_CARD.view_count,
  like_count: SAMPLE_CARD.like_count,
  watch_later: SAMPLE_CARD.watch_later,
  is_available: SAMPLE_CARD.is_available,
};

// ConsoleCard の「あとで / AVP」共通スタイル（等幅）。
const toggleBtn =
  "inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden rounded-md border px-1 text-[11px] whitespace-nowrap transition-colors disabled:opacity-40";

export function SampleConsoleCard({
  settings,
  levelScope,
  sampleTier,
}: {
  settings: CardSettings;
  levelScope: LevelScope;
  sampleTier: 1 | 2;
}) {
  const card = useMockCard(sampleVideo);
  // 「該当Tierのみ」= サンプルが Tier1 のときだけレベルを出す。「全Tier」= 常に出す。
  const showLevel = levelScope === "all" || sampleTier === 1;

  const metaItems: ReactNode[] = [];
  if (settings.storage) metaItems.push(<span key="st">{storageLabel(SAMPLE_CARD.storage)}</span>);
  if (settings.viewCount) metaItems.push(<span key="vc">視聴 {SAMPLE_CARD.view_count}</span>);
  if (settings.fileSize) metaItems.push(<span key="fs">{formatFileSize(SAMPLE_CARD.file_size_bytes)}</span>);
  if (settings.createdDate) metaItems.push(<DateMeta key="cr" label="作成" date={SAMPLE_CARD.created_at} />);
  if (settings.modifiedDate) metaItems.push(<DateMeta key="mo" label="更新" date={SAMPLE_CARD.modified_at} />);
  if (settings.lastViewedDate) metaItems.push(<DateMeta key="lv" label="再生" date={SAMPLE_CARD.last_viewed_at} />);
  if (settings.judgedDate) metaItems.push(<DateMeta key="jd" label="判定" date={SAMPLE_CARD.judged_at} />);

  return (
    <div className="relative flex max-w-xs flex-col gap-1.5 rounded-lg border bg-card p-2 transition-all hover:-translate-y-0.5 hover:shadow-sm">
      {/* タイトル（2行まで・短い・常時表示） */}
      <div className="line-clamp-2 break-all text-xs font-semibold leading-snug" title={SAMPLE_CARD.title}>
        {SAMPLE_CARD.title}
      </div>

      {/* メタ（1行に詰める・トグル連動） */}
      <div className="flex min-h-4 flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground tabular-nums">
        {metaItems.length === 0 ? (
          <span className="opacity-50">表示項目なし</span>
        ) : (
          metaItems.map((node, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="opacity-40">·</span>}
              {node}
            </Fragment>
          ))
        )}
      </div>

      {/* レベル（数値ボタン。レベル表示対象で出し分け） */}
      {showLevel && <LevelButtons value={card.level} onChange={card.setLevel} className="w-full" />}

      {/* 操作（1行：再生 / ♡ / あとで / AVP。あとでとAVPは等幅） */}
      <div className="flex items-stretch gap-1">
        <Button size="sm" className="h-7 flex-[1.6] px-1">
          <Play className="size-3.5" />
          再生
        </Button>
        <button type="button" onClick={card.like} className={toggleBtn} title="いいね">
          <Heart className="size-3.5" />
          <span className="tabular-nums">{card.likeCount}</span>
        </button>
        <button
          type="button"
          onClick={card.toggleWatchLater}
          title="あとで見る"
          className={cn(
            toggleBtn,
            card.watchLater
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Bookmark className="size-3.5" />
          あとで
        </button>
        <button
          type="button"
          onClick={card.toggleAvp}
          title="AVPで再生する候補に追加"
          className={cn(
            toggleBtn,
            card.avp
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {card.avp ? <Check className="size-3.5" /> : <span className="size-3.5 rounded-[3px] border" />}
          AVP
        </button>
      </div>
    </div>
  );
}

function DateMeta({ label, date }: { label: string; date: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="cursor-help" />}>
        {label} {date}
      </TooltipTrigger>
      <TooltipContent>
        {label}日: {date}（yyyy/mm/dd）
      </TooltipContent>
    </Tooltip>
  );
}

// ───────────────────────── 保守情報 ─────────────────────────

export function MaintenanceSection() {
  return (
    <div className="flex flex-col divide-y rounded-md border">
      <InfoRow label="DBパス" value={SETTINGS_MAINTENANCE.db_path} mono />
      <InfoRow label="設定ファイル" value={SETTINGS_MAINTENANCE.config_path} mono />
      <InfoRow label="システム情報" value={SETTINGS_MAINTENANCE.system_info} />
      <InfoRow label="アプリバージョン" value={SETTINGS_MAINTENANCE.app_version} />
      <InfoRow
        label="API接続状態"
        value={
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            {SETTINGS_MAINTENANCE.api_status}
          </span>
        }
      />
    </div>
  );
}

// ───────────────────────── 小物 ─────────────────────────

export function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex size-3.5 cursor-help items-center justify-center rounded-full border border-border text-[9px] leading-none text-muted-foreground" />
        }
      >
        ?
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

function FieldError({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-1 text-[11px] text-destructive">
      <CircleAlert className="size-3.5 shrink-0" />
      {text}
    </p>
  );
}

function ToggleGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{title}</span>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-[13px]">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} size="sm" />
    </label>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex w-fit items-center gap-0.5 rounded-md border bg-muted/50 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded px-3 py-1 text-[12px] transition-colors",
            opt.value === value
              ? "bg-card font-medium text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 break-all text-right text-[12px]", mono && "font-mono text-[11px]")}>{value}</span>
    </div>
  );
}

// ───────────────────────── ヘルパ ─────────────────────────

function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isAbsolutePath(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(value) || /^\\\\/.test(value) || value.startsWith("/");
}

export function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  const tier1 = parseLines(form.tier1Folders);
  if (tier1.length === 0) {
    errors.tier1Folders = "Tier1フォルダを1件以上入力してください。";
  } else {
    const bad = tier1.find((p) => !isAbsolutePath(p));
    if (bad) errors.tier1Folders = `絶対パスで入力してください: ${bad}`;
  }
  if (form.tier2Folder.trim() && !isAbsolutePath(form.tier2Folder)) {
    errors.tier2Folder = "Tier2フォルダは絶対パスで入力してください。";
  }
  if (!form.defaultPlayer.trim()) {
    errors.defaultPlayer = "デフォルトプレイヤーを入力してください。";
  }
  if (form.avpExePath.trim() && !isAbsolutePath(form.avpExePath)) {
    errors.avpExePath = "AVP実行ファイルパスは絶対パスで入力してください。";
  }
  return errors;
}

// 「最終スキャン/バックアップ日時」更新用の現在時刻（クリック時のみ呼ぶ＝SSR非依存）。
function formatNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

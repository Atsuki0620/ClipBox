// UIラボ Variant J「設定コンソール」 → /lab/settings/variant-j
// 【役割】ClipBox の設定画面を Variant J テイスト（寒色・モダンコンソール・helper text 重視）で再設計したモック案。
//   現行設定の機能（ライブラリ/動画カード表示/再生/DB/保存/スキャン/バックアップ）を一切落とさず、
//   左カテゴリレール＋右フォームに再編。Runtime/履歴/危険操作は「UI検討（現行機能なし or 別所在）」を明記して提示。
// 【設計制約】API/DB/localStorage に接続しない。テーマはルート div の CSS 変数上書きのみ（globals.css 非変更）。
//   サムネ/画像枠なし。状態はすべてコンポーネント内ローカル（draft/選択カテゴリ/ダイアログ/モック結果）。
//   保存・スキャン・バックアップ・停止・リセットは「ローカルの結果メッセージを出すだけ」で実処理はしない。
// 【依存関係】Modern 共通（ModernSidebar/ConsoleKpi）, 設定共通（SettingsSection/SettingsField/LabBadge/DangerRow）,
//   shadcn（Button/Input/Textarea/Switch/Dialog）, _data/settingsMock。

"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  Settings,
  FolderOpen,
  RefreshCcw,
  LayoutGrid,
  MonitorPlay,
  DatabaseBackup,
  Server,
  TriangleAlert,
  Save,
  RotateCcw,
  FolderSearch,
  Square,
  Trash2,
  HardDrive,
  CircleAlert,
} from "lucide-react";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { ConsoleKpi } from "../../_components/ConsoleKpi";
import { SettingsSection } from "../../_components/SettingsSection";
import { SettingsField, LabBadge } from "../../_components/SettingsField";
import { DangerRow } from "../../_components/DangerRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  SETTINGS_DEFAULTS,
  SETTINGS_SUMMARY,
  SETTINGS_STORAGE_PATHS,
  SETTINGS_BACKUP_HISTORY,
  SETTINGS_SCAN_HISTORY,
  SETTINGS_RUNTIME,
  formatBytes,
  storageLabel,
  type RuntimeStatus,
} from "../../_data/settingsMock";

// クールニュートラル＋寒色アクセント（ライブラリ J と同一 THEME）。
const THEME: CSSProperties = {
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

const AREA_VARIANTS = [{ key: "j", href: "/lab/settings/variant-j", label: "J 設定コンソール" }];

type CategoryKey =
  | "basic"
  | "library"
  | "scan"
  | "display"
  | "avp"
  | "backup"
  | "runtime"
  | "danger";

type Category = {
  key: CategoryKey;
  label: string;
  icon: typeof Settings;
  note: "current" | "lab"; // current=現行機能, lab=UI検討を含む
};

const CATEGORIES: Category[] = [
  { key: "basic", label: "基本設定", icon: Settings, note: "current" },
  { key: "library", label: "ライブラリ・パス", icon: FolderOpen, note: "current" },
  { key: "scan", label: "スキャン", icon: RefreshCcw, note: "current" },
  { key: "display", label: "表示・カード", icon: LayoutGrid, note: "current" },
  { key: "avp", label: "AVP・再生", icon: MonitorPlay, note: "current" },
  { key: "backup", label: "バックアップ", icon: DatabaseBackup, note: "current" },
  { key: "runtime", label: "Runtime・サーバー", icon: Server, note: "lab" },
  { key: "danger", label: "危険操作", icon: TriangleAlert, note: "lab" },
];

type Result = { tone: "success" | "error" | "info"; text: string } | null;

export default function SettingsVariantJPage() {
  const [category, setCategory] = useState<CategoryKey>("basic");

  // 現行設定の draft（合成初期値）。
  const [libraryRoots, setLibraryRoots] = useState(SETTINGS_DEFAULTS.library_roots.join("\n"));
  const [selectionFolder, setSelectionFolder] = useState(SETTINGS_DEFAULTS.selection_folder);
  const [defaultPlayer, setDefaultPlayer] = useState(SETTINGS_DEFAULTS.default_player);
  const [avpExePath, setAvpExePath] = useState(SETTINGS_DEFAULTS.avp_exe_path);
  const [cardShowStorage, setCardShowStorage] = useState(SETTINGS_DEFAULTS.card_show_storage);
  const [cardShowFileSize, setCardShowFileSize] = useState(SETTINGS_DEFAULTS.card_show_file_size);
  const [cardShowLastViewed, setCardShowLastViewed] = useState(SETTINGS_DEFAULTS.card_show_last_viewed);
  const [cardShowFileModified, setCardShowFileModified] = useState(SETTINGS_DEFAULTS.card_show_file_modified);

  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<Result>(null);
  // 実バックアップ（このセッションで作成）だけをライブラリスキャン実行許可の条件にする（現行ガードの再現）。
  const [hasBackup, setHasBackup] = useState(false);

  // 確認ダイアログ。
  const [dialog, setDialog] = useState<null | "save" | "libraryScan" | "selectionScan" | "reset" | "cache" | "stop">(null);
  const [stopTarget, setStopTarget] = useState<string | null>(null);

  // 変更を加えたら dirty に（モック：実際の保存はしない）。
  const touch = () => setDirty(true);

  const handleSave = () => {
    setDialog(null);
    setDirty(false);
    setResult({ tone: "success", text: "設定を保存しました（モック：実際の user_config.json は更新されません）。" });
  };
  const handleReload = () => {
    setLibraryRoots(SETTINGS_DEFAULTS.library_roots.join("\n"));
    setSelectionFolder(SETTINGS_DEFAULTS.selection_folder);
    setDefaultPlayer(SETTINGS_DEFAULTS.default_player);
    setAvpExePath(SETTINGS_DEFAULTS.avp_exe_path);
    setCardShowStorage(SETTINGS_DEFAULTS.card_show_storage);
    setCardShowFileSize(SETTINGS_DEFAULTS.card_show_file_size);
    setCardShowLastViewed(SETTINGS_DEFAULTS.card_show_last_viewed);
    setCardShowFileModified(SETTINGS_DEFAULTS.card_show_file_modified);
    setDirty(false);
    setResult({ tone: "info", text: "入力内容を初期値に戻しました（モック）。" });
  };
  const handleBackup = () => {
    setHasBackup(true);
    setResult({ tone: "success", text: "バックアップを作成しました: videos_20260614.db（0.4 GB）（モック）。" });
  };
  const handleLibraryScan = () => {
    setDialog(null);
    setResult({ tone: "success", text: "ライブラリスキャンを実行しました（モック）。" });
  };
  const handleSelectionScan = () => {
    setDialog(null);
    setResult({ tone: "success", text: "セレクションスキャンを実行しました（検出 64 件）（モック）。" });
  };
  const handleReset = () => {
    setDialog(null);
    setResult({ tone: "info", text: "設定をリセットしました（モック：実際には何も変更されません）。" });
  };
  const handleCache = () => {
    setDialog(null);
    setResult({ tone: "info", text: "キャッシュを削除しました（モック：実際には何も削除されません）。" });
  };
  const handleStop = () => {
    setDialog(null);
    setResult({ tone: "info", text: `${stopTarget ?? "サーバー"} を停止しました（モック）。` });
    setStopTarget(null);
  };

  return (
    <LabFrame active="j" title="設定コンソール" variants={AREA_VARIANTS} indexHref="/lab/settings">
      <div style={THEME} className="flex min-h-[40rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="設定" />
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-5">
          {/* トップヘッダ */}
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight">設定</h1>
                {dirty && <LabBadge tone="info">変更あり</LabBadge>}
              </div>
              <p className="text-xs text-muted-foreground">
                ClipBox の動作・表示・スキャン・バックアップを管理する画面
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReload}>
                <RotateCcw className="size-4" />
                再読込
              </Button>
              <Button variant="outline" size="sm" onClick={handleBackup}>
                <DatabaseBackup className="size-4" />
                バックアップ作成
              </Button>
              <Button size="sm" onClick={() => setDialog("save")} disabled={!dirty}>
                <Save className="size-4" />
                保存
              </Button>
            </div>
          </header>

          {/* 状態サマリー */}
          <ConsoleKpi
            cells={[
              { label: "ライブラリ動画数", value: SETTINGS_SUMMARY.library_video_count.toLocaleString(), accent: true },
              { label: "最終スキャン", value: SETTINGS_SUMMARY.last_scan_at },
              { label: "最終バックアップ", value: SETTINGS_SUMMARY.last_backup_at },
              { label: "設定更新日時", value: SETTINGS_SUMMARY.config_updated_at },
            ]}
            className="sm:grid-cols-4"
          />

          {result && <ResultBox result={result} onClose={() => setResult(null)} />}

          {/* 本体：左カテゴリレール ＋ 右フォーム */}
          <div className="flex flex-col gap-4 lg:flex-row">
            <CategoryRail active={category} onSelect={setCategory} />

            <div className="flex min-w-0 flex-1 flex-col gap-4">
              {category === "basic" && (
                <BasicCategory
                  defaultPlayer={defaultPlayer}
                  onDefaultPlayer={(v) => {
                    setDefaultPlayer(v);
                    touch();
                  }}
                />
              )}
              {category === "library" && (
                <LibraryCategory
                  libraryRoots={libraryRoots}
                  onLibraryRoots={(v) => {
                    setLibraryRoots(v);
                    touch();
                  }}
                  selectionFolder={selectionFolder}
                  onSelectionFolder={(v) => {
                    setSelectionFolder(v);
                    touch();
                  }}
                />
              )}
              {category === "scan" && (
                <ScanCategory
                  hasBackup={hasBackup}
                  onBackup={handleBackup}
                  onLibraryScan={() => setDialog("libraryScan")}
                  onSelectionScan={() => setDialog("selectionScan")}
                  selectionFolder={selectionFolder}
                />
              )}
              {category === "display" && (
                <DisplayCategory
                  cardShowStorage={cardShowStorage}
                  cardShowFileSize={cardShowFileSize}
                  cardShowLastViewed={cardShowLastViewed}
                  cardShowFileModified={cardShowFileModified}
                  onToggle={(key, value) => {
                    if (key === "storage") setCardShowStorage(value);
                    if (key === "fileSize") setCardShowFileSize(value);
                    if (key === "lastViewed") setCardShowLastViewed(value);
                    if (key === "fileModified") setCardShowFileModified(value);
                    touch();
                  }}
                />
              )}
              {category === "avp" && (
                <AvpCategory
                  avpExePath={avpExePath}
                  onAvpExePath={(v) => {
                    setAvpExePath(v);
                    touch();
                  }}
                  defaultPlayer={defaultPlayer}
                  onGotoBasic={() => setCategory("basic")}
                />
              )}
              {category === "backup" && <BackupCategory onBackup={handleBackup} />}
              {category === "runtime" && (
                <RuntimeCategory
                  onStop={(label) => {
                    setStopTarget(label);
                    setDialog("stop");
                  }}
                />
              )}
              {category === "danger" && (
                <DangerCategory onReset={() => setDialog("reset")} onCache={() => setDialog("cache")} />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* 確認ダイアログ群（現行同様の体裁・実処理はモック） */}
      <ConfirmDialog
        open={dialog === "save"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="設定を保存"
        description="現在の入力内容で user_config.json を更新します。"
        confirmLabel="保存"
        onConfirm={handleSave}
      />
      <ConfirmDialog
        open={dialog === "selectionScan"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="セレクションスキャン"
        description="指定中のセレクションフォルダをスキャンします。"
        confirmLabel="スキャン"
        onConfirm={handleSelectionScan}
      >
        <div className="rounded-md bg-muted/50 px-3 py-2 font-mono text-xs">
          {selectionFolder.trim() || "未設定"}
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "libraryScan"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="ライブラリスキャン"
        description="ライブラリ全体をスキャンし、DB の動画状態を更新します。"
        confirmLabel="スキャン実行"
        destructive
        confirmDisabled={!hasBackup}
        onConfirm={handleLibraryScan}
      >
        <div className="grid gap-2 text-sm">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
            見つからない動画は利用不可になります。Streamlit を停止し、必ず DB
            バックアップを作成してから実行してください。
          </div>
          {hasBackup ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-950">
              バックアップ済み: videos_20260614.db（0.4 GB）
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-md border border-destructive px-3 py-2 text-destructive">
              <span>このセッションでバックアップが未作成です。</span>
              <Button type="button" size="sm" variant="outline" onClick={handleBackup}>
                <DatabaseBackup className="size-4" />
                今すぐバックアップ
              </Button>
            </div>
          )}
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "reset"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="設定をリセット"
        description="すべての設定を初期状態に戻します。元に戻せません。"
        confirmLabel="リセット"
        destructive
        onConfirm={handleReset}
      />
      <ConfirmDialog
        open={dialog === "cache"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="キャッシュを削除"
        description="アプリのキャッシュを削除します。次回表示時に再生成されます。"
        confirmLabel="削除"
        destructive
        onConfirm={handleCache}
      />
      <ConfirmDialog
        open={dialog === "stop"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="サーバーを停止"
        description={`${stopTarget ?? "サーバー"} を停止します。停止中は該当機能が使用できなくなります。`}
        confirmLabel="停止"
        destructive
        onConfirm={handleStop}
      />
    </LabFrame>
  );
}

// ───────────────────────── カテゴリレール ─────────────────────────

function CategoryRail({
  active,
  onSelect,
}: {
  active: CategoryKey;
  onSelect: (key: CategoryKey) => void;
}) {
  return (
    <nav className="flex shrink-0 flex-col gap-0.5 lg:w-52">
      {CATEGORIES.map(({ key, label, icon: Icon, note }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={cn(
              "flex items-center gap-2.5 rounded-md border px-3 py-2 text-left text-[13px] transition-colors",
              isActive
                ? "border-primary/30 bg-primary/10 font-medium text-primary"
                : "border-transparent text-foreground hover:bg-muted",
            )}
          >
            <Icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
            <span className="flex-1 truncate">{label}</span>
            {note === "lab" && (
              <span
                className="size-1.5 shrink-0 rounded-full bg-primary/50"
                title="UI 検討（現行機能なし／別所在）"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ───────────────────────── 各カテゴリ ─────────────────────────

function BasicCategory({
  defaultPlayer,
  onDefaultPlayer,
}: {
  defaultPlayer: string;
  onDefaultPlayer: (v: string) => void;
}) {
  return (
    <SettingsSection
      title="基本設定"
      description="再生に使うプレイヤーと、データベースの保存先を確認します。"
    >
      <SettingsField
        label="デフォルトプレイヤー"
        required
        htmlFor="default-player"
        hint="動画再生に使う実行ファイルのパス。未入力だと再生できません。"
      >
        <Input
          id="default-player"
          value={defaultPlayer}
          onChange={(e) => onDefaultPlayer(e.target.value)}
          spellCheck={false}
          className="font-mono"
        />
      </SettingsField>
      <SettingsField
        label="データベースパス"
        badge={<LabBadge tone="current">読み取り専用</LabBadge>}
        hint="バックエンドが管理します。設定画面からは変更できません。"
      >
        <div className="rounded-md bg-muted/50 px-3 py-2 font-mono text-[12px] text-muted-foreground">
          {SETTINGS_DEFAULTS.db_path || "既定値"}
        </div>
      </SettingsField>
    </SettingsSection>
  );
}

function LibraryCategory({
  libraryRoots,
  onLibraryRoots,
  selectionFolder,
  onSelectionFolder,
}: {
  libraryRoots: string;
  onLibraryRoots: (v: string) => void;
  selectionFolder: string;
  onSelectionFolder: (v: string) => void;
}) {
  return (
    <>
      <SettingsSection
        title="ライブラリ・パス"
        description="スキャン対象のライブラリルートと、セレクションフォルダを管理します。"
      >
        <SettingsField
          label="ライブラリルート"
          required
          htmlFor="library-roots"
          hint="1 行に 1 パス。絶対パスで入力します（例: D:\Library\... / C:\... / \\NAS\...）。1 件以上必須。"
        >
          <Textarea
            id="library-roots"
            value={libraryRoots}
            onChange={(e) => onLibraryRoots(e.target.value)}
            className="min-h-28 font-mono text-[12px]"
            spellCheck={false}
          />
        </SettingsField>
        <SettingsField
          label="セレクションフォルダ"
          htmlFor="selection-folder"
          hint="Tier 2（セレクション）操作の対象フォルダ。任意・絶対パス。"
        >
          <Input
            id="selection-folder"
            value={selectionFolder}
            onChange={(e) => onSelectionFolder(e.target.value)}
            spellCheck={false}
            className="font-mono"
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection
        title="保存先一覧"
        description="ライブラリルートの所在（C ドライブ／外付け HDD）と動画数の目安。"
        badge={<LabBadge tone="info">UI 検討</LabBadge>}
      >
        <div className="flex flex-col gap-2">
          {SETTINGS_STORAGE_PATHS.map((row) => (
            <div
              key={row.path}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <HardDrive className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-mono text-[12px]" title={row.path}>
                  {row.path}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full border px-2 py-0.5">{storageLabel(row.storage)}</span>
                <span className="tabular-nums">{row.videoCount.toLocaleString()} 本</span>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">
            除外条件（特定フォルダ/拡張子のスキップ）は現行にない機能のため、ここでは{" "}
            <span className="text-primary">UI 検討</span>{" "}の位置づけです。
          </p>
        </div>
      </SettingsSection>
    </>
  );
}

function ScanCategory({
  hasBackup,
  onBackup,
  onLibraryScan,
  onSelectionScan,
  selectionFolder,
}: {
  hasBackup: boolean;
  onBackup: () => void;
  onLibraryScan: () => void;
  onSelectionScan: () => void;
  selectionFolder: string;
}) {
  return (
    <>
      <SettingsSection
        title="スキャン"
        description="ライブラリ／セレクションのスキャンを実行します。危険な操作は分けて表示します。"
      >
        {/* 通常操作：セレクションスキャン */}
        <SettingsField
          label="セレクションスキャン"
          hint="指定中のセレクションフォルダだけをスキャンします（DB の全動画状態には影響しません）。"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1 rounded-md bg-muted/50 px-3 py-2 font-mono text-[12px] text-muted-foreground">
              {selectionFolder.trim() || "未設定"}
            </div>
            <Button variant="outline" size="sm" onClick={onSelectionScan}>
              <FolderSearch className="size-4" />
              スキャン
            </Button>
          </div>
        </SettingsField>

        {/* 危険操作：ライブラリスキャン（バックアップ必須ガードを見える化） */}
        <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50/60 p-3">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-amber-950">
            <CircleAlert className="size-4" />
            ライブラリスキャン（要注意）
          </div>
          <p className="text-[11px] leading-relaxed text-amber-950/90">
            ライブラリ全体をスキャンし、見つからない動画は利用不可になります。Streamlit
            を停止し、必ず DB バックアップを作成してから実行してください。
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {hasBackup ? (
              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800">
                このセッションでバックアップ済み
              </span>
            ) : (
              <button
                type="button"
                onClick={onBackup}
                className="rounded-full border border-destructive/40 bg-destructive/5 px-2 py-0.5 text-[11px] text-destructive"
              >
                バックアップ未作成 — 先に作成
              </button>
            )}
            <Button variant="destructive" size="sm" onClick={onLibraryScan}>
              <RefreshCcw className="size-4" />
              ライブラリスキャン
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="スキャン履歴・状態"
        description="直近のスキャン実行と結果の一覧。"
        badge={<LabBadge tone="info">UI 検討</LabBadge>}
      >
        <MiniTable
          head={["種別", "結果", "検出", "実行日時"]}
          rows={SETTINGS_SCAN_HISTORY.map((s) => [
            s.kind,
            <span
              key="r"
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px]",
                s.result === "成功"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {s.result}
            </span>,
            s.found_count.toLocaleString(),
            <span key="d" className="font-mono text-[11px] text-muted-foreground">
              {s.ran_at}
            </span>,
          ])}
        />
      </SettingsSection>
    </>
  );
}

function DisplayCategory({
  cardShowStorage,
  cardShowFileSize,
  cardShowLastViewed,
  cardShowFileModified,
  onToggle,
}: {
  cardShowStorage: boolean;
  cardShowFileSize: boolean;
  cardShowLastViewed: boolean;
  cardShowFileModified: boolean;
  onToggle: (key: "storage" | "fileSize" | "lastViewed" | "fileModified", value: boolean) => void;
}) {
  const items: { key: "storage" | "fileSize" | "lastViewed" | "fileModified"; label: string; value: boolean }[] = [
    { key: "storage", label: "ストレージを表示", value: cardShowStorage },
    { key: "fileSize", label: "ファイルサイズを表示", value: cardShowFileSize },
    { key: "lastViewed", label: "最終再生日を表示", value: cardShowLastViewed },
    { key: "fileModified", label: "ファイル更新日を表示", value: cardShowFileModified },
  ];
  return (
    <>
      <SettingsSection
        title="動画カード表示"
        description="動画カードに表示する項目を切り替えます。変更は全画面のカードに反映されます。"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map(({ key, label, value }) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-md border bg-card px-3 py-2.5 text-[13px]"
            >
              <span>{label}</span>
              <Switch checked={value} onCheckedChange={(v) => onToggle(key, v)} size="sm" />
            </label>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="表示密度・既定表示モード"
        description="一覧の密度や、開いたときの既定表示（カード／テーブル）の検討枠。"
        badge={<LabBadge tone="info">UI 検討</LabBadge>}
      >
        <SettingsField
          label="表示密度"
          hint="現行にはない項目です。実装前提ではなく、UI の検討用に置いています。"
        >
          <Segmented options={["コンパクト", "標準", "ゆったり"]} value="標準" />
        </SettingsField>
        <SettingsField
          label="既定表示モード"
          hint="ライブラリを開いたときの初期表示。現行にはない UI 検討項目です。"
        >
          <Segmented options={["カード", "テーブル"]} value="カード" />
        </SettingsField>
      </SettingsSection>
    </>
  );
}

function AvpCategory({
  avpExePath,
  onAvpExePath,
  defaultPlayer,
  onGotoBasic,
}: {
  avpExePath: string;
  onAvpExePath: (v: string) => void;
  defaultPlayer: string;
  onGotoBasic: () => void;
}) {
  return (
    <SettingsSection
      title="AVP・再生"
      description="複数動画を並べて再生する AVP の設定。通常の再生プレイヤーは「基本設定」で管理します。"
    >
      <SettingsField
        label="AVP 実行ファイルパス"
        htmlFor="avp-exe"
        hint="AVP（最大 4 本の並列再生ツール）の実行ファイル。任意・絶対パス。未設定なら AVP は使用しません。"
      >
        <Input
          id="avp-exe"
          value={avpExePath}
          onChange={(e) => onAvpExePath(e.target.value)}
          spellCheck={false}
          className="font-mono"
        />
      </SettingsField>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2.5">
        <div className="flex min-w-0 flex-col">
          <span className="text-[12px] font-medium">デフォルトプレイヤー</span>
          <span className="truncate font-mono text-[11px] text-muted-foreground">{defaultPlayer || "未設定"}</span>
        </div>
        <Button variant="outline" size="sm" onClick={onGotoBasic}>
          基本設定で編集
        </Button>
      </div>
    </SettingsSection>
  );
}

function BackupCategory({ onBackup }: { onBackup: () => void }) {
  return (
    <>
      <SettingsSection
        title="バックアップ"
        description="DB のバックアップを作成します。スキャンなどの危険操作の前に実行してください。"
        actions={
          <Button size="sm" onClick={onBackup}>
            <DatabaseBackup className="size-4" />
            バックアップ作成
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingsField label="バックアップ先">
            <div className="rounded-md bg-muted/50 px-3 py-2 font-mono text-[12px] text-muted-foreground">
              {"D:\\ClipBox\\backup"}
            </div>
          </SettingsField>
          <SettingsField label="最終バックアップ">
            <div className="rounded-md bg-muted/50 px-3 py-2 text-[12px] text-muted-foreground">
              {SETTINGS_SUMMARY.last_backup_at}
            </div>
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection
        title="バックアップ履歴"
        description="作成済みバックアップの一覧。"
        badge={<LabBadge tone="info">UI 検討</LabBadge>}
      >
        <MiniTable
          head={["ファイル名", "サイズ", "作成日時"]}
          rows={SETTINGS_BACKUP_HISTORY.map((b) => [
            <span key="f" className="font-mono text-[12px]">
              {b.filename}
            </span>,
            <span key="s" className="tabular-nums text-muted-foreground">
              {formatBytes(b.size_bytes)}
            </span>,
            <span key="c" className="font-mono text-[11px] text-muted-foreground">
              {b.created_at}
            </span>,
          ])}
        />
      </SettingsSection>
    </>
  );
}

function RuntimeCategory({ onStop }: { onStop: (label: string) => void }) {
  return (
    <SettingsSection
      title="Runtime・サーバー"
      description="3 層（Next.js / FastAPI / Streamlit）の稼働状態と停止操作。現行はサイドバーの Runtime control にあります。"
      badge={<LabBadge tone="info">UI 検討（現行は SidebarNav に実在）</LabBadge>}
    >
      <div className="flex flex-col gap-2">
        {SETTINGS_RUNTIME.map((r) => (
          <div
            key={r.name}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <StatusLamp status={r.status} />
              <div className="flex flex-col">
                <span className="text-[13px] font-medium">{r.label}</span>
                <span className="font-mono text-[11px] text-muted-foreground">:{r.port}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px]",
                  r.status === "running"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {r.status === "running" ? "稼働中" : "停止中"}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={r.status !== "running"}
                onClick={() => onStop(r.label)}
              >
                <Square className="size-3.5" />
                停止
              </Button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        停止は影響の大きい操作のため、確認ダイアログを挟みます。Next.js / FastAPI
        を止めると本体 UI と API が使用できなくなります。
      </p>
    </SettingsSection>
  );
}

function DangerCategory({ onReset, onCache }: { onReset: () => void; onCache: () => void }) {
  return (
    <SettingsSection
      title="危険操作"
      description="設定のリセットやキャッシュ削除など、取り消せない操作をまとめています。"
      badge={<LabBadge tone="danger">UI 検討（現行機能なし）</LabBadge>}
    >
      <DangerRow
        title="設定をリセット"
        description="すべての設定を初期状態に戻します。元に戻せません。"
        actionLabel="リセット"
        icon={<RotateCcw className="size-3.5" />}
        onAction={onReset}
      />
      <DangerRow
        title="キャッシュを削除"
        description="アプリのキャッシュを削除します。次回表示時に再生成されます。"
        actionLabel="削除"
        icon={<Trash2 className="size-3.5" />}
        onAction={onCache}
      />
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        ここに並ぶ操作は現行の設定画面にはありません。危険操作と日常操作を分ける案として、UI
        の検討用に置いています（このモックでは実際には何も変更しません）。
      </p>
    </SettingsSection>
  );
}

// ───────────────────────── 小物 ─────────────────────────

function StatusLamp({ status }: { status: RuntimeStatus }) {
  return (
    <span
      className={cn(
        "size-2.5 shrink-0 rounded-full",
        status === "running" ? "bg-emerald-500" : "bg-muted-foreground/40",
      )}
      aria-hidden
    />
  );
}

function Segmented({ options, value }: { options: string[]; value: string }) {
  return (
    <div className="inline-flex w-fit items-center gap-0.5 rounded-md border bg-muted/50 p-0.5">
      {options.map((opt) => (
        <span
          key={opt}
          className={cn(
            "rounded px-3 py-1 text-[12px]",
            opt === value ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          {opt}
        </span>
      ))}
    </div>
  );
}

function MiniTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-left text-[12px]">
        <thead className="bg-muted/60 text-[11px] text-muted-foreground">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((cells, i) => (
            <tr key={i} className="transition-colors hover:bg-muted/30">
              {cells.map((cell, j) => (
                <td key={j} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultBox({ result, onClose }: { result: NonNullable<Result>; onClose: () => void }) {
  const cls =
    result.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : result.tone === "error"
        ? "border-destructive text-destructive"
        : "border-primary/30 bg-primary/5 text-foreground";
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-[12px]", cls)}>
      <span>{result.text}</span>
      <button type="button" onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground">
        閉じる
      </button>
    </div>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  confirmDisabled,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

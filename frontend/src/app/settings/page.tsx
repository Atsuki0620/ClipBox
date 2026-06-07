"use client";

import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import {
  createBackup,
  getConfig,
  scanLibrary,
  scanSelection,
  updateConfig,
} from "@/lib/api";
import type { BackupResponse, Config } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  DatabaseBackup,
  FolderSearch,
  RefreshCcw,
  RotateCcw,
  Save,
} from "lucide-react";

type ResultMessage = {
  tone: "success" | "error";
  text: string;
};

const INVALIDATE_KEYS: QueryKey[] = [
  ["config"],
  ["filter-options"],
  ["videos"],
  ["kpi"],
  ["selection-kpi"],
  ["selection-videos"],
  ["selection-random-source"],
  ["ranking"],
  ["analysis"],
  ["search"],
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const configQ = useQuery({ queryKey: ["config"], queryFn: getConfig });

  const [libraryRootsText, setLibraryRootsText] = useState<string | null>(null);
  const [selectionFolder, setSelectionFolder] = useState<string | null>(null);
  const [defaultPlayer, setDefaultPlayer] = useState<string | null>(null);
  const [avpExePath, setAvpExePath] = useState<string | null>(null);
  const [result, setResult] = useState<ResultMessage | null>(null);
  const [lastBackup, setLastBackup] = useState<BackupResponse | null>(null);

  const [saveOpen, setSaveOpen] = useState(false);
  const [libraryScanOpen, setLibraryScanOpen] = useState(false);
  const [selectionScanOpen, setSelectionScanOpen] = useState(false);

  const libraryRootsValue =
    libraryRootsText ?? configQ.data?.library_roots.join("\n") ?? "";
  const selectionFolderValue =
    selectionFolder ?? configQ.data?.selection_folder ?? "";
  const defaultPlayerValue = defaultPlayer ?? configQ.data?.default_player ?? "";
  const avpExePathValue = avpExePath ?? configQ.data?.avp_exe_path ?? "";
  const dbPath = configQ.data?.db_path ?? null;

  const draftConfig = useMemo<Config>(
    () => ({
      library_roots: parseLines(libraryRootsValue),
      default_player: defaultPlayerValue.trim(),
      avp_exe_path: avpExePathValue.trim(),
      db_path: dbPath,
      selection_folder: selectionFolderValue.trim(),
    }),
    [
      avpExePathValue,
      dbPath,
      defaultPlayerValue,
      libraryRootsValue,
      selectionFolderValue,
    ],
  );

  const validationErrors = useMemo(
    () => validateConfigDraft(draftConfig),
    [draftConfig],
  );
  const selectionScanError = useMemo(
    () => validateSelectionScan(selectionFolderValue),
    [selectionFolderValue],
  );
  // 実バックアップ（このセッションで作成）だけを実行許可の条件にする（外部自己申告は使わない）。
  const canConfirmLibraryScan = lastBackup != null;

  const invalidateSharedQueries = () => {
    for (const queryKey of INVALIDATE_KEYS) {
      queryClient.invalidateQueries({ queryKey });
    }
  };

  const resetDraft = () => {
    setLibraryRootsText(null);
    setSelectionFolder(null);
    setDefaultPlayer(null);
    setAvpExePath(null);
  };

  const saveMutation = useMutation({
    mutationFn: () => updateConfig(draftConfig),
    onSuccess: (response) => {
      setSaveOpen(false);
      resetDraft();
      setResult({ tone: "success", text: response.message });
      invalidateSharedQueries();
    },
    onError: (error) => {
      setResult({ tone: "error", text: errorMessage(error) });
    },
  });

  const libraryScanMutation = useMutation({
    mutationFn: scanLibrary,
    onSuccess: (response) => {
      setLibraryScanOpen(false);
      setResult({ tone: "success", text: response.message });
      invalidateSharedQueries();
    },
    onError: (error) => {
      setResult({ tone: "error", text: errorMessage(error) });
    },
  });

  const selectionScanMutation = useMutation({
    mutationFn: () => scanSelection(selectionFolderValue.trim()),
    onSuccess: (response) => {
      setSelectionScanOpen(false);
      setResult({
        tone: "success",
        text: `${response.message}（検出 ${response.found_count.toLocaleString()} 件）`,
      });
      invalidateSharedQueries();
    },
    onError: (error) => {
      setResult({ tone: "error", text: errorMessage(error) });
    },
  });

  const backupMutation = useMutation({
    mutationFn: createBackup,
    onSuccess: (response) => {
      setLastBackup(response);
      setResult({
        tone: "success",
        text: `バックアップを作成しました: ${response.filename}（${formatBytes(response.size_bytes)}）`,
      });
    },
    onError: (error) => {
      setResult({ tone: "error", text: errorMessage(error) });
    },
  });

  const reloadConfig = async () => {
    resetDraft();
    setResult(null);
    await configQ.refetch();
  };

  if (configQ.isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">設定</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={reloadConfig}
          disabled={configQ.isFetching}
        >
          <RotateCcw className="size-4" />
          再読込
        </Button>
      </div>

      {configQ.isError && <StatusBox tone="error" text={errorMessage(configQ.error)} />}
      {result && <StatusBox tone={result.tone} text={result.text} />}

      {lastBackup && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          バックアップ作成済み: {lastBackup.filename} /{" "}
          {formatBytes(lastBackup.size_bytes)}
        </div>
      )}

      <section className="rounded-md border p-4">
        <h2 className="mb-3 text-sm font-semibold">ライブラリ</h2>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">ライブラリルート</span>
            <Textarea
              value={libraryRootsValue}
              onChange={(event) => setLibraryRootsText(event.target.value)}
              className="min-h-32 font-mono text-sm"
              spellCheck={false}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">セレクションフォルダ</span>
            <Input
              value={selectionFolderValue}
              onChange={(event) => setSelectionFolder(event.target.value)}
              spellCheck={false}
            />
          </label>
        </div>
      </section>

      <section className="rounded-md border p-4">
        <h2 className="mb-3 text-sm font-semibold">再生</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">デフォルトプレイヤー</span>
            <Input
              value={defaultPlayerValue}
              onChange={(event) => setDefaultPlayer(event.target.value)}
              spellCheck={false}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">AVP 実行ファイルパス</span>
            <Input
              value={avpExePathValue}
              onChange={(event) => setAvpExePath(event.target.value)}
              spellCheck={false}
            />
          </label>
        </div>
      </section>

      <section className="rounded-md border p-4">
        <h2 className="mb-3 text-sm font-semibold">DB</h2>
        <div className="rounded-md bg-muted/50 px-3 py-2 font-mono text-sm text-muted-foreground">
          {dbPath || "既定値"}
        </div>
      </section>

      {validationErrors.length > 0 && (
        <div className="rounded-md border border-destructive p-3 text-sm text-destructive">
          {validationErrors.map((error) => (
            <div key={error}>{error}</div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setSaveOpen(true)}
          disabled={validationErrors.length > 0 || saveMutation.isPending}
        >
          <Save className="size-4" />
          設定保存
        </Button>

        <Button
          variant="outline"
          onClick={() => backupMutation.mutate()}
          disabled={backupMutation.isPending}
        >
          <DatabaseBackup className="size-4" />
          バックアップ
        </Button>

        <Button
          variant="outline"
          onClick={() => setSelectionScanOpen(true)}
          disabled={selectionScanError != null || selectionScanMutation.isPending}
        >
          <FolderSearch className="size-4" />
          セレクションスキャン
        </Button>

        <Button
          variant="destructive"
          onClick={() => setLibraryScanOpen(true)}
          disabled={libraryScanMutation.isPending || validationErrors.length > 0}
        >
          <RefreshCcw className="size-4" />
          ライブラリスキャン
        </Button>
      </div>

      {selectionScanError && (
        <div className="text-sm text-destructive">{selectionScanError}</div>
      )}

      <ConfirmDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        title="設定を保存"
        description="現在の入力内容で user_config.json を更新します。"
        confirmLabel="保存"
        pending={saveMutation.isPending}
        onConfirm={() => saveMutation.mutate()}
      />

      <ConfirmDialog
        open={selectionScanOpen}
        onOpenChange={setSelectionScanOpen}
        title="セレクションスキャン"
        description="指定中のセレクションフォルダをスキャンします。"
        confirmLabel="スキャン"
        pending={selectionScanMutation.isPending}
        onConfirm={() => selectionScanMutation.mutate()}
      >
        <div className="rounded-md bg-muted/50 px-3 py-2 font-mono text-xs">
          {selectionFolderValue.trim() || "未設定"}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={libraryScanOpen}
        onOpenChange={setLibraryScanOpen}
        title="ライブラリスキャン"
        description="ライブラリ全体をスキャンし、DB の動画状態を更新します。"
        confirmLabel="スキャン実行"
        pending={libraryScanMutation.isPending}
        confirmDisabled={!canConfirmLibraryScan}
        destructive
        onConfirm={() => libraryScanMutation.mutate()}
      >
        <div className="grid gap-2 text-sm">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
            見つからない動画は利用不可になります。Streamlit を停止し、必ず DB
            バックアップを作成してから実行してください。
          </div>
          {lastBackup ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-950">
              バックアップ済み: {lastBackup.filename}（{formatBytes(lastBackup.size_bytes)}）
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-md border border-destructive px-3 py-2 text-destructive">
              <span>このセッションでバックアップが未作成です。</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => backupMutation.mutate()}
                disabled={backupMutation.isPending}
              >
                <DatabaseBackup className="size-4" />
                今すぐバックアップ
              </Button>
            </div>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pending,
  confirmDisabled,
  destructive,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  confirmDisabled?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
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
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            キャンセル
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={pending || confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-48" />
      <Skeleton className="h-32" />
      <Skeleton className="h-24" />
    </div>
  );
}

function StatusBox({ tone, text }: ResultMessage) {
  const classes =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : "border-destructive text-destructive";
  return <div className={`rounded-md border px-3 py-2 text-sm ${classes}`}>{text}</div>;
}

function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function validateConfigDraft(config: Config): string[] {
  const errors: string[] = [];
  if (config.library_roots.length === 0) {
    errors.push("ライブラリルートを 1 件以上入力してください。");
  }
  for (const root of config.library_roots) {
    if (!isAbsolutePath(root)) {
      errors.push(`ライブラリルートは絶対パスで入力してください: ${root}`);
    }
  }
  if (!config.default_player.trim()) {
    errors.push("デフォルトプレイヤーを入力してください。");
  }
  if (config.selection_folder && !isAbsolutePath(config.selection_folder)) {
    errors.push("セレクションフォルダは絶対パスで入力してください。");
  }
  if (config.avp_exe_path && !isAbsolutePath(config.avp_exe_path)) {
    errors.push("AVP 実行ファイルパスは絶対パスで入力してください。");
  }
  return errors;
}

function validateSelectionScan(selectionFolder: string): string | null {
  const folder = selectionFolder.trim();
  if (!folder) return "セレクションフォルダを入力してください。";
  if (!isAbsolutePath(folder)) {
    return "セレクションフォルダは絶対パスで入力してください。";
  }
  return null;
}

function isAbsolutePath(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(value) || /^\\\\/.test(value) || value.startsWith("/");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "不明なエラーが発生しました。";
}

function formatBytes(value: number): string {
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

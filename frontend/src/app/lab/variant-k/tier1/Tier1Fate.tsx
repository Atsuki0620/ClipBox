// 統合 Variant K Tier1 運命の1本タブ。
// 【役割】「運命の1本を引く」ボタンと抽出条件トグルを横一列に並べ、引いた1本を全幅ワイドカードで提示するモック。
//   見出し・補足説明・囲い枠は置かない（フィードバック反映）。履歴セクションは作らない。
// 【設計制約】
//   - 履歴セクションは作らない。実 sessionStorage / API / localStorage には触れない。抽選はモック。
//   - 「未判定のみ」「最近見てない優先」はどちらも見た目のモック。カード優先・サムネなし。
//   - 当選した1本は id で固定する。判定（レベル選択）してもカードは切り替えず、
//     「運命の1本を引く」を押したときだけ次の1本に入れ替える。
//   - 引いた直後は約1秒のインターバルで候補をスロット風にちらつかせ、減速して1本に当てるアニメーションを出す。
//   - 引いた1本は全幅ワイド（バッジ→タイトル→メタ→操作）で表示する（表示項目とボタンはライブラリと共通）。
// 【依存関係】react, lucide, shadcn(button/switch), lib/utils(cn), ./shared（drawableCandidates / recentlyUnwatchedFirst）, ./Tier1Card。

"use client";

import { useEffect, useRef, useState } from "react";
import { Dices } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { drawableCandidates, recentlyUnwatchedFirst } from "./shared";
import { Tier1Card } from "./Tier1Card";
import type { Tier1MockCardStateController } from "./useTier1MockCardState";

// スロット風アニメ：総時間 約1秒・初速60ms・1ステップごとに間隔を伸ばして減速（＝視覚的に減速）。
const SPIN_DURATION_MS = 1000;
const SPIN_START_INTERVAL_MS = 60;
const SPIN_DECAY = 1.18;

export function Tier1Fate({ state }: { state: Tier1MockCardStateController }) {
  const [unratedOnly, setUnratedOnly] = useState(true);
  const [recentFirst, setRecentFirst] = useState(true);
  // 当選した1本（id で固定）。判定してもこの id は変わらない＝カードは切り替わらない。
  const [currentId, setCurrentId] = useState<number | null>(null);
  // 抽選中にちらつかせる候補（スロットのリール相当）。
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const landedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const base = drawableCandidates(state.videos, { unratedOnly });
  const pool = recentFirst ? recentlyUnwatchedFirst(base) : base;

  // 表示中の動画：抽選中はちらつき、確定後は当選を id で固定して live 状態を引く。
  const displayId = spinning ? previewId : currentId;
  const displayVideo = displayId != null ? state.videos.find((v) => v.id === displayId) : undefined;

  // アンマウント時にタイマーを片付ける。
  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
      if (landedTimerRef.current) clearTimeout(landedTimerRef.current);
    };
  }, []);

  const draw = () => {
    if (pool.length === 0 || spinning) return;
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    if (landedTimerRef.current) clearTimeout(landedTimerRef.current);

    const randomId = () => pool[Math.floor(Math.random() * pool.length)].id;
    const winnerId = randomId();

    setLanded(false);
    setSpinning(true);
    setPreviewId(randomId());

    let elapsed = 0;
    let delay = SPIN_START_INTERVAL_MS;
    const tick = () => {
      setPreviewId(randomId());
      elapsed += delay;
      if (elapsed >= SPIN_DURATION_MS) {
        // 確定：当選を固定し、短い当たりハイライトを出す。
        setCurrentId(winnerId);
        setSpinning(false);
        setPreviewId(null);
        setLanded(true);
        landedTimerRef.current = setTimeout(() => setLanded(false), 700);
        return;
      }
      delay = Math.round(delay * SPIN_DECAY);
      spinTimerRef.current = setTimeout(tick, delay);
    };
    spinTimerRef.current = setTimeout(tick, delay);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 引く操作＋トグルを横一列に（強い囲い枠なし） */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          className="h-12 px-8 text-base"
          onClick={draw}
          disabled={pool.length === 0 || spinning}
        >
          <Dices className={cn("size-5", spinning && "animate-spin")} />
          {spinning ? "抽選中…" : "運命の1本を引く"}
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-8 items-center gap-2 rounded-md bg-muted/50 px-2.5 text-[12px] text-foreground">
            <span>未判定のみ</span>
            <Switch
              checked={unratedOnly}
              disabled={spinning}
              onCheckedChange={(v) => setUnratedOnly(Boolean(v))}
            />
          </label>
          <label className="inline-flex h-8 items-center gap-2 rounded-md bg-muted/50 px-2.5 text-[12px] text-foreground">
            <span>最近見てない優先</span>
            <Switch
              checked={recentFirst}
              disabled={spinning}
              onCheckedChange={(v) => setRecentFirst(Boolean(v))}
            />
          </label>
        </div>
      </div>

      {/* 現在引かれている1本（全幅ワイドカード）。抽選中はちらつき＋減速、確定後は当たりハイライト。 */}
      {displayVideo ? (
        <Tier1Card
          video={displayVideo}
          state={state.getCardState(displayVideo)}
          layout="wide"
          playing={!spinning && playingId === displayVideo.id}
          onPlay={() => setPlayingId(displayVideo.id)}
          className={cn(
            "transition-shadow",
            spinning && "animate-pulse ring-2 ring-primary/60",
            landed && "ring-2 ring-primary",
          )}
        />
      ) : (
        <p className="text-[12px] text-muted-foreground">
          まだ引いていません。「運命の1本を引く」を押してください。
        </p>
      )}
    </div>
  );
}

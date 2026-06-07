"use client";

import type { ReactNode } from "react";
import { Dices, Shuffle } from "lucide-react";

import { EmptyBox, ErrorBox, VideoSkeleton } from "@/components/VideoState";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface RandomPanelProps {
  count: number;
  countOptions: number[];
  countLabel: string;
  shuffleLabel: string;
  onCountChange: (count: number) => void;
  onShuffle: () => void;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  loadingCount: number;
  children: ReactNode;
}

export function RandomPanel({
  count,
  countOptions,
  countLabel,
  shuffleLabel,
  onCountChange,
  onShuffle,
  isLoading,
  isError,
  error,
  loadingCount,
  children,
}: RandomPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(count)} onValueChange={(value) => onCountChange(Number(value))}>
          <SelectTrigger className="w-28" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {countOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} {countLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={onShuffle} disabled={isLoading}>
          <Shuffle className="size-4" />
          {shuffleLabel}
        </Button>
      </div>

      {isLoading ? (
        <VideoSkeleton count={loadingCount} />
      ) : isError ? (
        <ErrorBox error={error} />
      ) : (
        children
      )}
    </div>
  );
}

export interface FatePanelProps {
  drawLabel: string;
  hasDrawn: boolean;
  onDraw: () => void;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  loadingCount?: number;
  emptyMessageBeforeDraw: ReactNode;
  emptyMessageWhenNoTarget: ReactNode;
  children: ReactNode;
}

export function FatePanel({
  drawLabel,
  hasDrawn,
  onDraw,
  isLoading,
  isError,
  error,
  loadingCount = 1,
  emptyMessageBeforeDraw,
  emptyMessageWhenNoTarget,
  children,
}: FatePanelProps) {
  const isEmpty = !hasDrawn || children == null;
  const emptyMessage = hasDrawn ? emptyMessageWhenNoTarget : emptyMessageBeforeDraw;

  return (
    <div className="flex flex-col gap-3">
      <Button size="lg" className="w-fit px-8 py-5 text-base" onClick={onDraw} disabled={isLoading}>
        <Dices className="size-5" />
        {drawLabel}
      </Button>

      {isLoading ? (
        <VideoSkeleton count={loadingCount} />
      ) : isError ? (
        <ErrorBox error={error} />
      ) : isEmpty ? (
        <EmptyBox>{emptyMessage}</EmptyBox>
      ) : (
        children
      )}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { Dices, Library, Shuffle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface LibraryWorkspaceProps {
  title: string;
  status?: ReactNode;
  kpi: ReactNode;
  library: ReactNode;
  random: ReactNode;
  fate: ReactNode;
}

export function LibraryWorkspace({
  title,
  status,
  kpi,
  library,
  random,
  fate,
}: LibraryWorkspaceProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        {status ? <div className="text-sm text-muted-foreground">{status}</div> : null}
      </div>

      {kpi}

      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library">
            <Library className="size-4" />
            ライブラリ
          </TabsTrigger>
          <TabsTrigger value="random">
            <Shuffle className="size-4" />
            ランダム
          </TabsTrigger>
          <TabsTrigger value="fate">
            <Dices className="size-4" />
            運命の1本
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="flex flex-col gap-3">
          {library}
        </TabsContent>

        <TabsContent value="random" className="flex flex-col gap-3">
          {random}
        </TabsContent>

        <TabsContent value="fate" className="flex flex-col gap-3">
          {fate}
        </TabsContent>
      </Tabs>
    </div>
  );
}

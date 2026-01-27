"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

interface Channel {
  id: string;
  title: string;
  thumbnail?: string;
}

// This will be replaced with actual data from API
const mockChannels: Channel[] = [
  { id: "1", title: "サンプルチャンネル1", thumbnail: "" },
  { id: "2", title: "サンプルチャンネル2", thumbnail: "" },
];

export function ChannelSelector() {
  const [open, setOpen] = React.useState(false);
  const [selectedChannel, setSelectedChannel] = React.useState<Channel | null>(
    mockChannels[0] || null
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[240px] justify-between"
        >
          {selectedChannel ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedChannel.thumbnail} />
                <AvatarFallback>
                  {selectedChannel.title.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedChannel.title}</span>
            </div>
          ) : (
            "チャンネルを選択..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0">
        <div className="max-h-[300px] overflow-auto">
          {mockChannels.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              チャンネルがありません
            </div>
          ) : (
            mockChannels.map((channel) => (
              <div
                key={channel.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 p-3 hover:bg-accent",
                  selectedChannel?.id === channel.id && "bg-accent"
                )}
                onClick={() => {
                  setSelectedChannel(channel);
                  setOpen(false);
                }}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={channel.thumbnail} />
                  <AvatarFallback>{channel.title.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate text-sm">{channel.title}</span>
                {selectedChannel?.id === channel.id && (
                  <Check className="h-4 w-4" />
                )}
              </div>
            ))
          )}
        </div>
        <Separator />
        <Link href="/settings">
          <div className="flex cursor-pointer items-center gap-2 p-3 text-sm hover:bg-accent">
            <Plus className="h-4 w-4" />
            チャンネルを追加
          </div>
        </Link>
      </PopoverContent>
    </Popover>
  );
}

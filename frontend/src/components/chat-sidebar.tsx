/**
 * Chat Sidebar Component
 *
 * Thin wrapper that provides the Sheet/SheetContent container for the ChatUI.
 * All chat logic and state management is handled in ChatUI.
 *
 * Props:
 * - open: boolean - Controls sidebar visibility
 * - onOpenChange: (open: boolean) => void - Callback when sidebar opens/closes
 */

"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChatUI } from "./chat-ui";

interface ChatSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatSidebar({ open, onOpenChange }: ChatSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[810px] sm:max-w-[810px]! flex flex-col overflow-hidden p-0"
      >
        <ChatUI />
      </SheetContent>
    </Sheet>
  );
}

/**
 * Chat Sidebar Component
 *
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
      >
        <ChatUI />
      </SheetContent>
    </Sheet>
  );
}

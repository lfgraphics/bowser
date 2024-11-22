import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SearchModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: T[];
  onSelect: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

export function SearchModal<T>({
  isOpen,
  onClose,
  title,
  items,
  onSelect,
  renderItem,
  keyExtractor,
}: SearchModalProps<T>) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <Button
              key={keyExtractor(item)}
              className="w-full justify-start"
              variant="outline"
              onClick={() => onSelect(item)}
            >
              {renderItem(item)}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
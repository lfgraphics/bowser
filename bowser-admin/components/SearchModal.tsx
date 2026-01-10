import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className='max-h-[80svh]'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="space-y-2 mt-4 max-h-[70svh] overflow-y-auto text-foreground">
          {items.map((item) => (
            <Button
              key={keyExtractor(item)}
              className="justify-start w-full h-auto"
              variant="outline"
              onClick={() => onSelect(item)}
            >
              {renderItem(item)}
            </Button>
          ))}
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
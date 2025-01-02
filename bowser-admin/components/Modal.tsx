import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  // Handle clicking outside the modal
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`top-0 z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleOverlayClick}
    >
      <div className="relative bg-card p-4 rounded-lg w-full max-w-3xl h-[80vh] overflow-auto">
        <Button
          variant="outline"
          onClick={onClose}
          className="top-2 right-2 absolute font-bold text-2xl text-gray-700 hover:text-gray-900"
        >
          &times;
        </Button>
        {children}
      </div>
    </div>
  );
};

export default Modal;

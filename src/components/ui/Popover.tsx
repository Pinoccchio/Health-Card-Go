'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Popover({ trigger, children, className = '' }: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverHeight = 200; // Estimated height
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Position below if there's space, otherwise above
      if (spaceBelow > popoverHeight || spaceBelow > spaceAbove) {
        setPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX,
        });
      } else {
        setPosition({
          top: rect.top + window.scrollY - popoverHeight - 8,
          left: rect.left + window.scrollX,
        });
      }
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const popoverContent = isOpen ? (
    <div
      ref={popoverRef}
      className={`fixed z-50 ${className}`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm animate-in fade-in duration-200">
        {children}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-block cursor-pointer"
      >
        {trigger}
      </div>
      {typeof window !== 'undefined' && popoverContent && createPortal(popoverContent, document.body)}
    </>
  );
}

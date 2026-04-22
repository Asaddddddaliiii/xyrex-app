import React from 'react';
import { Link } from 'react-router-dom';

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[80px] md:h-[120px] bg-background/80 backdrop-blur-xl border-b border-border px-4 md:px-8 flex items-center justify-start">
      <div className="max-w-7xl w-full flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <img 
            src="/logo.png" 
            className="w-[45px] h-[45px] md:w-[90px] md:h-[90px] object-contain flex-shrink-0 shadow-sm" 
            alt="Xyrex Logo" 
            referrerPolicy="no-referrer" 
          />
          <Link 
            to="/" 
            className="text-xl md:text-4xl font-display font-bold tracking-tighter leading-none bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
          >
            XYREX
          </Link>
        </div>
        
        {/* Actions placeholder */}
      </div>
    </header>
  );
};

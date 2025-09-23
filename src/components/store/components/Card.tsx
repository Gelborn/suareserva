import React from 'react';

const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = '', children }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/70 dark:border-gray-700/70 shadow-sm ${className}`}>
    {children}
  </div>
);

export default Card;

import React from 'react';

const Field: React.FC<React.PropsWithChildren<{ label: string; hint?: string }>> = ({ label, hint, children }) => (
  <label className="block">
    <span className="text-sm text-gray-700 dark:text-gray-200">{label}</span>
    <div className="mt-1">{children}</div>
    {hint && <span className="text-xs text-gray-500">{hint}</span>}
  </label>
);

export default Field;

// src/components/ui/AppToaster.tsx
import React from 'react';
import { Toaster } from 'react-hot-toast';

const AppToaster: React.FC = () => (
  <Toaster
    position="top-right"
    gutter={10}
    containerStyle={{ zIndex: 9999 }}
    toastOptions={{
      duration: 3500,
      style: {
        background: '#111827', // fallback legível
        color: '#FFFFFF',
      },
    }}
  />
);

export default AppToaster;

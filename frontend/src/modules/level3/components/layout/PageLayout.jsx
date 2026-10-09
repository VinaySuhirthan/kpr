import React from 'react';
import { Header } from './Header';

export function PageLayout({ children, toolStatus, onRefreshStatus }) {
  return (
    <div className="level3-module-wrapper">
      <div className="level3-inner-content">
        {children}
      </div>
    </div>
  );
}

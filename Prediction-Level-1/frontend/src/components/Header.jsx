import React from 'react';
import { Bell } from 'lucide-react';

// ── UI chrome constants ──────────────────────────────────────────────────────
// PLACEHOLDER: User profile and active run are not sourced from the backend.
// These values should be replaced with real auth/session data when available.
const UI_WORKSPACE = 'Bioinformatics Workspace';
const UI_ACTIVE_RUN = 'ISOL-992';          // PLACEHOLDER: replace with real run ID from session
const UI_USER_NAME = 'Dr. John Doe';       // PLACEHOLDER: replace with authenticated user name
const UI_USER_ROLE = 'Lead Researcher';    // PLACEHOLDER: replace with authenticated user role
const UI_USER_INITIALS = 'JD';             // PLACEHOLDER: replace with user initials from auth

export default function Header() {
  return (
    <header className="top-header">
      <div className="breadcrumbs">
        <span>{UI_WORKSPACE} /</span>
        <span className="active-run-pill">Active Run: {UI_ACTIVE_RUN}</span>
      </div>

      <div className="header-right">
        <button className="notification-btn" aria-label="Notifications">
          <Bell size={18} />
          <span className="notification-badge" />
        </button>

        <div className="header-divider" />

        <div className="user-profile">
          <div className="user-avatar">{UI_USER_INITIALS}</div>
          <div className="user-info">
            <span className="user-name">{UI_USER_NAME}</span>
            <span className="user-role">{UI_USER_ROLE}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

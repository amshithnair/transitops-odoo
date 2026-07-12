import React from 'react';

// Minimal inline icon set (stroke-based, inherits currentColor). No external deps.
type P = { size?: number } & React.SVGProps<SVGSVGElement>;
const S: React.FC<P & { body: React.ReactNode }> = ({ size = 18, body, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...rest}>{body}</svg>
);

export const IconDashboard = (p: P) => <S {...p} body={<><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>} />;
export const IconTruck = (p: P) => <S {...p} body={<><path d="M1 3h13v11H1z" /><path d="M14 8h4l3 3v3h-7z" /><circle cx="5.5" cy="18" r="1.8" /><circle cx="17.5" cy="18" r="1.8" /></>} />;
export const IconUsers = (p: P) => <S {...p} body={<><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 6" /><path d="M17 14.5a6 6 0 0 1 4 5.5" /></>} />;
export const IconRoute = (p: P) => <S {...p} body={<><circle cx="6" cy="19" r="2.4" /><circle cx="18" cy="5" r="2.4" /><path d="M8 19h6a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h6" /></>} />;
export const IconWrench = (p: P) => <S {...p} body={<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8 6.2 21l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.5 2.5-2.3-.6-.6-2.3z" />} />;
export const IconFuel = (p: P) => <S {...p} body={<><rect x="3" y="3" width="10" height="18" rx="1.5" /><path d="M13 8h3l2 2v7a2 2 0 0 1-4 0v-4h-1" /><path d="M3 12h10" /></>} />;
export const IconChart = (p: P) => <S {...p} body={<><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="7" /><rect x="12" y="7" width="3" height="11" /><rect x="17" y="13" width="3" height="5" /></>} />;
export const IconSettings = (p: P) => <S {...p} body={<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 7 2.6h.1A1.6 1.6 0 0 0 8.5 1a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 15 2.6a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></>} />;
export const IconSearch = (p: P) => <S {...p} body={<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>} />;
export const IconBell = (p: P) => <S {...p} body={<><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>} />;
export const IconPlus = (p: P) => <S {...p} body={<><path d="M12 5v14M5 12h14" /></>} />;
export const IconDownload = (p: P) => <S {...p} body={<><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M4 21h16" /></>} />;
export const IconEdit = (p: P) => <S {...p} body={<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>} />;
export const IconTrash = (p: P) => <S {...p} body={<><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M6 6v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6" /></>} />;
export const IconClose = (p: P) => <S {...p} body={<><path d="M18 6 6 18M6 6l12 12" /></>} />;
export const IconSun = (p: P) => <S {...p} body={<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>} />;
export const IconMoon = (p: P) => <S {...p} body={<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />} />;
export const IconAlert = (p: P) => <S {...p} body={<><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></>} />;
export const IconCheck = (p: P) => <S {...p} body={<path d="M20 6 9 17l-5-5" />} />;
export const IconLogout = (p: P) => <S {...p} body={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>} />;
export const IconClock = (p: P) => <S {...p} body={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>} />;
export const IconMap = (p: P) => <S {...p} body={<><path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2z" /><path d="M9 3v16M15 5v16" /></>} />;
export const IconMenu = (p: P) => <S {...p} body={<><path d="M3 6h18M3 12h18M3 18h18" /></>} />;
export const IconFile = (p: P) => <S {...p} body={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>} />;
export const IconUpload = (p: P) => <S {...p} body={<><path d="M12 21V9" /><path d="m7 13 5-5 5 5" /><path d="M4 21h16" /></>} />;
export const IconActivity = (p: P) => <S {...p} body={<path d="M22 12h-4l-3 9L9 3l-3 9H2" />} />;

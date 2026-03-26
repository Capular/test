import { Metadata } from 'next';
import NotificationsClient from './notifications-client';

export const metadata: Metadata = {
  title: 'Notifications Management | ANU PAID SCRIM Admin',
  description: 'Manage and send push notifications to application users.',
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}

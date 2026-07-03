import { redirect } from 'next/navigation';

export default function MessagesIndexPage() {
  redirect('/app/messages/dashboard');
}

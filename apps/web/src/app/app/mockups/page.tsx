import { redirect } from 'next/navigation';

export default function MockupsIndexPage() {
  redirect('/app/mockups/dashboard');
}

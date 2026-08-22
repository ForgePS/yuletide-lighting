import { redirect } from 'next/navigation';

/** Legacy stub — real route optimization lives under Schedule. */
export default function RoutesRedirectPage() {
  redirect('/app/schedule/routes');
}

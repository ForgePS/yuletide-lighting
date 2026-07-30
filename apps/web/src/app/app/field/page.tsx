import { redirect } from 'next/navigation';

/** Legacy field hub → canonical Sign Tracker */
export default function FieldLegacyRedirectPage() {
  redirect('/app/marketing/sign-tracker');
}

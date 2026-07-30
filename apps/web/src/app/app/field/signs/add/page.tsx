import { redirect } from 'next/navigation';

export default function FieldSignsAddLegacyRedirect() {
  redirect('/app/marketing/sign-tracker/add');
}

/**
 * Bust Next.js ISR cache after Creator CMS writes.
 * Safe no-op when not running inside the Next.js runtime.
 */
export async function revalidateCmsPublicPaths(slug?: string | null) {
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');
    revalidatePath('/pricing');
    if (slug && slug !== 'home' && slug !== 'pricing') {
      revalidatePath(`/${slug}`);
    }
  } catch {
    // packages/api may be imported outside Next — ignore
  }
}

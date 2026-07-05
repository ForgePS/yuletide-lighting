import Link from "next/link";

export default function FieldSignReportPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Report sign</h1>
        <p className="text-sm text-slate-500">
          Report a damaged, missing, or stolen sign from the job you are on.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Open a job from Today, then use <strong>Report sign issue</strong> on that job page.
      </div>
      <Link href="/app/field" className="btn-secondary block w-full py-3 text-center">
        Back to today&apos;s jobs
      </Link>
    </div>
  );
}

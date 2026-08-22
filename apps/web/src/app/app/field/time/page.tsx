"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function FieldTimePage() {
  const [jobId, setJobId] = useState("");
  const utils = trpc.useUtils();
  const { data: active, isLoading } = trpc.crew.getActiveClockIn.useQuery();
  const clockIn = trpc.crew.clockIn.useMutation({
    onSuccess: () => {
      setJobId("");
      void utils.crew.getActiveClockIn.invalidate();
    },
  });
  const clockOut = trpc.crew.clockOut.useMutation({
    onSuccess: () => void utils.crew.getActiveClockIn.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Time clock</h1>
        <p className="text-sm text-slate-500">Clock in and out for payroll.</p>
      </div>

      {active ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <p className="font-medium text-emerald-900">Clocked in</p>
          <p className="text-sm text-emerald-800">
            Since {new Date(active.clockInAt).toLocaleTimeString()}
            {active.jobId ? ` · Job ${active.jobId.slice(0, 8)}…` : ""}
          </p>
          <button
            type="button"
            className="btn-primary w-full bg-red-600 hover:bg-red-700"
            disabled={clockOut.isPending}
            onClick={() => clockOut.mutate({ entryId: active.id })}
          >
            {clockOut.isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Clock out"}
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-sm text-slate-600">
            Enter a job ID from Today&apos;s schedule, or clock in from a job card directly.
          </p>
          <div>
            <label htmlFor="jobId" className="mb-1.5 block text-sm font-medium">
              Job ID
            </label>
            <input
              id="jobId"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="Paste job ID from schedule"
              className="input"
            />
          </div>
          <button
            type="button"
            className="btn-primary w-full"
            disabled={clockIn.isPending || !jobId.trim()}
            onClick={() => {
              navigator.geolocation.getCurrentPosition(
                (pos) =>
                  clockIn.mutate({
                    jobId: jobId.trim(),
                    clockIn: new Date().toISOString(),
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                  }),
                () =>
                  clockIn.mutate({
                    jobId: jobId.trim(),
                    clockIn: new Date().toISOString(),
                  }),
              );
            }}
          >
            {clockIn.isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Clock in"}
          </button>
        </div>
      )}
    </div>
  );
}

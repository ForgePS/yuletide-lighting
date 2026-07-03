'use client';



import { useMemo, useState } from 'react';

import { trpc } from '@/lib/trpc';

import { useAnalyticsYear } from '@/lib/analytics-year-context';

import { jobInYear } from '@/lib/year-filter-utils';

import { JobCard, ScheduleJobModal } from '@/components/jobs';



export default function JobsPage() {

  const { year } = useAnalyticsYear();

  const { data, refetch } = trpc.jobs.pipeline.useQuery();

  const completeInstall = trpc.jobs.completeInstall.useMutation({ onSuccess: () => refetch() });

  const markRemoval = trpc.jobs.markRemovalComplete.useMutation({ onSuccess: () => refetch() });

  const sendReview = trpc.reviews.send.useMutation({ onSuccess: () => refetch() });

  const [schedulingJob, setSchedulingJob] = useState<{ id: string; title: string } | null>(null);



  const columns = useMemo(

    () => (data ?? []).map((column) => ({

      ...column,

      jobs: column.jobs.filter((job) => jobInYear(job, year)),

    })),

    [data, year],

  );



  return (

    <div>

      <h1 className="text-2xl font-bold">Job pipeline</h1>

      <p className="text-muted-foreground">Track every job from proposal to review — schedule installs and removals by crew.</p>



      <div className="mt-6 flex gap-4 overflow-x-auto pb-4">

        {columns.map((column) => (

          <div key={column.stage} className="min-w-[280px] flex-shrink-0">

            <h2 className="mb-3 text-sm font-semibold text-muted-foreground capitalize">

              {column.stage.replace(/_/g, ' ')} ({column.jobs.length})

            </h2>

            <div className="space-y-3">

              {column.jobs.map((job) => (

                <div key={job.id}>

                  <JobCard

                    job={job}

                    onSchedule={() => setSchedulingJob({ id: job.id, title: job.title })}

                  />

                  <div className="mt-1 flex flex-wrap gap-2 px-1">

                    {job.stage === 'scheduled' && (

                      <button

                        type="button"

                        onClick={() => completeInstall.mutate({ jobId: job.id })}

                        className="text-xs text-green-600 hover:underline"

                      >

                        Mark installed

                      </button>

                    )}

                    {job.stage === 'removal_scheduled' && (

                      <button

                        type="button"

                        onClick={() => markRemoval.mutate({ jobId: job.id })}

                        className="text-xs text-blue-600 hover:underline"

                      >

                        Mark removed

                      </button>

                    )}

                    {job.stage === 'removed' && (

                      <button

                        type="button"

                        onClick={() => sendReview.mutate({ jobId: job.id, platform: 'google' })}

                        className="text-xs text-purple-600 hover:underline"

                      >

                        Request review

                      </button>

                    )}

                  </div>

                </div>

              ))}

            </div>

          </div>

        ))}

      </div>



      {schedulingJob && (

        <ScheduleJobModal

          jobId={schedulingJob.id}

          jobTitle={schedulingJob.title}

          onClose={() => setSchedulingJob(null)}

          onScheduled={() => refetch()}

        />

      )}

    </div>

  );

}


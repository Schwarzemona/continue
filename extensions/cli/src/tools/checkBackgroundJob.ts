import type { BackgroundJob } from "../services/BackgroundJobService.js";
import { services } from "../services/index.js";

import { Tool } from "./types.js";

export const checkBackgroundJobTool: Tool = {
  name: "CheckBackgroundJob",
  displayName: "Check Background Job",
  description: `バックグラウンドジョブのステータスと出力を確認します。
現在のステータス、終了コード（終了している場合）、および利用可能なすべての出力を返します。
ジョブがまだ実行中の場合は、"running" ステータスと共に部分的な出力を返します。`,
  parameters: {
    type: "object",
    required: ["job_id"],
    properties: {
      job_id: {
        type: "string",
        description:
          "確認するバックグラウンドジョブのID（例: bg-1-1234567890）",
      },
    },
  },
  readonly: true,
  isBuiltIn: true,
  run: async ({ job_id }: { job_id: string }): Promise<string> => {
    const job = services.backgroundJobs.getJob(job_id);

    if (!job) {
      return JSON.stringify({
        error: `ジョブ ${job_id} が見つかりません`,
        available_jobs: services.backgroundJobs
          .getAllJobs()
          .map((j: BackgroundJob) => ({
            id: j.id,
            status: j.status,
            command:
              j.command.substring(0, 50) + (j.command.length > 50 ? "..." : ""),
          })),
      });
    }

    const result: Record<string, unknown> = {
      job_id: job.id,
      status: job.status,
      command: job.command,
      output: job.output,
      started_at: job.startTime.toISOString(),
    };

    if (job.endTime) {
      result.ended_at = job.endTime.toISOString();
      result.duration_seconds = Math.round(
        (job.endTime.getTime() - job.startTime.getTime()) / 1000,
      );
    }

    if (job.exitCode !== null) {
      result.exit_code = job.exitCode;
    }

    if (job.error) {
      result.error = job.error;
    }

    return JSON.stringify(result, null, 2);
  },
};

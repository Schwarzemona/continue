import { ChildProcess } from "child_process";
import { describe, expect, it, vi } from "vitest";
import {
  getRunningProcessLog,
  markProcessAsRunning,
  removeRunningProcess,
} from "./processTerminalStates";

const mockProcess = {
  pid: 1,
  killed: false,
  kill: vi.fn(),
} as unknown as ChildProcess;

describe("processTerminalStates log tracking", () => {
  it("keeps the log location registered for a running process", () => {
    const toolCallId = "log-handoff-1";
    markProcessAsRunning(toolCallId, mockProcess, undefined, "", {
      uri: "file:///tmp/bg.log",
      relativePath: ".continue/logs/bg.log",
    });
    expect(getRunningProcessLog(toolCallId)).toEqual({
      uri: "file:///tmp/bg.log",
      relativePath: ".continue/logs/bg.log",
    });
    removeRunningProcess(toolCallId);
    expect(getRunningProcessLog(toolCallId)).toBeUndefined();
  });

  it("returns undefined when no log was given", () => {
    const toolCallId = "log-handoff-2";
    markProcessAsRunning(toolCallId, mockProcess);
    expect(getRunningProcessLog(toolCallId)).toBeUndefined();
    removeRunningProcess(toolCallId);
  });
});

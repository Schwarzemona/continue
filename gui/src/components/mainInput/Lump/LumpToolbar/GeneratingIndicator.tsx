import { AnimatedEllipsis } from "../../../AnimatedEllipsis";

export function GeneratingIndicator({
  text = "生成中",
  testId,
}: {
  text?: string;
  testId?: string;
}) {
  return (
    <div className="flex items-center text-description" data-testid={testId}>
      <span className="">{text}</span>
      <AnimatedEllipsis />
    </div>
  );
}

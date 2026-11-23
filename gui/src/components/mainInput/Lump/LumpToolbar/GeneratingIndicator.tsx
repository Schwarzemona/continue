import { AnimatedEllipsis } from "../../../AnimatedEllipsis";

export function GeneratingIndicator({
  text = "生成中",
  testId,
}: {
  text?: string;
  testId?: string;
}) {
  return (
    <div className="text-description flex items-center" data-testid={testId}>
      <span className="">{text}</span>
      <AnimatedEllipsis />
    </div>
  );
}

import { cloneElement, CSSProperties, ReactElement, useId } from "react";
import ReactDOM from "react-dom";
import { ITooltip, Tooltip } from "react-tooltip";
import { vscBackground, vscForeground } from "..";
import { varWithFallback } from "../../styles/theme";
import { fontSize } from "../../util";

// Needed to override styles in react-tooltip
const TooltipStyles: CSSProperties = {
  fontSize: fontSize(-2),
  backgroundColor: vscBackground,
  outline: `0.5px solid ${varWithFallback("description")}`,
  color: vscForeground,
  padding: "4px 8px",
  zIndex: 1000,
  maxWidth: "80vw",
  textAlign: "center",
};

export function ToolTip({
  children,
  content,
  ...props
}: Omit<ITooltip, "id" | "children" | "content"> & {
  content: ITooltip["children"];
  children: ReactElement;
}) {
  const tooltipId = useId();

  const combinedStyles = {
    ...TooltipStyles,
    ...props.style,
  };

  const tooltipPortalDiv = document.getElementById("tooltip-portal-div");

  // `data-*` attributes are not part of `ReactElement`'s default props type,
  // so the child is viewed as a generic prop record before cloning.
  const childrenWithTooltipId = cloneElement(
    children as ReactElement<Record<string, unknown>>,
    {
      "data-tooltip-id": tooltipId,
    },
  );

  return (
    <>
      {childrenWithTooltipId}
      {tooltipPortalDiv &&
        ReactDOM.createPortal(
          <Tooltip
            {...props}
            id={tooltipId}
            noArrow
            style={combinedStyles}
            opacity={1}
            delayShow={200}
          >
            {content}
          </Tooltip>,
          tooltipPortalDiv,
        )}
    </>
  );
}

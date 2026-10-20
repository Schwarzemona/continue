import {
  ArrowPathRoundedSquareIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
} from "@heroicons/react/24/outline";
// @ts-ignore
import Panzoom from "@panzoom/panzoom";
// @ts-ignore
import mermaid from "mermaid";
import { useEffect, useRef, useState } from "react";
import { useDebouncedEffect } from "../find/useDebounce";
import { ToolTip } from "../gui/Tooltip";

const MINIMUM_ZOOM_STEP = 0.05;

const MERMAID_THEME_COLORS = {
  background: "#bfbfbf",
  primaryColor: "#efefef",
  primaryTextColor: "#7f7f7f",
  primaryBorderColor: "#7f7f7f",
  secondaryColor: "#efefef",
  secondaryTextColor: "#7f7f7f",
  secondaryBorderColor: "#7f7f7f",
  tertiaryColor: "#efefef",
  tertiaryTextColor: "#7f7f7f",
  tertiaryBorderColor: "#7f7f7f",
  noteBkgColor: "#bfbfbf",
  noteTextColor: "#7f7f7f",
  noteBorderColor: "#7f7f7f",
  lineColor: "#7f7f7f",
  textColor: "#7f7f7f",
  mainBkg: "#bfbfbf",
  errorBkgColor: "#ffffff",
  errorTextColor: "#7f7f7f",
  nodeBorder: "#7f7f7f",
  clusterBkg: "#bfbfbf",
  clusterBorder: "#7f7f7f",
  defaultLinkColor: "#7f7f7f",
  titleColor: "#7f7f7f",
  edgeLabelBackground: "#bfbfbf",
  activeTaskBkgColor: "#bfbfbf",
  activeTaskBorderColor: "#7f7f7f",
  doneTaskBkgColor: "#0f0f0f",
  doneTaskBorderColor: "#7f7f7f",
  critBkgColor: "#ffffff",
  critBorderColor: "#7f7f7f",
  taskTextColor: "#7f7f7f",
  taskTextOutsideColor: "#7f7f7f",
  taskTextLightColor: "#7f7f7f",
  sectionBkgColor: "#bfbfbf",
  altSectionBkgColor: "#dfdfdf",
  sectionBkgColor2: "#bfbfbf",
  excludeBkgColor: "#3f3f3f",
  fillType0: "#264f78",
  fillType1: "#3a6db3",
  fillType2: "#59bc89",
  fillType3: "#4d8bf0",
  fillType4: "#3a6db3",
  fillType5: "#264f78",
  fillType6: "#59bc89",
  fillType7: "#4d8bf0",
};

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "loose",
  theme: "base",
  themeVariables: {
    ...MERMAID_THEME_COLORS,
    fontSize: "14px",
    fontFamily: "var(--vscode-font-family)",
  },
});

export default function MermaidDiagram({ code }: { code: string }) {
  const mermaidRenderContainerRef = useRef<HTMLDivElement>(null);
  const zoomInButtonRef = useRef<SVGSVGElement>(null);
  const zoomOutButtonRef = useRef<SVGSVGElement>(null);
  const resetZoomButtonRef = useRef<SVGSVGElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setIsLoading(true);
  }, [code]);

  useDebouncedEffect(
    () => {
      if (mermaidRenderContainerRef.current) {
        mermaidRenderContainerRef.current.innerHTML = "";
      }
      const diagramId = `mermaid-id-${Math.random().toString(36).substring(2)}`;
      void (async () => {
        if (!mermaidRenderContainerRef.current) return;
        try {
          await mermaid.parse(code);
          const renderedSVG = await mermaid.render(diagramId, code);
          mermaidRenderContainerRef.current.innerHTML = renderedSVG.svg;
          setError("");
          const panzoom = Panzoom(mermaidRenderContainerRef.current, {
            step: MINIMUM_ZOOM_STEP,
          });
          zoomInButtonRef.current?.addEventListener("click", () =>
            panzoom.zoomIn({ step: MINIMUM_ZOOM_STEP * 4 }),
          );
          zoomOutButtonRef.current?.addEventListener("click", () =>
            panzoom.zoomOut({ step: MINIMUM_ZOOM_STEP * 4 }),
          );
          resetZoomButtonRef.current?.addEventListener("click", () =>
            panzoom.reset(),
          );
          mermaidRenderContainerRef.current.parentElement?.addEventListener(
            "wheel",
            (event) => {
              if (!event.shiftKey) return;
              panzoom.zoomWithWheel(event);
            },
          );
        } catch (err: any) {
          if (err.message) {
            setError(err.message);
          } else {
            setError(
              "Unknown error when parsing or rendering the Mermaid diagram.",
            );
          }
        }
        setIsLoading(false);
      })();
    },
    500,
    [code],
  );

  return (
    <>
      {isLoading && (
        <div className="text-vsc-foreground">Generating diagram...</div>
      )}
      {!!error ? (
        <div className="text-error whitespace-pre">{error}</div>
      ) : (
        <div className="mermaid relative">
          <div className="absolute right-0 z-10 m-2 flex items-center gap-x-1">
            <ToolTip content={"Zoom In"}>
              <MagnifyingGlassPlusIcon
                ref={zoomInButtonRef}
                className="h-4 w-4 cursor-pointer"
              />
            </ToolTip>
            <ToolTip content={"Zoom Out"}>
              <MagnifyingGlassMinusIcon
                ref={zoomOutButtonRef}
                className="h-4 w-4 cursor-pointer"
              />
            </ToolTip>

            <ToolTip content="Reset Zoom">
              <ArrowPathRoundedSquareIcon
                ref={resetZoomButtonRef}
                className="h-4 w-4 cursor-pointer"
              />
            </ToolTip>
          </div>
          <div
            className="flex min-h-5 justify-center"
            ref={mermaidRenderContainerRef}
          />
        </div>
      )}
    </>
  );
}

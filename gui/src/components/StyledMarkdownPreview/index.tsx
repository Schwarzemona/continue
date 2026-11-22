import { ctxItemToRifWithContents } from "core/commands/util";
import { memo, useMemo, useRef } from "react";
import Markdown, { type Components, type ExtraProps } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import styled from "styled-components";
import type { PluggableList } from "unified";
import { v4 as uuidv4 } from "uuid";
import {
  defaultBorderRadius,
  vscBackground,
  vscEditorBackground,
  vscForeground,
} from "..";
import useUpdatingRef from "../../hooks/useUpdatingRef";
import { useAppSelector } from "../../redux/hooks";
import { selectUIConfig } from "../../redux/slices/configSlice";
import { getContextItemsFromHistory } from "../../redux/thunks/updateFileSymbols";
import { getFontSize } from "../../util";
import { ToolTip } from "../gui/Tooltip";
import FilenameLink from "./FilenameLink";
import "./katex.css";
import "./markdown.css";
import { annotateCodeNodes, indexCodeBlocks } from "./markdownPlugins";
import MermaidBlock from "./MermaidBlock";
import { rehypeHighlightPlugin } from "./rehypeHighlightPlugin";
import { SecureImageComponent } from "./SecureImageComponent";
import { StepContainerPreToolbar } from "./StepContainerPreToolbar";
import SymbolLink from "./SymbolLink";
import { SyntaxHighlightedPre } from "./SyntaxHighlightedPre";
import { isSymbolNotRif, matchCodeToSymbolOrFile } from "./utils";
import { fixDoubleDollarNewLineLatex } from "./utils/fixDoubleDollarLatex";
import { patchNestedMarkdown } from "./utils/patchNestedMarkdown";
import { remarkTables } from "./utils/remarkTables";

const StyledMarkdown = styled.div<{
  fontSize?: number;
  whiteSpace: string;
  bgColor: string;
}>`
  h1 {
    font-size: 1.25em;
  }

  h2 {
    font-size: 1.15em;
  }

  h3 {
    font-size: 1.05em;
  }

  h4 {
    font-size: 1em;
  }

  h5 {
    font-size: 0.95em;
  }

  h6 {
    font-size: 0.9em;
  }

  pre {
    white-space: ${(props) => props.whiteSpace};
    background-color: ${vscEditorBackground};
    border-radius: ${defaultBorderRadius};

    max-width: calc(100vw - 24px);
    overflow-x: scroll;
    overflow-y: hidden;

    padding: 8px;
  }

  code {
    span.line:empty {
      display: none;
    }
    word-wrap: break-word;
    border-radius: 0.3125rem;
    background-color: ${vscEditorBackground};
    font-size: ${getFontSize() - 2}px;
    font-family: var(--vscode-editor-font-family);
  }

  ul ul,
  ul ol,
  ol ul,
  ol ol {
    padding-left: 1.5em;
    margin-top: 1em;
  }

  li {
    margin-bottom: 0.8em;
  }
  li:last-child {
    margin-bottom: 0;
  }

  ul,
  ol {
    padding-left: 2em;
  }

  code:not(pre > code) {
    font-family: var(--vscode-editor-font-family);
  }

  background-color: ${(props) => props.bgColor};
  font-family:
    var(--vscode-font-family),
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    "Open Sans",
    "Helvetica Neue",
    sans-serif;
  font-size: ${(props) => props.fontSize || getFontSize()}px;
  padding-left: 8px;
  padding-right: 8px;
  color: ${vscForeground};

  p,
  li,
  ol,
  ul {
    line-height: 1.5;
  }

  * {
    word-break: break-word;
  }

  > *:last-child {
    margin-bottom: 0;
  }
`;

interface StyledMarkdownPreviewProps {
  showToolCallStatusIcon?: boolean;
  source?: string;
  className?: string;
  isRenderingInStepContainer?: boolean; // Currently only used to control the rendering of codeblocks
  scrollLocked?: boolean;
  itemIndex?: number;
  useParentBackgroundColor?: boolean;
  disableManualApply?: boolean;
  toolCallId?: string;
  expandCodeblocks?: boolean;
  collapsible?: boolean;
}

const HLJS_LANGUAGE_CLASSNAME_PREFIX = "language-";

function getLanguageFromClassName(className: any): string | null {
  if (!className || typeof className !== "string") {
    return null;
  }

  const language = className
    .split(" ")
    .find((word) => word.startsWith(HLJS_LANGUAGE_CLASSNAME_PREFIX))
    ?.split("-")[1];

  return language ?? null;
}

function getCodeChildrenContent(children: any) {
  if (typeof children === "string") {
    return children;
  } else if (
    Array.isArray(children) &&
    children.length > 0 &&
    typeof children[0] === "string"
  ) {
    return children[0];
  }
  return undefined;
}

/*
  markdown処理はreact-markdown(unified 11 / hast-util-to-jsx-runtime)を使う。
  旧react-remarkが内部で使うrehype-react@6/hast-to-hyperscript@9は、React要素の
  内部フィールド(_owner/_store)の有無で「Reactか」を判定してstyle文字列をオブジェクトへ
  変換するが、React 19ではproductionビルドでこれらのフィールドが消えるためstyleが
  文字列のまま渡り "The `style` prop expects a mapping..." でクラッシュした。
*/
const REMARK_PLUGINS: PluggableList = [
  remarkTables,
  [remarkMath, { singleDollarTextMath: true }],
  annotateCodeNodes,
];

const REHYPE_PLUGINS: PluggableList = [
  rehypeKatex,
  rehypeHighlightPlugin(),
  // Note: rehype-highlight は lowlight の `common` 言語セットを使う。
  // 未対応言語を追加する足場として plugins 配列の拡張点は以下に。
  // https://github.com/highlightjs/highlight.js/blob/main/SUPPORTED_LANGUAGES.md
  indexCodeBlocks,
];

const StyledMarkdownPreview = memo(function StyledMarkdownPreview(
  props: StyledMarkdownPreviewProps,
) {
  // The refs are a workaround because rehype options are stored on initiation
  // So they won't use the most up-to-date state values
  // So in this case we just put them in refs

  // The logic here is to get file names from
  // 1. Context items found in past messages
  // 2. Toolbar Codeblocks found in past messages
  const history = useAppSelector((state) => state.session.history);
  const allSymbols = useAppSelector((state) => state.session.symbols);
  const pastFileInfo = useMemo(() => {
    const index = props.itemIndex;
    if (index === undefined) {
      return {
        symbols: [],
        rifs: [],
      };
    }
    const pastContextItems = getContextItemsFromHistory(history, index);
    const rifs = pastContextItems.map((item) =>
      ctxItemToRifWithContents(item, true),
    );
    const symbols = Object.entries(allSymbols)
      .filter((e) => pastContextItems.find((item) => item.uri!.value === e[0]))
      .map((f) => f[1])
      .flat();

    return {
      symbols,
      rifs,
    };
  }, [props.itemIndex, history, allSymbols]);
  const pastFileInfoRef = useUpdatingRef(pastFileInfo);
  const itemIndexRef = useUpdatingRef(props.itemIndex);

  const codeblockStreamIds = useRef<string[]>([]);

  const markdownSource = useMemo(
    () =>
      // some patches to source markdown are applied here:
      fixDoubleDollarNewLineLatex(patchNestedMarkdown(props.source ?? "")),
    [props.source],
  );

  const components: Components = {
    a: ({ ...aProps }) => {
      return (
        <ToolTip place="top" className="m-0 p-0" content={aProps.href}>
          <a href={aProps.href} target="_blank" className="hover:underline">
            {aProps.children}
          </a>
        </ToolTip>
      );
    },
    // `data-*` は HTML 要素の既定 props 型に含まれないため、任意 props を
    // 許容する型で受け取る（hast から hProperties 経由で渡される値）。
    pre: (preProps: Record<string, any> & ExtraProps) => {
      const codeBlockIndex = preProps["data-codeblockindex"];

      const preChild = Array.isArray(preProps.children)
        ? preProps.children[0]
        : preProps.children;
      const preChildProps = preChild?.props ?? {};
      const { className, range } = preChildProps;

      const relativeFilePath = preChildProps["data-relativefilepath"];
      const codeBlockContent = preChildProps["data-codeblockcontent"];

      if (!props.isRenderingInStepContainer) {
        return <SyntaxHighlightedPre {...preProps} />;
      }

      const language = getLanguageFromClassName(className);

      const isLastCodeblock = preChildProps["data-islastcodeblock"];

      if (codeblockStreamIds.current[codeBlockIndex] === undefined) {
        codeblockStreamIds.current[codeBlockIndex] = uuidv4();
      }

      return (
        <StepContainerPreToolbar
          showToolCallStatusIcon={props.showToolCallStatusIcon}
          codeBlockContent={codeBlockContent}
          codeBlockIndex={codeBlockIndex}
          codeBlockStreamId={codeblockStreamIds.current[codeBlockIndex]} // ignored if toolCallId stream state is found
          disableManualApply={props.disableManualApply}
          expanded={props.expandCodeblocks}
          forceToolCallId={props.toolCallId}
          isLastCodeblock={isLastCodeblock}
          itemIndex={itemIndexRef.current}
          language={language}
          range={range}
          relativeFilepath={relativeFilePath}
          collapsible={props.collapsible}
        >
          <SyntaxHighlightedPre {...preProps} />
        </StepContainerPreToolbar>
      );
    },
    code: ({ ...codeProps }) => {
      const content = getCodeChildrenContent(codeProps.children);

      if (content) {
        const { symbols, rifs } = pastFileInfoRef.current;

        const matchedSymbolOrFile = matchCodeToSymbolOrFile(
          content,
          symbols,
          rifs,
        );
        if (matchedSymbolOrFile) {
          if (isSymbolNotRif(matchedSymbolOrFile)) {
            return (
              <SymbolLink content={content} symbol={matchedSymbolOrFile} />
            );
          } else {
            return <FilenameLink rif={matchedSymbolOrFile} />;
          }
        }
      }
      if (codeProps.className?.includes("language-mermaid")) {
        const codeText = String(codeProps.children || "");
        return <MermaidBlock code={codeText} />;
      }
      return <code {...codeProps}>{codeProps.children}</code>;
    },
    img: ({ ...imgProps }) => {
      return (
        <SecureImageComponent
          src={imgProps.src}
          alt={imgProps.alt}
          title={imgProps.title}
          className={imgProps.className}
        />
      );
    },
  };

  const uiConfig = useAppSelector(selectUIConfig);
  const codeWrapState = uiConfig?.codeWrap ? "pre-wrap" : "pre";

  return (
    <StyledMarkdown
      fontSize={getFontSize()}
      whiteSpace={codeWrapState}
      bgColor={props.useParentBackgroundColor ? "" : vscBackground}
    >
      <Markdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={components}
        // 旧実装(remark-rehype@8)は allowDangerousHtml なしで生のHTMLを
        // 除去していたため、同じ挙動を維持する。
        skipHtml
      >
        {markdownSource}
      </Markdown>
    </StyledMarkdown>
  );
});

export default StyledMarkdownPreview;

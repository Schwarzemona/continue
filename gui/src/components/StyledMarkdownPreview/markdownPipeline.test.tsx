import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { remarkTables } from "./utils/remarkTables";
import { annotateCodeNodes } from "./markdownPlugins";

test("StyledMarkdownPreview markdown pipeline renders KaTeX style objects without crashing (React 19)", () => {
  const source = [
    "inline $x^2 + y_1 = \\sqrt{2}$ math and display:",
    "",
    "$$",
    "\\int_0^1 x\\,dx",
    "$$",
    "",
    "| Fruit | Color |",
    "|-------|-------|",
    "| Apple | Red   |",
    "",
    "```python",
    "print('hi')",
    "```",
    "",
    "raw <b>html</b> should be dropped (skipHtml)",
  ].join("\n");

  const html = renderToStaticMarkup(
    <Markdown
      remarkPlugins={[
        remarkTables,
        [remarkMath, { singleDollarTextMath: true }],
        annotateCodeNodes,
      ]}
      rehypePlugins={[rehypeKatex]}
      skipHtml
    >
      {source}
    </Markdown>,
  );

  // React 19 throws "The `style` prop expects a mapping..." if style reaches
  // the renderer as a raw string. Reaching this point proves conversion works.
  expect(html).toContain('class="katex"');
  expect(html).toMatch(/style="[^"]+"/);
  expect(html).toContain("<table");
  expect(html).toContain("<code");
  expect(html).not.toContain("<b>html</b>");
});

test("StyledMarkdownPreview markdown pipeline handles empty source without crashing", () => {
  const renderEmpty = () =>
    renderToStaticMarkup(
      <Markdown
        remarkPlugins={[
          remarkTables,
          [remarkMath, { singleDollarTextMath: true }],
          annotateCodeNodes,
        ]}
        rehypePlugins={[rehypeKatex]}
        skipHtml
      >
        {""}
      </Markdown>,
    );
  expect(renderEmpty).not.toThrow();
  expect(renderEmpty()).toBe("");
});

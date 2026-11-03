import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
} from "../../index.js";
import { BaseContextProvider } from "../index.js";

class TerminalContextProvider extends BaseContextProvider {
  static description: ContextProviderDescription = {
    title: "terminal",
    displayTitle: "端末",
    description: "直前の端末コマンドを参照",
    type: "normal",
  };

  async getContextItems(
    query: string,
    extras: ContextProviderExtras,
  ): Promise<ContextItem[]> {
    const content = await extras.ide.getTerminalContents();
    return [
      {
        description: "端末の内容",
        content: `現在の端末の内容:\n\n${
          content || "端末は空です"
        }`,
        name: "端末",
      },
    ];
  }
}

export default TerminalContextProvider;

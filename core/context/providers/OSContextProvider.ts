import os from "os";

import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
} from "../../index.js";
import { BaseContextProvider } from "../index.js";

class OSContextProvider extends BaseContextProvider {
  static description: ContextProviderDescription = {
    title: "os",
    displayTitle: "OS",
    description: "OSとCPUの情報",
    type: "normal",
  };

  async getContextItems(
    query: string,
    extras: ContextProviderExtras,
  ): Promise<ContextItem[]> {
    const cpu = os.arch();
    const platform = os.platform();
    return [
      {
        description: "OSとCPU",
        content: `${
          platform === "win32" ? "Windows" : platform
        } 上で ${cpu}を使用して動作しています。`,
        name: "OS",
      },
    ];
  }
}

export default OSContextProvider;

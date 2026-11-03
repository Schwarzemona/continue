import { getDatabaseAdapter } from "dbinfoz";

import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
  ContextSubmenuItem,
  LoadSubmenuItemsArgs,
} from "../../index.js";
import { BaseContextProvider } from "../index.js";

class DatabaseContextProvider extends BaseContextProvider {
  static description: ContextProviderDescription = {
    title: "database",
    displayTitle: "データベース",
    description: "テーブルスキーマ",
    type: "submenu",
    renderInlineAs: "",
  };

  get deprecationMessage() {
    return "データベースのコンテキストプロバイダーは非推奨であり、後のバージョンで削除される可能性があります。代わりに postgres-mcp (https://continue.dev/anthropic/postgres-mcp) のようなデータベース MCP サーバーの使用を検討してください。";
  }

  async getContextItems(
    query: string,
    extras: ContextProviderExtras,
  ): Promise<ContextItem[]> {
    const contextItems: ContextItem[] = [];

    const connections = this.options?.connections;

    if (connections === null) {
      return contextItems;
    }

    const [connectionName, table] = query.split(".");

    for (const connection of connections) {
      if (connection.name === connectionName) {
        // @ts-ignore (incorrect typings on module's declaration file)
        const adapter = getDatabaseAdapter(
          connection.connection_type,
          connection.connection,
        );
        const tablesAndSchemas = await adapter.getAllTablesAndSchemas(
          connection.connection.database,
        );

        if (table === "all") {
          let prompt = `${connection.connection_type} の全テーブルのスキーマは `;
          prompt += JSON.stringify(tablesAndSchemas);

          const contextItem = {
            name: `${connectionName}-all-tables-schemas`,
            description: "全テーブルのスキーマ",
            content: prompt,
          };

          contextItems.push(contextItem);
        } else {
          const tables = Object.keys(tablesAndSchemas);

          tables.forEach((tableName) => {
            if (table === tableName) {
              let prompt = `${connection.connection_type} の ${tableName} のスキーマは `;
              prompt += JSON.stringify(tablesAndSchemas[tableName]);

              const contextItem = {
                name: `${connectionName}-${tableName}-schema`,
                description: `${tableName} のスキーマ`,
                content: prompt,
              };

              contextItems.push(contextItem);
            }
          });
        }
      }
    }

    return contextItems;
  }

  async loadSubmenuItems(
    args: LoadSubmenuItemsArgs,
  ): Promise<ContextSubmenuItem[]> {
    const contextItems: ContextSubmenuItem[] = [];
    const connections = this.options?.connections;

    if (connections === null) {
      return contextItems;
    }

    for (const connection of connections) {
      // @ts-ignore (incorrect typings on module's declaration file)
      const adapter = getDatabaseAdapter(
        connection.connection_type,
        connection.connection,
      );
      const tablesAndSchemas = await adapter.getAllTablesAndSchemas(
        connection.connection.database,
      );
      const tables = Object.keys(tablesAndSchemas);

      const contextItem = {
        id: `${connection.name}.all`,
        title: `${connection.name} の全テーブルスキーマ`,
        description: "",
      };

      contextItems.push(contextItem);

      tables.forEach((tableName) => {
        const contextItem = {
          id: `${connection.name}.${tableName}`,
          title: `${connection.name}.${tableName} のスキーマ`,
          description: "",
        };

        contextItems.push(contextItem);
      });
    }

    return contextItems;
  }
}

export default DatabaseContextProvider;

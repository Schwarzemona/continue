import generateRepoMap from "../../util/generateRepoMap";

import { ToolImpl } from ".";

export const viewRepoMapImpl: ToolImpl = async (args, extras) => {
  const repoMap = await generateRepoMap(extras.llm, extras.ide, {
    outputRelativeUriPaths: true,
    includeSignatures: true,
  });
  return [
    {
      name: "リポジトリマップ",
      description: "リポジトリ構造の概要",
      content: repoMap,
    },
  ];
};

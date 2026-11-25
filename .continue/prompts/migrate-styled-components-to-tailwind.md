---
name: Tailwindへの移行
description: styled-componentsをTailwind CSSに移行するためのガイドライン
invokable: true
---

# Tailwindへの移行

このファイル内のすべての styled components を Tailwind CSS に変換してください。もし `@theme.ts` や `@tailwind.config.cjs` にまだ存在しない変数が使用されている場合は、その変数がどこから来ているのかを特定し、使用できるように追加を試みてください。値を補間するために関数が呼び出されている場合は、インラインの `styles={{ ... }}` を使用できます。三項演算子については、`@cn.ts` を使用できます。

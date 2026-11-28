# Continue CLI ターミナル UI 仕様

この仕様は未完成です。

## スタック

Continue CLI は TUI ライブラリとして Ink（React ベース）を使用しています。

## cwd／git の表示

TUI の左下隅には次を表示すべきです。

- git リポジトリ内であれば現在の git ブランチ
- 表示に必要な列数が確保でき、かつ gh リポジトリであれば、owner/repo も併せて表示
- git を使用していない場合は cwd

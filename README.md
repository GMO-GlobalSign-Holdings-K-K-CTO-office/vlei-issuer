## 概要
[TBDのWeb5 JS SDKとSSI SDKを試す(中編)](https://tech.gmogshd.com/try-web5-2/)

## ローカルで起動
1. `yarn install`
1. `.env.dev`を用意する。以下、環境変数。
    - `VITE_VUETIFY_THEME`
        - `lightTheme` (default)
        - `darkTheme`
    - `VITE_REMOTE_DWN_ENDPOINT` 
        - e.g. https://foobar.com
2. `yarn dev`

## ローカルでデモ実行
1. memo-dwa-demo/alice, memo-dwa-demo/bob配下に.env.devを用意して上記環境変数を記述する。
2. memo-dwa-demoディレクトリ上で`docker compose up`
    - Alice: http://localhost:3000
    - Bob: http://localhost:4000


# Store listing

The text to paste into the Chrome Web Store and AMO dashboards, kept here so
both stores say the same thing and a change goes through review like code.
The summary is the manifest description (`build/locales.ts`); keep the two in
step.

## Summary

Shown under the name in search results. 132 characters at most.

- ja: Slite で日本語を入力したときに、文字が二重に表示・保存されるのを防ぎます。
- en: Stops Japanese text from showing up or being saved twice when you type it in Slite.

## Description

### ja

```text
Slite で日本語を入力すると、漢字に変換して確定した文字がもう一度表示され、そのまま保存されてしまうことがあります。Slime はこの問題を防ぐ拡張機能です。入れておけば、いつもどおり入力するだけで、二重になった文字を消して回る必要がなくなります。

■ 直す問題
・ドキュメントの本文で、確定した文字が二重に表示・保存される
・データベースの行タイトルで、変換中に Enter を押すと編集が終わってしまう
・検索ボックスで、変換中の文字が消える

■ 一時停止
ツールバーのアイコンからポップアップを開き、スイッチひとつで止められます。止めている間はアイコンに OFF と表示され、すべての Slite のタブにすぐ反映されます。

■ おまけ: Emacs キーバインド
Ctrl+F / B / N / P / A / E でカーソルを動かせます。初期設定は OFF で、ポップアップからオンにできます。

■ プライバシー
Slime は Slite のページの中で動くだけで、入力した内容を含め、どんなデータも外部に送りません。保存するのは、一時停止と Emacs キーバインドの ON/OFF だけで、それもブラウザの中に残ります。

■ ソースコードと不具合の報告
https://github.com/Xantibody/slime
```

### en

```text
When you type Japanese in Slite, the text you have just converted to kanji and confirmed can appear a second time and be saved that way. Slime stops that from happening: keep it installed, type as usual, and there is nothing to clean up afterwards.

What it fixes
- In a document, confirmed text showing up and being saved twice
- In a database row title, pressing Enter during a conversion ending the edit
- In the search box, the text being converted disappearing

Pause
Open the popup from the toolbar icon and switch Slime off with one click. While it is paused the icon shows OFF, and every Slite tab follows at once.

Extra: Emacs keybindings
Move the cursor with Ctrl+F / B / N / P / A / E. Off by default; turn it on in the popup.

Privacy
Slime only runs inside Slite pages and sends nothing anywhere, including what you type. All it stores is whether it is paused and whether the Emacs keybindings are on, and that stays in your browser.

Source code and bug reports
https://github.com/Xantibody/slime
```

## Images

`pnpm store:render` renders these from the HTML beside them (see [README](README.md)).

| Store            | Field                 | File                                                                    |
| ---------------- | --------------------- | ----------------------------------------------------------------------- |
| Chrome Web Store | Store icon            | `icons/icon-128.png`, shipped in the package                            |
| Chrome Web Store | Screenshots, in order | `screenshots/fix.png`, `screenshots/pause.png`, `screenshots/emacs.png` |
| Chrome Web Store | Small promo tile      | `promo/small.png`                                                       |
| Chrome Web Store | Marquee promo tile    | `promo/marquee.png`                                                     |
| AMO              | Screenshots, in order | the same three screenshots                                              |

## Chrome Web Store: other fields

- Category: Productivity / Tools
- Language: Japanese
- Homepage and support URL: `https://github.com/Xantibody/slime` and
  `https://github.com/Xantibody/slime/issues`

### Privacy practices

- Single purpose: fixes Japanese input in the Slite editor, so that confirmed
  text is not shown or saved twice.
- `storage`: remembers whether the user paused Slime and whether the Emacs
  keybindings are on.
- `declarativeContent`: enables the toolbar icon only on Slite pages.
- Host permission `https://*.slite.com/*`: the fixes run inside Slite's
  editor, and only there.
- Remote code: none. Every script is bundled in the package.
- Data usage: collects nothing. Tick none of the data types, and certify the
  three statements (no selling, no unrelated use, no creditworthiness).

## AMO: other fields

- Categories: Language Support, Other
- Homepage and support site: the same as above
- `tabs` (the reason AMO's reviewers may ask about): reads the URL of a tab
  to enable the toolbar icon only on Slite pages; Firefox has no
  `declarativeContent`.
- The add-on declares `data_collection_permissions: none` in its manifest, so
  no privacy policy is needed.

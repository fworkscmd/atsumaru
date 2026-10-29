# アツマルコイン（仮） ver 1.0

NFCコインをスマホにかざして、同じ卓に集まって遊ぶブラウザゲームです。
今遊べるのは「ドワーフ」（深掘りチキンレース・1〜4人）です。

## 入っているファイル

| ファイル | 中身 |
|---|---|
| `index.html` | ゲーム本体（これ1つで動きます） |
| `firebase-config.js` | Firebaseの設定。**ここだけ自分のものに書き換えます** |
| `firestore.rules` | データベースのルール（いたずら対策）。Firebaseに貼ります |

`firebase-config.js` が書き換わっていないときは、オンラインにつながらず「1台で回して遊ぶ」モードで動きます。

---

## 公開までの手順

### 1. Firebaseのプロジェクトを作る（5分）

1. https://console.firebase.google.com/ を開いて、Googleアカウントでログインします。
2. 「プロジェクトを作成」を押して、好きな名前（例：`atsumaru-coin`）を入れます。Googleアナリティクスはオフで大丈夫です。

### 2. 匿名ログインをオンにする

1. 左のメニューから「構築」→「Authentication」→「始める」を押します。
2. 「ログイン方法」タブで「匿名」を選んで「有効にする」をオンにし、保存します。

※ アカウント登録なしで、開いた人に自動でIDがつくようにするためです。

### 3. データベース（Firestore）を作る

1. 「構築」→「Firestore Database」→「データベースを作成」を押します。
2. ロケーションは **asia-northeast1（東京）** を選びます。
3. 「本番環境モードで開始」を選んで作成します。
4. できたら「ルール」タブを開き、中身を全部消して `firestore.rules` の中身を貼り付け、「公開」を押します。

### 4. 設定をコピーする

1. 左上の歯車 →「プロジェクトの設定」を開きます。
2. 下の「マイアプリ」で `</>`（ウェブ）を押し、アプリの名前を入れて登録します。Firebase Hostingのチェックは不要です。
3. 表示される `firebaseConfig = { ... }` の中身を、`firebase-config.js` の `{ ... }` の部分に貼り付けます。

```js
window.ATSUMARU_FIREBASE = {
  apiKey: "AIza....",
  authDomain: "atsumaru-coin.firebaseapp.com",
  projectId: "atsumaru-coin",
  storageBucket: "atsumaru-coin.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
```

`apiKey` は公開されても大丈夫な種類の値です。データを守るのは手順3で貼ったルールです。

### 5. GitHubで公開する

1. GitHubで新しいリポジトリを作ります（例：`atsumaru-coin`）。無料プランでGitHub Pagesを使うので **Public** にします。
2. 「Add file」→「Upload files」で、`index.html`・`firebase-config.js`・`firestore.rules`・`README.md` をアップロードして「Commit changes」。
3. リポジトリの「Settings」→「Pages」を開き、「Branch」を `main`、フォルダを `/ (root)` にして保存します。
4. 1〜2分待つと、`https://（ユーザー名）.github.io/（リポジトリ名）/` で開けるようになります。

### 6. 念のため：承認済みドメインに追加

Firebaseの「Authentication」→「設定」→「承認済みドメイン」に `（ユーザー名）.github.io` を追加しておきます。

---

## 遊んでみる

- 2台のスマホで `https://（ユーザー名）.github.io/（リポジトリ名）/#TEST1` を開きます。
- 先に開いた人が部屋主になります。あとの人は名前を入れると参加希望が届くので、部屋主が「入れる」を押します。
- 部屋主が「チケットをきる」を押すとスタートです。

## NFCコインに書き込むリンク

```
https://（ユーザー名）.github.io/（リポジトリ名）/#卓コード
```

卓コードは英数字4〜8文字です（例：`#K7A2`）。コイン1枚につき1つの卓コードにします。
NFC Toolsなどのアプリで「URL」として書き込めます。

## 無料枠の目安

Firebaseの無料プラン（Spark）は、1日あたり書き込み2万回・読み込み5万回までです。
ドワーフ1ゲームでおよそ書き込み100〜200回くらいなので、1日に数十ゲームなら無料の範囲に収まる見込みです。

## わかっている制限（ver 1.0）

- 卓のメンバーなら、データベースの中身を書き換えることができます（身内で遊ぶ前提のルールです）。
- 終わった卓のデータは消さずに残ります。
- スマホ何台もでの実機テストはこれからです。

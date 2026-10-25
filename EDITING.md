# নিজে PlayPiku বদলানোর সহজ নিয়ম

দৈনন্দিন পরিবর্তনের জন্য শুধু **[src/site-config.js](src/site-config.js)** edit করুন। গেমের কোড খুলতে হবে না। সাইটের লেখা English রাখুন।

## GitHub থেকেই করুন

1. [Settings ফাইলটি খুলুন](https://github.com/tanzilamd/playpiku/edit/main/src/site-config.js)। GitHub-এ নিজের account দিয়ে sign in থাকা প্রয়োজন।
2. নিচের নিয়মে প্রয়োজনের value বদলান। উদ্ধৃতি চিহ্ন, comma ও বন্ধনী রেখে দিন।
3. **Commit changes** দিন, branch `main` রাখুন। **Actions → Test and deploy PlayPiku** সবুজ হলে সাইট আপডেট হয়ে যাবে। সাধারণত কয়েক মিনিট লাগে।

নাম, ক্রম বা লেখা বদলালে share thumbnail, game count ও metadata-ও স্বয়ংক্রিয়ভাবে আপডেট হবে। আলাদা ছবি তৈরি বা terminal command চালাতে হবে না। ভুল field/syntax হলে Actions-এ error দেখাবে; আগের live সংস্করণ চালু থাকবে।

## কী বদলাতে পারবেন

| প্রয়োজন                             | যে field edit করবেন                               |
| ----------------------------------- | ------------------------------------------------- |
| গেম আগে/পরে দেখানো                  | `games`-এ সম্পূর্ণ `{ ... }` block উপরে/নিচে সরান |
| গেম লুকানো                          | সেই গেমের `show: false` করুন                      |
| আবার দেখানো                         | `show: true` করুন                                 |
| NEW badge                           | `isNew: true` বা `false`                          |
| গেমের display name                  | `name`                                            |
| Card ও share-এর description         | `description`                                     |
| Category/filter                     | `category`; নতুন নাম দিলেও filter নিজে তৈরি হবে   |
| Homepage-এর বড় featured game        | `featuredGame`-এ গেমের `id` দিন                   |
| বড় heading-এর দুই লাইন              | `homepage.titleFirst`, `homepage.titleSecond`     |
| Intro-এর দুই লাইন                   | `homepage.subtitle`, `homepage.subtitleSecond`    |
| ছোট badge, button ও library-এর লেখা | `homepage`-এর বাকি field                          |
| Highlight/button-এর রঙ              | `accentColor`; যেমন `"#c7f36b"` বা `"#e8bd88"`    |
| Footer-এর developer নাম ও link      | `developer.name`, `developer.url`                 |
| Footer-এর ছোট লেখা                  | `footerText`                                      |
| Announcement banner                 | `announcement.show`, `text`, `linkText`, `url`    |
| Social/profile links                | `socialLinks`-এ `{ label, url }` block            |
| Homepage-এর অংশ দেখানো/লুকানো       | `sections.hero`, `recent`, `breakNote`            |
| Game page-এর related games          | `sections.relatedGames`                           |
| Favorites / category filters দেখানো | `library.favorites`, `library.filters`            |

Favorites প্রতিটি খেলোয়াড়ের নিজের browser-এ থাকে; account লাগে না। Config থেকে Favorites বন্ধ করলে saved পছন্দ মুছবে না। গেম লুকালে Favorites তালিকাতেও দেখাবে না; আবার দেখালে আগের পছন্দ ফিরে আসবে। Settings-এর Reset records Favorites বা Bubble Pop-এর unlocked level/stars মুছবে না।

All games-এর পাশেই Favorites এবং category filters থাকে। `library.filters: false` করলে category buttons লুকাবে; Favorites চালু থাকলে All games ও Favorites থাকবে।

লুকানো গেম homepage, related games ও resume banner-এ থাকবে না। আগে share করা direct play link ঠিকই চলবে। Featured গেম লুকালে প্রথম visible গেমটি featured হবে।

## ছোট উদাহরণ

Featured-এ Rally দিতে:

```js
featuredGame: "rally",
```

একটি গেমকে Racing category-তে নেওয়া এবং NEW badge দেওয়া:

```js
{
  id: "rally",
  show: true,
  isNew: true,
  name: "Piku Rally",
  description: "Find your line. Make every little lap count.",
  category: "Racing",
},
```

এটি বিদ্যমান Rally block-এর জায়গায় edit করবেন; একই `id`-এর আরেকটি block যোগ করবেন না। `true` ও `false`-এর চারপাশে উদ্ধৃতি লাগে না।

## Banner, links ও section-এর উদাহরণ

```js
announcement: {
  show: true,
  text: "Three new games are ready to play!",
  linkText: "Try Bubble Pop",
  url: "/playpiku/play/bubble/",
},
socialLinks: [
  { label: "GitHub", url: "https://github.com/tanzilamd" },
  { label: "My website", url: "https://tanzilahmed.tech/" },
],
sections: {
  hero: true,
  recent: true,
  breakNote: false,
  relatedGames: true,
},
library: { favorites: true, filters: true },
```

বিদ্যমান field-গুলোর জায়গায় edit করবেন। Announcement-এর link না চাইলে `url: ""`, `linkText: ""` রাখুন। Banner সব page-এ দেখা যাবে। Social links সম্পূর্ণ `https://` বা `http://` URL হতে হবে; banner-এর ক্ষেত্রে `/playpiku/.../` path-ও চলবে। `socialLinks: []` দিলে social links থাকবে না।

## কোন অংশ একই রাখবেন

`id` বদলাবেন না—এটি গেমের ঠিকানা, কোড ও saved record-এর পরিচয়। কোনো গেম লুকাতে `show` ব্যবহার করুন। `category` হিসেবে `All games` ব্যবহার করবেন না; এটি মূল filter-এর নাম।

এই settings ফাইল দিয়ে বর্তমান গেমগুলো সাজানো যায়। নতুন গেমের gameplay, নিয়ম বা artwork তৈরি করতে আলাদা কোড লাগে। How to play-এর বিস্তারিত নির্দেশনা `src/catalog.js`-এ থাকে।

## নিজের কম্পিউটারে কাজ করলে

README অনুযায়ী Node.js ও Chromium তৈরি করে `npm run build` চালান। Config বদলালে build প্রয়োজনের share images নিজেই তৈরি করবে। Local server চলমান থাকলে config edit করার পর সেটি restart করুন। `npm test` এবং `npm run test:e2e` দিয়ে পরীক্ষা করতে পারবেন। GitHub থেকে edit করলে এই কাজগুলো স্বয়ংক্রিয়।

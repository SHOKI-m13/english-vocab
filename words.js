const lessons = [
`World Englishes | 世界の様々な英語
term | 言葉
refer to | ～を示す
linguist | 言語学者
consist of | ～から成る
first language | 第一言語（母語）
spelling(s) | 綴り
depending on | ～によって・～に応じて
region(s) | 地域
native | 本来の・生まれつきの
multilingual | 多言語の
second language | 第二言語
mother tongue | 母語
matter | 内容・事柄
influence | 影響する
inferior | 劣った
rarely | めったに～ない
neither of ～ | どちらの～も…ない
common language | 共通語
varies (vary) | 変わる
linguistic | 言語的な
the majority of ～ | ～の大部分
under the circumstances | その状況下で
serve as ～ | ～として機能する
on many occasions | 多くの場面で
rather than ～ | ～よりもむしろ
equally | 平等に
concept | 概念
confident | 自信がある
actively | 積極的に
canteen | 学食（イギリス英語）
Singapore | シンガポール
Mandarin | 標準的な中国語
Malay | マレー語
Tamil | タミル語
non-native | 非ネイティブ
lingua franca | リンガフランカ（共通語）`,
`issue | 問題
relative(s) | 親戚
boiled | 煮沸された
bottled | ボトル入りの・瓶詰の
avoid | ～を避ける
diarrhea | 下痢
disease | 病気
be shocked to ～ | ～して衝撃を受ける
puddle(s) | 水たまり
access | 手段
injustice | 不公平・不当
work on ～ | ～に取り組む
solve | ～を解決する
scientific | 科学的な・科学の
solution | 解決策・解決方法
method | 方法・手法
purify | 浄化する
fill ～ with ... | ～を…で満たす
harmful | 有害な
germ(s) | 細菌
ecological | 環境にやさしい
experiment(s) | 実験
speed up ～ | ～の速度を上げる
laboratory | 研究室
not always ～ | いつも～とは限らない
purification | 浄化
material | 材料
mixture | 混合
cement | セメント
effective | 効果的
so ～ that ... | とても～なので…
flexible | 柔軟な
container(s) | 入れ物
tank(s) | 容器・槽
improvement(s) | 改善
so that ～ can ... | ～が…できるように
alone | 単独では
drop | しずく
sustain | 維持する・支える
tackle | 立ち向かう
Deepika Kurup | ディーピカ・クルップ（人名）
social injustice | 社会的に不当・不公平なこと
international community | 国際機関
SODIS | 太陽光水殺菌
in the sun | 日なたに
photocatalyst | 光触媒（光を受けて化学反応を促進する物質）
flexibility | 柔軟さ`
];

export const words = lessons.flatMap((lesson, index) =>
  lesson.split("\n").map((line, position) => {
    const [en, ja] = line.split(" | ");
    return { id: `${index + 7}-${position + 1}`, lesson: index + 7, en, ja };
  })
);

export function englishAnswers(word, vocabulary = words) {
  const meanings = word.ja.split("・");
  return vocabulary.filter(entry =>
    entry.ja.split("・").some(meaning => meanings.includes(meaning))
  ).map(entry => entry.en);
}

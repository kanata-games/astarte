# Astarte スプライト

- `astarte.png`: 96×80 × 48フレーム、横1列。透過PNG(alpha 0/255)、黒1px外枠、32色。右向き。
- `astarte.json`: frame_w/h、cx=44, feet_y=78(全フレーム共通の体アンカー)、アニメ別 frames / ms / loop、攻撃判定フレームの hitbox(cx・feet_y 基準。左向きは x を反転)。
- 身長: 耳先まで約62〜63px(外枠込み約64)。

| アニメ | フレーム | 備考 |
|---|---|---|
| idle | 0-3 | loop |
| run | 4-9 | loop |
| jump_rise / jump_apex / fall / land | 10 / 11 / 12 / 13 | 空中もfeet_y基準(高さはゲーム側で移動) |
| roll | 14-19 | 鎌なし(元絵どおり) |
| light1 / light2 / light3 | 20-21 / 22-23 / 24-26 | active: 21 / 23 / 24,25 |
| heavy | 27-32 | 27=溜め、active 28,29 |
| parry | 33-35 | active(受け) 34 |
| hurt | 36-37 | 鎌なし |
| death | 38-41 | 38の剣は刀身を削除(柄のみ残る)。鎌なし |
| rest | 42-43 | 焚き火は削除。鎌なし |
| potion | 44-47 | 鎌なし |

## 補正・注意
- 3枚の元絵は頭の大きさで揃え、あごより下の体を伸縮して等身を統一(make_spec.py の K / KB)。
- はみ出し対策: heavy 27-29 は頭より上の鎌を縦0.6に圧縮、parry 33-35 は前方の鎌先を横0.5に圧縮、death 41(倒れ)は前方を横0.6に圧縮し体を左へ約11pxずらしています(この1枚だけアンカーがずれる)。
- 再生成: `work/build.sh`(差し替え版は raw を替えて `OUT=astarte_pan sh build.sh`)。

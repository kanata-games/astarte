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

## フライパン版 (`astarte_pan.png` / `astarte_pan.json`)
- 同じ 96×80・cx=44・feet_y=78・倍率・JSON形式、49フレーム。hitbox はフライパン本体+衝撃エフェクトの範囲。
- idle 0-3 / run 4-9 / jump_rise 10, jump_apex 11, fall 12, land 13 / roll 14-19(鎌版のロール+描き足した小さいフライパン)
- light1 20-21(叩き+戻り, active 20) / light2 22-23(active 22) / light3 24-26(ジャンプ→叩き下ろし→衝撃, active 25,26)
- heavy 27-32(27-28 のけぞり、29 叩きつけ active、30-32 目回し+星) / parry 33-36(active 34、4枚目も残す)
- hurt 37-38 / death 39-42(フライパンが横に落ちている) / rest 43-44 / potion 45-48
- 攻撃元絵は耳が紺・髪が灰色だったので、`pan_recolor.py` で白髪・白耳に塗り替え。
- death 41-42 は左はみ出し防止で体を約6px右へずらしています。再生成: `work/build_pan.sh`

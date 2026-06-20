# 分析資料

`docs/analysis/` は、ClipBox の分析資料を置く正規ディレクトリです。

## 公開する資料

直下の Markdown だけを git 管理します。現在の公開資料:

- [`ranking_fairness_notes.md`](ranking_fairness_notes.md)
- [`ranking_fairness_round2_summary.md`](ranking_fairness_round2_summary.md)
- [`ranking_bulk_viewing_history_investigation.md`](ranking_bulk_viewing_history_investigation.md)
- [`ranking_fairness_multifactor_next_actions.md`](ranking_fairness_multifactor_next_actions.md)
- [`ranking_app_playback_comparison_findings.md`](ranking_app_playback_comparison_findings.md)

各文書は別の調査目的・前提を持つため、内容を統合せず個別に維持します。

## ローカル専用領域

次のサブディレクトリは `.gitignore` 対象です。動画名、ローカルパス、視聴情報、コピー DB、Notebook outputs を含み得るため、公開リポジトリへ追加しません。

| パス | 用途 |
|---|---|
| `notebooks/` | 実行用 Notebook。outputs を保持してよい |
| `data/` | CSV・JSON・分析コードなどの中間データ |
| `private/` | コピー DB などの機密データ |
| `outputs/` | 画像・表などの生成物 |

ルート直下の `notebooks/` は廃止済みです。旧パス向けの `.gitignore` パターンは、誤って再作成した場合の漏洩防止用に残しています。

Notebook や分析出力を stage する必要がある例外的な変更では、コミット前に次を実行します。

```powershell
python scripts/check_notebook_outputs.py --staged
```

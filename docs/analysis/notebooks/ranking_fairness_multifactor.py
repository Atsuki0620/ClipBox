"""ClipBox ランキング多角分析（候補 C1〜C8）。ローカル専用・実DB無接触。

【設計制約】
- 読み取り専用コピー(`docs/analysis/private/videos_private_*.db`)のみ参照。
  実DB(`data/videos.db`)・`core.database.get_db_connection()` には一切触れない。
- 本番ランキング式(`core/analysis_service.py::get_ranked_videos_for_tab`)を SQL 複製で再現。
- 出力(CSV/対応表)は gitignore 済みの `docs/analysis/{data,private}/` のみ。動画名/パス/出演者は出さない。
【依存関係】 pandas / numpy のみ（scipy 不使用・Spearman 自前実装）。
"""
from __future__ import annotations

import glob
import json
import os
import sqlite3
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[3]  # worktree root
DATA_DIR = ROOT / "docs/analysis/data"
PRIV_DIR = ROOT / "docs/analysis/private"
DATA_DIR.mkdir(parents=True, exist_ok=True)

PRE_AVP = "2026-06-10 00:00:00"  # commit 8bf84fb: AVP 履歴記録(APP_PLAYBACK)開始境界

# 本番 composite 係数（core/analysis_service.py と一致）
A, B, BT1, BT2 = 1, 3, 0.5, 0.3


def db_path() -> str:
    return sorted(glob.glob(str(PRIV_DIR / "videos_private_*.db")))[-1]


def load() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    con = sqlite3.connect(f"file:{db_path()}?mode=ro", uri=True)
    con.execute("PRAGMA query_only=ON")
    vids = pd.read_sql_query(
        "SELECT id, current_favorite_level, storage_location, is_available, is_deleted, "
        "is_selection_completed, file_created_at, last_file_modified, created_at "
        "FROM videos WHERE is_deleted=0",
        con,
    )
    vh = pd.read_sql_query(
        "SELECT id AS row_id, video_id, viewed_at, viewing_method FROM viewing_history", con
    )
    likes = pd.read_sql_query(
        "SELECT video_id, COUNT(*) AS likes FROM likes GROUP BY video_id", con
    )
    con.close()
    return vids, vh, likes


def annotate_history(vh: pd.DataFrame) -> pd.DataFrame:
    vh = vh.copy()
    vh["dt"] = pd.to_datetime(vh["viewed_at"])
    vh["date"] = vh["viewed_at"].str.slice(0, 10)
    vh["pre_avp"] = vh["viewed_at"] < PRE_AVP
    vh["is_app"] = vh["viewing_method"] == "APP_PLAYBACK"
    vh["is_file"] = vh["viewing_method"] == "FILE_ACCESS_DETECTED"

    # exact-timestamp group size
    grp = vh.groupby("viewed_at")["row_id"].transform("size")
    vh["exact_size"] = grp

    # C1: exact>=5 & FILE & pre-AVP
    vh["c1"] = (vh["exact_size"] >= 5) & vh["is_file"] & vh["pre_avp"]
    # C2: exact 2-4 & FILE & pre-AVP
    vh["c2"] = vh["exact_size"].between(2, 4) & vh["is_file"] & vh["pre_avp"]

    # C3: 60s 隣接ギャップクラスター（FILE pre-AVP 限定）。size>=5 / >=10 を別フラグ
    vh["c3_5"] = False
    vh["c3_10"] = False
    fp = vh[vh["is_file"] & vh["pre_avp"]].sort_values("dt")
    if not fp.empty:
        gap = fp["dt"].diff().dt.total_seconds().fillna(1e9)
        cluster_id = (gap > 60).cumsum()
        size = cluster_id.map(cluster_id.value_counts())
        idx5 = fp.index[size.values >= 5]
        idx10 = fp.index[size.values >= 10]
        vh.loc[idx5, "c3_5"] = True
        vh.loc[idx10, "c3_10"] = True
    return vh


def per_video(vh: pd.DataFrame, vids: pd.DataFrame, likes: pd.DataFrame) -> pd.DataFrame:
    g = vh.groupby("video_id")
    agg = pd.DataFrame({
        "view_count": g.size(),
        "view_days": g["date"].nunique(),
        "app_view_days": vh[vh["is_app"]].groupby("video_id")["date"].nunique(),
        "file_view_days": vh[vh["is_file"]].groupby("video_id")["date"].nunique(),
        "c1_view_days": vh[vh["c1"]].groupby("video_id")["date"].nunique(),
        "last_viewed_at": g["viewed_at"].max(),
    })
    df = vids.merge(agg, left_on="id", right_index=True, how="left")
    df = df.merge(likes, left_on="id", right_on="video_id", how="left").drop(columns=["video_id"])
    for c in ["view_count", "view_days", "app_view_days", "file_view_days", "c1_view_days", "likes"]:
        df[c] = df[c].fillna(0).astype(int)
    df["t1"] = (df["current_favorite_level"] >= 0).astype(int)
    df["t2"] = df["is_selection_completed"].fillna(0).astype(int)
    df["suspicious_view_days"] = df["c1_view_days"]
    return df


def composite(view_days, likes, t1, t2):
    base = view_days * A + likes * B
    bonus = 1 + BT1 * t1 + BT2 * t2
    return (base * bonus * 100).round(0).astype(int)


def day_weight_view_days(vh: pd.DataFrame, file_base: float) -> pd.Series:
    """C6: 日重み = その日の行の method 最大重み。APP=1.0 / C1=0 / C3(10)=0.25 / その他FILE=file_base。"""
    w = np.where(vh["is_app"], 1.0,
        np.where(vh["c1"], 0.0,
        np.where(vh["c3_10"], 0.25, file_base)))
    tmp = vh.assign(w=w)
    day_w = tmp.groupby(["video_id", "date"])["w"].max()
    return day_w.groupby("video_id").sum()


def genuine_view_days(vh: pd.DataFrame, exclude_c3: bool) -> pd.Series:
    """C7: bulk 行を除いた distinct-date。exclude_c3=False は C1 のみ除外(=C7a)、True は C1+C3(10)(=C7b)。"""
    mask = ~vh["c1"]
    if exclude_c3:
        mask &= ~vh["c3_10"]
    keep = vh[mask]
    return keep.groupby("video_id")["date"].nunique()


SCOPES = {
    "available_only": lambda d: d[d["is_available"] == 1],
    "all_not_deleted": lambda d: d,
    "c_drive_only": lambda d: d[d["storage_location"] == "C_DRIVE"],
    "external_hdd_only": lambda d: d[d["storage_location"] == "EXTERNAL_HDD"],
}


def rank_table(df: pd.DataFrame, score_col: str) -> pd.DataFrame:
    """score>0 を残し、score DESC → last_viewed_at DESC → id でランク付け（本番タイブレーカー）。"""
    d = df[df[score_col] > 0].copy()
    d["_lv"] = pd.to_datetime(d["last_viewed_at"], errors="coerce")
    d = d.sort_values([score_col, "_lv", "id"], ascending=[False, False, True])
    d = d.reset_index(drop=True)
    d["rank"] = np.arange(1, len(d) + 1)
    return d[["id", score_col, "rank"]]


def spearman(x, y) -> float:
    x = pd.Series(x).rank()
    y = pd.Series(y).rank()
    if len(x) < 2 or x.std() == 0 or y.std() == 0:
        return float("nan")
    return float(np.corrcoef(x, y)[0, 1])


def topn_change(base_rank: pd.DataFrame, cand_rank: pd.DataFrame, n: int):
    """base Top-n のうち cand Top-n から外れた数 + Spearman(base Top-n の rank vs cand rank)。"""
    b = base_rank[base_rank["rank"] <= n]
    cand_map = dict(zip(cand_rank["id"], cand_rank["rank"]))
    miss = len(cand_rank) + 1
    changed = int((~b["id"].isin(cand_rank[cand_rank["rank"] <= n]["id"])).sum())
    xs = b["rank"].tolist()
    ys = [cand_map.get(vid, miss) for vid in b["id"]]
    return changed, spearman(xs, ys)


def build_scores(df: pd.DataFrame) -> dict[str, pd.DataFrame]:
    """候補ごとに per-video score 列を持つ DataFrame を返す（compositeベース＋4種別はbaselineのみ）。"""
    out = {}
    base = df.copy()
    base["composite"] = composite(base["view_days"], base["likes"], base["t1"], base["t2"])
    out["baseline"] = base

    def with_vd(new_vd: pd.Series):
        d = df.copy()
        d["view_days"] = d["id"].map(new_vd).fillna(0)
        d["composite"] = composite(d["view_days"], d["likes"], d["t1"], d["t2"])
        return d

    return out, with_vd


def timestamp_provenance(vh: pd.DataFrame, vids: pd.DataFrame) -> dict:
    """V1/V2/V4/V5: FILE_ACCESS の viewed_at(=st_atime) が videos の file_created_at(st_ctime)/
    last_file_modified(st_mtime)/created_at(DB挿入時刻) とどれだけ一致するかを実証する。
    返すのは集計値（割合・件数・中央値）のみ。生 timestamp/パス/動画名は一切出さない。"""
    v = vids[["id", "file_created_at", "last_file_modified", "created_at"]].copy()
    m = vh.merge(v, left_on="video_id", right_on="id", how="left")
    for c in ["file_created_at", "last_file_modified", "created_at"]:
        m[c + "_dt"] = pd.to_datetime(m[c], errors="coerce")

    def match_block(sub: pd.DataFrame, ref: str) -> dict:
        s = sub[sub[ref].notna()]
        n = len(s)
        if n == 0:
            return {"n": 0}
        same_date = (s["dt"].dt.normalize() == s[ref].dt.normalize())
        delta_days = (s["dt"] - s[ref]).abs().dt.total_seconds() / 86400.0
        return {
            "n": int(n),
            "same_date_pct": round(100 * float(same_date.mean()), 1),
            "within_1d_pct": round(100 * float((delta_days <= 1).mean()), 1),
            "within_7d_pct": round(100 * float((delta_days <= 7).mean()), 1),
            "median_abs_delta_days": round(float(delta_days.median()), 2),
        }

    file_rows = m[m["is_file"]]
    app_rows = m[m["is_app"]]

    def concentration(sub: pd.DataFrame) -> dict:
        vc = sub["date"].value_counts()
        tot = int(vc.sum())
        if tot == 0:
            return {"rows": 0}
        return {
            "rows": tot,
            "distinct_days": int(len(vc)),
            "top1_day_pct": round(100 * int(vc.iloc[0]) / tot, 1),
            "top5_days_pct": round(100 * int(vc.head(5).sum()) / tot, 1),
            "top10_days_pct": round(100 * int(vc.head(10).sum()) / tot, 1),
        }

    fdt = file_rows["dt"]
    granularity = {
        "rows": int(len(fdt)),
        "whole_minute_pct": round(100 * float((fdt.dt.second == 0).mean()), 1),
        "midnight_pct": round(100 * float(((fdt.dt.hour == 0) & (fdt.dt.minute == 0)
                                           & (fdt.dt.second == 0)).mean()), 1),
        "distinct_hms": int(fdt.dt.strftime("%H:%M:%S").nunique()),
    }
    return {
        "v1_file_vs_file_created_at": match_block(file_rows, "file_created_at_dt"),
        "v1_file_vs_last_file_modified": match_block(file_rows, "last_file_modified_dt"),
        "v1_file_vs_created_at": match_block(file_rows, "created_at_dt"),
        "v5_app_vs_file_created_at": match_block(app_rows, "file_created_at_dt"),
        "v5_app_vs_last_file_modified": match_block(app_rows, "last_file_modified_dt"),
        "v4_file_date_concentration": concentration(file_rows),
        "v4_app_date_concentration": concentration(app_rows),
        "v2_file_time_granularity": granularity,
    }


def c1_group_cohesion(vh: pd.DataFrame) -> dict:
    """V3: C1(完全一致>=5 & FILE & pre-AVP) 各グループのメンバーが同一 storage / 同一フォルダかを
    件数のみ集計する。current_full_path は局所利用のみで一切出力しない（真偽の件数だけ返す）。"""
    c1 = vh[vh["c1"]][["viewed_at", "video_id"]].copy()
    if c1.empty:
        return {"groups": 0}
    con = sqlite3.connect(f"file:{db_path()}?mode=ro", uri=True)
    con.execute("PRAGMA query_only=ON")
    vid_ids = sorted(int(x) for x in c1["video_id"].unique())
    qmarks = ",".join("?" * len(vid_ids))
    paths = pd.read_sql_query(
        f"SELECT id, current_full_path, storage_location FROM videos WHERE id IN ({qmarks})",
        con, params=vid_ids,
    )
    con.close()
    parent = {r.id: os.path.dirname(str(r.current_full_path)) for r in paths.itertuples()}
    storage = {r.id: r.storage_location for r in paths.itertuples()}
    single_folder = single_storage = 0
    groups = c1.groupby("viewed_at")["video_id"].apply(list)
    for members in groups:
        if len({parent.get(v) for v in members}) == 1:
            single_folder += 1
        if len({storage.get(v) for v in members}) == 1:
            single_storage += 1
    return {
        "groups": int(len(groups)),
        "single_folder_groups": int(single_folder),
        "single_storage_groups": int(single_storage),
    }


def main():
    vids, vh, likes = load()
    vh = annotate_history(vh)
    df = per_video(vh, vids, likes)

    # baseline 4 種別スコア
    df["composite"] = composite(df["view_days"], df["likes"], df["t1"], df["t2"])
    df["likes_score"] = df["likes"]

    # 候補別の行除外マスク（True=ランキング集計から外す行）
    rm_masks = {
        "C1": vh["c1"],
        "C4_C5": vh["is_file"],          # APP only == FILE全除外(MANUAL=0)
        "C7b": vh["c1"] | vh["c3_10"],
    }

    # 候補別 view_days 再計算
    new_vd = {
        "C1": vh[~vh["c1"]].groupby("video_id")["date"].nunique(),
        "C4_C5": vh[vh["is_app"]].groupby("video_id")["date"].nunique(),  # APP only == FILE全除外(MANUAL=0)
        "C6_025": day_weight_view_days(vh, 0.25),
        "C6_050": day_weight_view_days(vh, 0.50),
        "C7a": genuine_view_days(vh, exclude_c3=False),
        "C7b": genuine_view_days(vh, exclude_c3=True),
    }
    # 候補別 view_count 再計算（行除外後の COUNT(*)）
    new_vc = {k: vh[~m].groupby("video_id").size() for k, m in rm_masks.items()}

    def cand_df(vd_series):
        d = df.copy()
        d["view_days_cand"] = d["id"].map(vd_series).fillna(0).astype(float)
        d["composite"] = composite(d["view_days_cand"], d["likes"], d["t1"], d["t2"])
        return d

    candidates = {k: cand_df(v) for k, v in new_vd.items()}

    # ---- Table 2: scope x ranking_type の Top50/Top100 入替・Spearman（headline=C1除外 と APP-only）----
    type_cols = {"view_count": "view_count", "view_days": "view_days",
                 "likes": "likes_score", "composite": "composite"}
    table2_rows = []
    compare_list = [("C1", candidates["C1"]), ("C4_C5", candidates["C4_C5"]),
                    ("C6_025", candidates["C6_025"]), ("C6_050", candidates["C6_050"]),
                    ("C7a", candidates["C7a"]), ("C7b", candidates["C7b"])]
    for cand_name, cand_full in compare_list:
        for scope_name, scope_fn in SCOPES.items():
            base_s = scope_fn(df)
            cand_s = scope_fn(cand_full)
            for tname, col in type_cols.items():
                if tname == "composite":
                    br = rank_table(base_s, "composite")
                    cr = rank_table(cand_s, "composite")
                elif tname == "view_days":
                    br = rank_table(base_s, "view_days")
                    # 候補の view_days は cand_full の view_days_cand
                    cs2 = cand_s.copy(); cs2["view_days"] = cs2["view_days_cand"]
                    cr = rank_table(cs2, "view_days")
                elif tname == "view_count":
                    br = rank_table(base_s, "view_count")
                    if cand_name in new_vc:  # 行除外候補は view_count も変化
                        cs2 = cand_s.copy()
                        cs2["view_count"] = cs2["id"].map(new_vc[cand_name]).fillna(0).astype(int)
                        cr = rank_table(cs2, "view_count")
                    else:  # C6 重み下げは raw count 不変
                        cr = br
                else:
                    br = rank_table(base_s, col)
                    cr = br  # likes は候補で不変
                c50, s100 = topn_change(br, cr, 50)
                c100, _ = topn_change(br, cr, 100)
                table2_rows.append({
                    "candidate": cand_name, "scope": scope_name, "ranking_type": tname,
                    "top50_changed": c50, "top100_changed": c100,
                    "spearman_top100": round(s100, 4),
                })
    table2 = pd.DataFrame(table2_rows)
    table2.to_csv(DATA_DIR / "table2_ranking_impact.csv", index=False)

    # ---- Table 1: 候補ルール比較（headline scope = all_not_deleted, type=composite）----
    def rowset_stats(mask_col):
        rows = vh[vh[mask_col]]
        return {
            "target_rows": int(len(rows)),
            "target_unique_videos": int(rows["video_id"].nunique()),
            "app_rows": int(rows["is_app"].sum()),
            "file_access_rows": int(rows["is_file"].sum()),
            "pre_avp_rows": int(rows["pre_avp"].sum()),
        }

    # 各候補の row-set（ランキングから外す対象行）
    vh["c4_c5_rm"] = vh["is_file"]  # APP-only にする＝FILE行を落とす
    vh["c7a_rm"] = vh["c1"]
    vh["c7b_rm"] = vh["c1"] | vh["c3_10"]

    cand_meta = {
        "C1": ("EXACT_TIMESTAMP_GE5_LEGACY_FILE_ACCESS", "c1", "C1"),
        "C2": ("EXACT_2_4_FILE_ACCESS_PRE_AVP(audit)", "c2", None),
        "C3_5": ("SHORT_CLUSTER_60S_GE5(audit)", "c3_5", None),
        "C3_10": ("SHORT_CLUSTER_60S_GE10(audit)", "c3_10", None),
        "C4_C5": ("APP_PLAYBACK_ONLY / EXCLUDE_FILE_ACCESS", "c4_c5_rm", "C4_C5"),
        "C7a": ("GENUINE_VIEW_DAYS_C1_ONLY", "c7a_rm", "C7a"),
        "C7b": ("GENUINE_VIEW_DAYS_C1_PLUS_C3", "c7b_rm", "C7b"),
    }
    table1_rows = []
    headline_scope = SCOPES["all_not_deleted"]
    base_rank_all = rank_table(headline_scope(df), "composite")
    for cid, (name, mask_col, cand_key) in cand_meta.items():
        st = rowset_stats(mask_col)
        if cand_key is not None:
            cr = rank_table(headline_scope(candidates[cand_key]), "composite")
            c50, s100 = topn_change(base_rank_all, cr, 50)
            c100, _ = topn_change(base_rank_all, cr, 100)
        else:
            c50 = c100 = ""; s100 = ""
        table1_rows.append({"candidate_id": cid, "candidate_name": name, **st,
                            "top50_changed(all)": c50, "top100_changed(all)": c100,
                            "spearman_top100(all)": (round(s100, 4) if s100 != "" else "")})
    table1 = pd.DataFrame(table1_rows)
    table1.to_csv(DATA_DIR / "table1_candidate_compare.csv", index=False)

    # ---- 匿名 ID 対応表（baseline composite all_not_deleted 順）----
    anon = base_rank_all.copy()
    anon["anon_id"] = ["V%03d" % i for i in range(1, len(anon) + 1)]
    anon_map = dict(zip(anon["id"], anon["anon_id"]))
    anon[["id", "anon_id", "composite", "rank"]].to_csv(PRIV_DIR / "anon_id_map.csv", index=False)

    # ---- Table 3: Top50 寄与分解（anon, all_not_deleted, C1適用時の rank 変化）----
    c1_rank_all = rank_table(headline_scope(candidates["C1"]), "composite")
    c1_rank_map = dict(zip(c1_rank_all["id"], c1_rank_all["rank"]))
    top = base_rank_all[base_rank_all["rank"] <= 50].merge(df, on="id")
    t3 = []
    for _, r in top.iterrows():
        new_rank = c1_rank_map.get(r["id"], len(c1_rank_all) + 1)
        t3.append({
            "anon_id": anon_map[r["id"]],
            "current_rank": int(r["rank"]),
            "current_score": int(r["composite_x"] if "composite_x" in r else r["composite"]),
            "app_view_days": int(r["app_view_days"]),
            "file_access_view_days": int(r["file_view_days"]),
            "suspicious_view_days": int(r["suspicious_view_days"]),
            "likes": int(r["likes"]),
            "tier1_flag": int(r["t1"]),
            "tier2_flag": int(r["t2"]),
            "storage_bucket": r["storage_location"],
            "available_flag": int(r["is_available"]),
            "proposed_rank_change": int(new_rank - r["rank"]),
        })
    table3 = pd.DataFrame(t3)
    table3.to_csv(DATA_DIR / "table3_top50_decomp.csv", index=False)

    # ---- Table 5: timestamp provenance 検証 (V1-V5) ----
    provenance = timestamp_provenance(vh, vids)
    provenance["v3_c1_group_cohesion"] = c1_group_cohesion(vh)
    prov_rows = []
    for metric, blk in provenance.items():
        for key, val in blk.items():
            prov_rows.append({"metric": metric, "key": key, "value": val})
    pd.DataFrame(prov_rows).to_csv(DATA_DIR / "table5_timestamp_provenance.csv", index=False)

    # ---- サマリ JSON（レポート転記用）----
    summary = {
        "db_rows": {
            "videos_not_deleted": int(len(df)),
            "viewing_history": int(len(vh)),
            "app_rows": int(vh["is_app"].sum()),
            "file_rows": int(vh["is_file"].sum()),
            "post_avp_rows": int((~vh["pre_avp"]).sum()),
            "post_avp_app_rows": int(((~vh["pre_avp"]) & vh["is_app"]).sum()),
            "pre_avp_app_rows": int((vh["pre_avp"] & vh["is_app"]).sum()),
            "likes_videos": int(len(likes)),
        },
        "scope_sizes": {k: int(len(fn(df))) for k, fn in SCOPES.items()},
        "scope_sizes_scored": {k: int((fn(df)["composite"] > 0).sum()) for k, fn in SCOPES.items()},
        "c1_storage": vh[vh["c1"]].merge(vids, left_on="video_id", right_on="id")
                        ["storage_location"].value_counts().to_dict(),
        "c1_groups": int(vh[vh["c1"]]["viewed_at"].nunique()),
        "exact_ge5_size_hist": vh[vh["exact_size"] >= 5].groupby("viewed_at").size().value_counts().to_dict(),
        "c3_10_rows": int(vh["c3_10"].sum()),
        "c3_10_pct": round(100 * vh["c3_10"].sum() / len(vh), 1),
        "timestamp_provenance": provenance,
        "table1": table1_rows,
    }
    (DATA_DIR / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False, default=str), encoding="utf-8")

    pd.set_option("display.width", 200); pd.set_option("display.max_columns", 40)
    print("=== SUMMARY ===")
    print(json.dumps(summary["db_rows"], indent=2, ensure_ascii=False))
    print("scope sizes:", summary["scope_sizes"])
    print("scope scored:", summary["scope_sizes_scored"])
    print("c1 storage:", summary["c1_storage"], "groups:", summary["c1_groups"])
    print("exact>=5 group-size hist:", summary["exact_ge5_size_hist"])
    print("c3_10 rows:", summary["c3_10_rows"], f"({summary['c3_10_pct']}%)")
    print("\n=== TABLE 1 ===")
    print(table1.to_string(index=False))
    print("\n=== TABLE 2 (composite only) ===")
    print(table2[table2["ranking_type"] == "composite"].to_string(index=False))
    print("\n=== TABLE 2 (view_days only) ===")
    print(table2[table2["ranking_type"] == "view_days"].to_string(index=False))
    print("\n=== TABLE 3 head (Top15) ===")
    print(table3.head(15).to_string(index=False))
    print("\nTable3 proposed_rank_change nonzero count:", int((table3["proposed_rank_change"] != 0).sum()))
    print("\n=== TIMESTAMP PROVENANCE (V1-V5) ===")
    print(json.dumps(provenance, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

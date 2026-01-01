"""
ClipBox - スキャナーモジュールのテスト
"""

import pytest
from core.scanner import extract_essential_filename


def test_extract_essential_filename_with_triple_sharp():
    """プレフィックス###付きファイル名の抽出"""
    level, essential = extract_essential_filename("###_作品名.mp4")
    assert level == 3
    assert essential == "作品名.mp4"


def test_extract_essential_filename_with_double_sharp():
    """プレフィックス##付きファイル名の抽出"""
    level, essential = extract_essential_filename("##_作品名.mp4")
    assert level == 2
    assert essential == "作品名.mp4"


def test_extract_essential_filename_with_single_sharp():
    """プレフィックス#付きファイル名の抽出"""
    level, essential = extract_essential_filename("#_作品名.mp4")
    assert level == 1
    assert essential == "作品名.mp4"


def test_extract_essential_filename_with_underscore_only():
    """プレフィックス_のみのファイル名の抽出"""
    level, essential = extract_essential_filename("_作品名.mp4")
    assert level == 0
    assert essential == "作品名.mp4"


def test_extract_essential_filename_without_prefix():
    """プレフィックスなしファイル名の抽出"""
    level, essential = extract_essential_filename("作品名.mp4")
    assert level == 0
    assert essential == "作品名.mp4"


def test_extract_essential_filename_with_complex_name():
    """複雑なファイル名の抽出"""
    level, essential = extract_essential_filename("###_【俳優A】作品タイトル_Part1.mp4")
    assert level == 3
    assert essential == "【俳優A】作品タイトル_Part1.mp4"

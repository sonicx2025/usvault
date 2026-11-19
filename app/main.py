"""超声影像库 (UsVault) - 后端服务

单用户 Web / PWA 应用：记录超声图片(jpg)与视频(mp4)，支持多条件检索。
所有数据（数据库 + 原始文件 + 缩略图）都保存在 DATA_DIR 下，部署时将其映射到 NAS 目录。
"""
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import shutil
import sqlite3
import subprocess
import threading
import time
import uuid
from contextlib import contextmanager
from datetime import date, datetime
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageOps

# ---------------------------------------------------------------- 配置
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("DATA_DIR", BASE_DIR.parent / "data")).resolve()
MEDIA_DIR = DATA_DIR / "media"
THUMB_DIR = DATA_DIR / "thumbs"
TRASH_DIR = DATA_DIR / "trash"
WEB_DIR = DATA_DIR / "web"          # 转码后的浏览器可播放副本
DB_PATH = DATA_DIR / "usvault.db"
APP_PASSWORD = os.environ.get("APP_PASSWORD", "admin")
FFMPEG = os.environ.get("FFMPEG", shutil.which("ffmpeg") or "")
FFPROBE = os.environ.get("FFPROBE", shutil.which("ffprobe") or "")
COOKIE = "usv_session"
SESSION_DAYS = 30

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".webm"}
BROWSER_CODECS = {"h264", "vp8", "vp9", "av1"}   # 主流浏览器都能直接播放的视频编码

for d in (MEDIA_DIR, THUMB_DIR, TRASH_DIR, WEB_DIR):
    d.mkdir(parents=True, exist_ok=True)

_secret_file = DATA_DIR / ".secret"
if not _secret_file.exists():
    _secret_file.write_text(secrets.token_hex(32))
SECRET = _secret_file.read_text().strip().encode()

# ---------------------------------------------------------------- 数据库
SCHEMA = """
CREATE TABLE IF NOT EXISTS records(
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_date    TEXT NOT NULL,
    title        TEXT DEFAULT '',
    body_part    TEXT DEFAULT '',
    patient_name TEXT DEFAULT '',
    patient_id   TEXT DEFAULT '',
    sex          TEXT DEFAULT '',
    age          TEXT DEFAULT '',
    diagnosis    TEXT DEFAULT '',
    notes        TEXT DEFAULT '',
    created_at   TEXT,
    updated_at   TEXT
);
CREATE TABLE IF NOT EXISTS record_tags(
    record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
    tag       TEXT NOT NULL,
    PRIMARY KEY(record_id, tag)
);
CREATE TABLE IF NOT EXISTS files(
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id  INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
    orig_name  TEXT,
    rel_path   TEXT NOT NULL,
    kind       TEXT NOT NULL,          -- image | video
    mime       TEXT,
    size       INTEGER,
    width      INTEGER,
    height     INTEGER,
    duration   REAL,
    has_thumb  INTEGER DEFAULT 0,
    sort       INTEGER DEFAULT 0,
    created_at TEXT
);
CREATE TABLE IF NOT EXISTS field_defs(
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    label       TEXT NOT NULL,
    type        TEXT NOT NULL,          -- text|textarea|number|date|select|multiselect|checkbox
    options     TEXT DEFAULT '[]',      -- 下拉选项 JSON 数组
    unit        TEXT DEFAULT '',
    show_in_card INTEGER DEFAULT 0,
    filterable  INTEGER DEFAULT 1,
    active      INTEGER DEFAULT 1,
    sort        INTEGER DEFAULT 0,
    created_at  TEXT
);
CREATE TABLE IF NOT EXISTS settings(
    key   TEXT PRIMARY KEY,
    value TEXT
);
CREATE INDEX IF NOT EXISTS idx_records_date ON records(exam_date);
CREATE INDEX IF NOT EXISTS idx_records_part ON records(body_part);
CREATE INDEX IF NOT EXISTS idx_files_record ON files(record_id);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON record_tags(tag);
"""

RECORD_FIELDS = ["exam_date", "title", "body_part", "patient_name", "patient_id",
                 "sex", "age", "diagnosis", "notes"]


@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


with db() as _c:
    _c.execute("PRAGMA journal_mode=WAL")
    _c.executescript(SCHEMA)
    _cols = {r[1] for r in _c.execute("PRAGMA table_info(files)")}
    for _col in ("codec", "web_path", "web_status"):
        if _col not in _cols:
            _c.execute(f"ALTER TABLE files ADD COLUMN {_col} TEXT DEFAULT ''")
    if "extra" not in {r[1] for r in _c.execute("PRAGMA table_info(records)")}:
        _c.execute("ALTER TABLE records ADD COLUMN extra TEXT DEFAULT '{}'")


def now_str() -> str:
    return datetime.now().isoformat(timespec="seconds")


# ---------------------------------------------------------------- 认证
def _sign(exp: int) -> str:
    pw = hashlib.sha256(APP_PASSWORD.encode()).hexdigest()
    return hmac.new(SECRET, f"{exp}:{pw}".encode(), hashlib.sha256).hexdigest()


def make_token() -> str:
    exp = int(time.time()) + SESSION_DAYS * 86400
    return f"{exp}.{_sign(exp)}"


def check_token(token: Optional[str]) -> bool:
    if not token or "." not in token:
        return False
    exp_s, sig = token.split(".", 1)
    try:
        exp = int(exp_s)
    except ValueError:
        return False
    return exp > time.time() and hmac.compare_digest(sig, _sign(exp))


app = FastAPI(title="超声影像库", docs_url=None, redoc_url=None)

PUBLIC_API = {"/api/login", "/api/logout", "/api/me"}


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path
    protected = (path.startswith("/api/") and path not in PUBLIC_API) \
        or path.startswith("/media/") or path.startswith("/thumb/")
    if protected and not check_token(request.cookies.get(COOKIE)):
        return JSONResponse({"detail": "未登录"}, status_code=401)
    return await call_next(request)


@app.post("/api/login")
async def login(request: Request):
    body = await request.json()
    if not hmac.compare_digest(str(body.get("password", "")), APP_PASSWORD):
        time.sleep(1)
        raise HTTPException(401, "密码错误")
    resp = JSONResponse({"ok": True})
    resp.set_cookie(COOKIE, make_token(), max_age=SESSION_DAYS * 86400,
                    httponly=True, samesite="lax")
    return resp


@app.post("/api/logout")
def logout():
    resp = JSONResponse({"ok": True})
    resp.delete_cookie(COOKIE)
    return resp


@app.get("/api/me")
def me(request: Request):
    return {"logged_in": check_token(request.cookies.get(COOKIE)),
            "default_password": APP_PASSWORD == "admin"}


# ---------------------------------------------------------------- 工具函数
def parse_tags(raw) -> List[str]:
    if isinstance(raw, list):
        items = raw
    else:
        items = re.split(r"[,，;；\s]+", str(raw or ""))
    out = []
    for t in items:
        t = str(t).strip().lstrip("#")
        if t and t not in out:
            out.append(t[:40])
    return out


def clean_meta(meta: dict) -> dict:
    out = {}
    for k in RECORD_FIELDS:
        if k in meta:
            out[k] = str(meta.get(k) or "").strip()
    if "exam_date" in out:
        try:
            date.fromisoformat(out["exam_date"])
        except ValueError:
            out["exam_date"] = date.today().isoformat()
    return out


def safe_name(name: str) -> str:
    name = Path(name or "file").name
    name = re.sub(r"[\\/:*?\"<>|\x00-\x1f]", "_", name).strip() or "file"
    return name[-120:]


def probe_video(path: Path) -> dict:
    if not FFPROBE:
        return {}
    try:
        out = subprocess.run(
            [FFPROBE, "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=codec_name,width,height:format=duration",
             "-of", "json", str(path)],
            capture_output=True, timeout=30, check=True).stdout
        info = json.loads(out)
        st = (info.get("streams") or [{}])[0]
        return {"width": st.get("width"), "height": st.get("height"), "codec": st.get("codec_name"),
                "duration": float(info.get("format", {}).get("duration") or 0) or None}
    except Exception:
        return {}


def make_thumb(file_id: int, path: Path, kind: str) -> bool:
    out = THUMB_DIR / f"{file_id}.jpg"
    try:
        if kind == "image":
            with Image.open(path) as im:
                im = ImageOps.exif_transpose(im)
                im.thumbnail((480, 480))
                im.convert("RGB").save(out, "JPEG", quality=82)
            return True
        if kind == "video" and FFMPEG:
            for ss in ("1", "0"):
                r = subprocess.run(
                    [FFMPEG, "-y", "-loglevel", "error", "-ss", ss, "-i", str(path),
                     "-frames:v", "1", "-vf", "scale=480:-2", str(out)],
                    capture_output=True, timeout=60)
                if r.returncode == 0 and out.exists() and out.stat().st_size > 0:
                    return True
    except Exception:
        pass
    return False


# ---------------------------------------------------------------- 自定义字段
FIELD_TYPES = {"text", "textarea", "number", "date", "select", "multiselect", "checkbox"}
# 内置字段：可以改显示名称、可以隐藏（检查日期固定不可隐藏）
BUILTIN_FIELDS = [("title", "标题"), ("body_part", "检查部位"), ("patient_name", "患者姓名"),
                  ("patient_id", "患者ID / 检查号"), ("sex", "性别"), ("age", "年龄"),
                  ("diagnosis", "超声诊断 / 提示"), ("tags", "标签"), ("notes", "备注")]


def field_row(r) -> dict:
    d = dict(r)
    d["key"] = f"f{d['id']}"
    d["options"] = json.loads(d.get("options") or "[]")
    for k in ("show_in_card", "filterable", "active"):
        d[k] = bool(d[k])
    return d


def load_fields(conn, active_only=False) -> List[dict]:
    sql = "SELECT * FROM field_defs" + (" WHERE active=1" if active_only else "") + " ORDER BY sort, id"
    return [field_row(r) for r in conn.execute(sql)]


def builtin_settings(conn) -> List[dict]:
    row = conn.execute("SELECT value FROM settings WHERE key='builtin_fields'").fetchone()
    saved = json.loads(row[0]) if row else {}
    return [{"key": k, "default_label": lbl, "label": (saved.get(k) or {}).get("label") or lbl,
             "hidden": bool((saved.get(k) or {}).get("hidden"))} for k, lbl in BUILTIN_FIELDS]


def clean_value(f: dict, v):
    """按字段类型校验/规范化值；返回 None 表示清空。"""
    t = f["type"]
    if v is None or v == "" or v == []:
        return None
    if t in ("text", "textarea", "select"):
        return str(v).strip()[:5000] or None
    if t == "number":
        try:
            n = float(str(v).strip())
        except ValueError:
            raise HTTPException(400, f"「{f['label']}」需要填写数字")
        return int(n) if n.is_integer() else n
    if t == "date":
        try:
            return date.fromisoformat(str(v).strip()).isoformat()
        except ValueError:
            raise HTTPException(400, f"「{f['label']}」日期格式错误")
    if t == "multiselect":
        items = v if isinstance(v, list) else re.split(r"[,，]", str(v))
        items = [str(x).strip() for x in items if str(x).strip()]
        return list(dict.fromkeys(items)) or None
    if t == "checkbox":
        return True if v in (True, 1, "1", "true", "on", "是") else None
    return None


def merge_extra(conn, incoming, existing: Optional[dict] = None) -> str:
    """把提交的自定义字段值合并进已有数据。未提交的字段（含已停用字段）保持不变。"""
    out = dict(existing or {})
    if isinstance(incoming, dict):
        for f in load_fields(conn):
            if f["key"] in incoming:
                v = clean_value(f, incoming[f["key"]])
                if v is None:
                    out.pop(f["key"], None)
                else:
                    out[f["key"]] = v
    return json.dumps(out, ensure_ascii=False)


def parse_extra(s) -> dict:
    try:
        return json.loads(s or "{}")
    except json.JSONDecodeError:
        return {}


def field_payload(body: dict, partial=False) -> dict:
    d = {}
    if "label" in body or not partial:
        d["label"] = str(body.get("label") or "").strip()[:60]
        if not d["label"]:
            raise HTTPException(400, "字段名称不能为空")
    if "type" in body or not partial:
        d["type"] = body.get("type") or "text"
        if d["type"] not in FIELD_TYPES:
            raise HTTPException(400, "字段类型无效")
    if "options" in body:
        opts = body["options"]
        if isinstance(opts, str):
            opts = opts.splitlines()
        d["options"] = json.dumps(list(dict.fromkeys(
            str(o).strip() for o in opts if str(o).strip())), ensure_ascii=False)
    for k in ("unit",):
        if k in body:
            d[k] = str(body[k] or "").strip()[:20]
    for k in ("show_in_card", "filterable", "active"):
        if k in body:
            d[k] = 1 if body[k] else 0
    return d


@app.get("/api/fields")
def get_fields():
    with db() as conn:
        return {"builtin": builtin_settings(conn), "custom": load_fields(conn)}


@app.post("/api/fields")
async def create_field(request: Request):
    d = field_payload(await request.json())
    with db() as conn:
        d["sort"] = conn.execute("SELECT COALESCE(MAX(sort),0)+1 FROM field_defs").fetchone()[0]
        d["created_at"] = now_str()
        cur = conn.execute(f"INSERT INTO field_defs({','.join(d)}) VALUES ({','.join('?' * len(d))})",
                           list(d.values()))
        return field_row(conn.execute("SELECT * FROM field_defs WHERE id=?", (cur.lastrowid,)).fetchone())


@app.put("/api/fields/{field_id:int}")
async def update_field(field_id: int, request: Request):
    body = await request.json()
    d = field_payload(body, partial=True)
    with db() as conn:
        old = conn.execute("SELECT * FROM field_defs WHERE id=?", (field_id,)).fetchone()
        if not old:
            raise HTTPException(404, "字段不存在")
        if d:
            conn.execute(f"UPDATE field_defs SET {', '.join(k + '=?' for k in d)} WHERE id=?",
                         list(d.values()) + [field_id])
        # 下拉选项改名：同步更新已有记录里的值
        renames = {str(a): str(b).strip() for a, b in (body.get("renames") or {}).items()
                   if str(b).strip() and str(a) != str(b).strip()}
        if renames:
            key = f"f{field_id}"
            for r in conn.execute("SELECT id, extra FROM records WHERE json_extract(extra, ?) IS NOT NULL",
                                  (f"$.{key}",)).fetchall():
                ex = parse_extra(r["extra"])
                v = ex.get(key)
                if isinstance(v, list):
                    ex[key] = list(dict.fromkeys(renames.get(x, x) for x in v))
                elif isinstance(v, str):
                    ex[key] = renames.get(v, v)
                conn.execute("UPDATE records SET extra=? WHERE id=?",
                             (json.dumps(ex, ensure_ascii=False), r["id"]))
        return field_row(conn.execute("SELECT * FROM field_defs WHERE id=?", (field_id,)).fetchone())


@app.delete("/api/fields/{field_id:int}")
def delete_field(field_id: int, purge: int = 0):
    """删除字段定义。purge=1 时同时清除所有记录中该字段的数据。"""
    with db() as conn:
        conn.execute("DELETE FROM field_defs WHERE id=?", (field_id,))
        if purge:
            conn.execute("UPDATE records SET extra=json_remove(extra, ?) WHERE extra IS NOT NULL",
                         (f"$.f{field_id}",))
    return {"ok": True}


@app.post("/api/fields/order")
async def order_fields(request: Request):
    ids = (await request.json()).get("ids") or []
    with db() as conn:
        conn.executemany("UPDATE field_defs SET sort=? WHERE id=?",
                         [(i + 1, int(fid)) for i, fid in enumerate(ids)])
    return {"ok": True}


@app.put("/api/fields/builtin")
async def update_builtin(request: Request):
    body = await request.json()
    valid = dict(BUILTIN_FIELDS)
    saved = {k: {"label": str(v.get("label") or "").strip()[:60], "hidden": bool(v.get("hidden"))}
             for k, v in body.items() if k in valid and isinstance(v, dict)}
    with db() as conn:
        conn.execute("INSERT OR REPLACE INTO settings(key, value) VALUES ('builtin_fields', ?)",
                     (json.dumps(saved, ensure_ascii=False),))
        return builtin_settings(conn)


# ---------------------------------------------------------------- 视频转码（后台线程）
def _pick_encoder() -> List[str]:
    if not FFMPEG:
        return []
    try:
        enc = subprocess.run([FFMPEG, "-hide_banner", "-encoders"], capture_output=True,
                             text=True, timeout=20).stdout
    except Exception:
        return []
    candidates = [
        ("libx264", ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20"]),
        ("h264_videotoolbox", ["-c:v", "h264_videotoolbox", "-b:v", "6M"]),
        ("libopenh264", ["-c:v", "libopenh264", "-b:v", "6M"]),
    ]
    for name, args in candidates:
        if f" {name} " not in enc:
            continue
        # 实际试编码一小段，确认编码器可用
        r = subprocess.run([FFMPEG, "-loglevel", "error", "-f", "lavfi", "-i",
                            "testsrc=duration=0.2:size=320x240:rate=10", *args,
                            "-pix_fmt", "yuv420p", "-f", "null", "-"],
                           capture_output=True, timeout=30)
        if r.returncode == 0:
            return args
    return []


H264_ENC = _pick_encoder()
_wake = threading.Event()


def needs_transcode(codec: Optional[str], ext: str) -> bool:
    if not H264_ENC:
        return False
    if not codec:          # 无法识别编码时也尝试转码
        return True
    return codec not in BROWSER_CODECS or (codec != "h264" and ext != ".webm")


def transcode(file_id: int, src: Path) -> Optional[str]:
    out = WEB_DIR / f"{file_id}.mp4"
    tmp = WEB_DIR / f"{file_id}.part.mp4"
    cmd = [FFMPEG, "-y", "-loglevel", "error", "-i", str(src), *H264_ENC,
           "-pix_fmt", "yuv420p", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
           "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(tmp)]
    r = subprocess.run(cmd, capture_output=True, timeout=3600)
    if r.returncode == 0 and tmp.exists() and tmp.stat().st_size > 0:
        tmp.replace(out)
        return out.name
    tmp.unlink(missing_ok=True)
    return None


def transcode_worker():
    while True:
        with db() as conn:
            job = conn.execute("SELECT id, rel_path FROM files WHERE web_status='pending'"
                               " ORDER BY id LIMIT 1").fetchone()
        if not job:
            _wake.wait(60)
            _wake.clear()
            continue
        try:
            name = transcode(job["id"], MEDIA_DIR / job["rel_path"])
        except Exception:
            name = None
        with db() as conn:
            conn.execute("UPDATE files SET web_status=?, web_path=? WHERE id=?",
                         ("done" if name else "failed", name or "", job["id"]))


if H264_ENC:
    threading.Thread(target=transcode_worker, daemon=True).start()


def save_uploads(conn: sqlite3.Connection, record_id: int, exam_date: str,
                 uploads: List[UploadFile]) -> List[int]:
    ids = []
    sort_base = conn.execute("SELECT COALESCE(MAX(sort),0) FROM files WHERE record_id=?",
                             (record_id,)).fetchone()[0]
    for i, up in enumerate(uploads):
        if not up or not up.filename:
            continue
        ext = Path(up.filename).suffix.lower()
        if ext in IMAGE_EXT:
            kind = "image"
        elif ext in VIDEO_EXT:
            kind = "video"
        else:
            raise HTTPException(400, f"不支持的文件类型：{up.filename}")
        y, m = exam_date[:4], exam_date[5:7]
        rel = Path(y) / m / f"R{record_id:06d}" / f"{uuid.uuid4().hex[:8]}_{safe_name(up.filename)}"
        dest = MEDIA_DIR / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as f:
            shutil.copyfileobj(up.file, f, 1024 * 1024)
        mime = up.content_type or mimetypes.guess_type(up.filename)[0] or ""
        if not mime or mime == "application/octet-stream":
            mime = mimetypes.guess_type(up.filename)[0] or ""
        info = {}
        if kind == "image":
            try:
                with Image.open(dest) as im:
                    im = ImageOps.exif_transpose(im)
                    info = {"width": im.width, "height": im.height}
            except Exception:
                pass
        else:
            info = probe_video(dest)
        cur = conn.execute(
            "INSERT INTO files(record_id, orig_name, rel_path, kind, mime, size, width, height,"
            " duration, sort, created_at, codec, web_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (record_id, up.filename, rel.as_posix(), kind, mime, dest.stat().st_size,
             info.get("width"), info.get("height"), info.get("duration"),
             sort_base + i + 1, now_str(), info.get("codec") or "",
             "pending" if kind == "video" and needs_transcode(info.get("codec"), ext) else ""))
        fid = cur.lastrowid
        if make_thumb(fid, dest, kind):
            conn.execute("UPDATE files SET has_thumb=1 WHERE id=?", (fid,))
        ids.append(fid)
    _wake.set()
    return ids


def set_tags(conn, record_id: int, tags: List[str]):
    conn.execute("DELETE FROM record_tags WHERE record_id=?", (record_id,))
    conn.executemany("INSERT OR IGNORE INTO record_tags(record_id, tag) VALUES (?,?)",
                     [(record_id, t) for t in tags])


def file_dict(row) -> dict:
    d = dict(row)
    d["url"] = f"/media/{d['id']}"
    d["thumb"] = f"/thumb/{d['id']}" if d["has_thumb"] else None
    return d


def record_detail(conn, record_id: int) -> dict:
    r = conn.execute("SELECT * FROM records WHERE id=?", (record_id,)).fetchone()
    if not r:
        raise HTTPException(404, "记录不存在")
    d = dict(r)
    d["extra"] = parse_extra(d.get("extra"))
    d["tags"] = [x[0] for x in conn.execute(
        "SELECT tag FROM record_tags WHERE record_id=? ORDER BY rowid", (record_id,))]
    d["files"] = [file_dict(f) for f in conn.execute(
        "SELECT * FROM files WHERE record_id=? ORDER BY sort, id", (record_id,))]
    return d


def trash_file(rel_path: str, file_id: int):
    """删除操作不真正删除文件，而是移动到 trash 目录，防止误删。"""
    src = MEDIA_DIR / rel_path
    if src.exists():
        dest = TRASH_DIR / datetime.now().strftime("%Y%m%d") / rel_path
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(dest))
    for p in (THUMB_DIR / f"{file_id}.jpg", WEB_DIR / f"{file_id}.mp4"):
        if p.exists():
            p.unlink()


# ---------------------------------------------------------------- 记录 API
@app.get("/api/records")
def list_records(request: Request, q: str = "", date_from: str = "", date_to: str = "",
                 body_part: str = "", tag: str = "", kind: str = "", page: int = 1,
                 page_size: int = 40):
    where, params = [], []
    for kw in q.split():
        like = "%" + kw.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        cols = ["r.title", "r.body_part", "r.patient_name", "r.patient_id",
                "r.diagnosis", "r.notes", "r.extra"]
        cond = " OR ".join(f"{c} LIKE ? ESCAPE '\\'" for c in cols)
        cond += " OR EXISTS(SELECT 1 FROM record_tags t WHERE t.record_id=r.id AND t.tag LIKE ? ESCAPE '\\')"
        cond += " OR EXISTS(SELECT 1 FROM files f WHERE f.record_id=r.id AND f.orig_name LIKE ? ESCAPE '\\')"
        where.append(f"({cond})")
        params += [like] * (len(cols) + 2)
    if date_from:
        where.append("r.exam_date >= ?"); params.append(date_from)
    if date_to:
        where.append("r.exam_date <= ?"); params.append(date_to)
    if body_part:
        where.append("r.body_part = ?"); params.append(body_part)
    if tag:
        where.append("EXISTS(SELECT 1 FROM record_tags t WHERE t.record_id=r.id AND t.tag=?)")
        params.append(tag)
    if kind in ("image", "video"):
        where.append("EXISTS(SELECT 1 FROM files f WHERE f.record_id=r.id AND f.kind=?)")
        params.append(kind)
    # 自定义字段筛选：cf<id>=值，数字/日期用 cf<id>_min / cf<id>_max
    qp = request.query_params
    with db() as conn:
        fields = {f["id"]: f for f in load_fields(conn)}
    for fid, f in fields.items():
        path = f"$.f{fid}"
        v = qp.get(f"cf{fid}", "").strip()
        lo = qp.get(f"cf{fid}_min", "").strip()
        hi = qp.get(f"cf{fid}_max", "").strip()
        t = f["type"]
        if t == "multiselect" and v:
            where.append("EXISTS(SELECT 1 FROM json_each(r.extra, ?) WHERE value=?)")
            params += [path, v]
        elif t == "checkbox" and v:
            where.append("json_extract(r.extra, ?) IS " + ("NOT NULL" if v == "1" else "NULL"))
            params.append(path)
        elif t in ("text", "textarea") and v:
            where.append("json_extract(r.extra, ?) LIKE ?")
            params += [path, f"%{v}%"]
        elif t == "select" and v:
            where.append("json_extract(r.extra, ?) = ?")
            params += [path, v]
        elif t in ("number", "date"):
            conv = (lambda x: float(x)) if t == "number" else str
            try:
                if lo:
                    where.append("json_extract(r.extra, ?) >= ?"); params += [path, conv(lo)]
                if hi:
                    where.append("json_extract(r.extra, ?) <= ?"); params += [path, conv(hi)]
            except ValueError:
                raise HTTPException(400, f"「{f['label']}」筛选值需要是数字")
    wsql = ("WHERE " + " AND ".join(where)) if where else ""
    page = max(1, page)
    page_size = min(max(1, page_size), 200)
    with db() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM records r {wsql}", params).fetchone()[0]
        rows = conn.execute(
            f"""SELECT r.*,
                (SELECT COUNT(*) FROM files f WHERE f.record_id=r.id AND f.kind='image') AS n_image,
                (SELECT COUNT(*) FROM files f WHERE f.record_id=r.id AND f.kind='video') AS n_video,
                (SELECT f.id FROM files f WHERE f.record_id=r.id AND f.has_thumb=1
                    ORDER BY f.sort, f.id LIMIT 1) AS cover_id,
                (SELECT GROUP_CONCAT(tag, '\x1f') FROM record_tags t WHERE t.record_id=r.id) AS tag_str
            FROM records r {wsql}
            ORDER BY r.exam_date DESC, r.id DESC LIMIT ? OFFSET ?""",
            params + [page_size, (page - 1) * page_size]).fetchall()
    items = []
    for r in rows:
        d = dict(r)
        d["tags"] = d.pop("tag_str").split("\x1f") if d.get("tag_str") else []
        d["extra"] = parse_extra(d.get("extra"))
        d["cover"] = f"/thumb/{d['cover_id']}" if d["cover_id"] else None
        items.append(d)
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@app.get("/api/records/{record_id}")
def get_record(record_id: int):
    with db() as conn:
        return record_detail(conn, record_id)


@app.post("/api/records")
def create_record(meta: str = Form("{}"), files: List[UploadFile] = File(default=[])):
    try:
        m = json.loads(meta)
    except json.JSONDecodeError:
        raise HTTPException(400, "meta 格式错误")
    data = clean_meta(m)
    data.setdefault("exam_date", date.today().isoformat())
    if not data["exam_date"]:
        data["exam_date"] = date.today().isoformat()
    with db() as conn:
        cols = list(data.keys()) + ["extra", "created_at", "updated_at"]
        vals = list(data.values()) + [merge_extra(conn, m.get("extra")), now_str(), now_str()]
        cur = conn.execute(
            f"INSERT INTO records({','.join(cols)}) VALUES ({','.join('?' * len(cols))})", vals)
        rid = cur.lastrowid
        set_tags(conn, rid, parse_tags(m.get("tags")))
        save_uploads(conn, rid, data["exam_date"], files)
        return record_detail(conn, rid)


@app.put("/api/records/{record_id}")
async def update_record(record_id: int, request: Request):
    m = await request.json()
    data = clean_meta(m)
    with db() as conn:
        old = conn.execute("SELECT extra FROM records WHERE id=?", (record_id,)).fetchone()
        if not old:
            raise HTTPException(404, "记录不存在")
        if "extra" in m:
            data["extra"] = merge_extra(conn, m["extra"], parse_extra(old["extra"]))
        if data:
            sets = ", ".join(f"{k}=?" for k in data) + ", updated_at=?"
            conn.execute(f"UPDATE records SET {sets} WHERE id=?",
                         list(data.values()) + [now_str(), record_id])
        if "tags" in m:
            set_tags(conn, record_id, parse_tags(m.get("tags")))
        return record_detail(conn, record_id)


@app.delete("/api/records/{record_id}")
def delete_record(record_id: int):
    with db() as conn:
        files = conn.execute("SELECT id, rel_path FROM files WHERE record_id=?",
                             (record_id,)).fetchall()
        for f in files:
            trash_file(f["rel_path"], f["id"])
        conn.execute("DELETE FROM records WHERE id=?", (record_id,))
    return {"ok": True}


@app.post("/api/records/{record_id}/files")
def add_files(record_id: int, files: List[UploadFile] = File(...)):
    with db() as conn:
        r = conn.execute("SELECT exam_date FROM records WHERE id=?", (record_id,)).fetchone()
        if not r:
            raise HTTPException(404, "记录不存在")
        save_uploads(conn, record_id, r["exam_date"], files)
        conn.execute("UPDATE records SET updated_at=? WHERE id=?", (now_str(), record_id))
        return record_detail(conn, record_id)


@app.delete("/api/files/{file_id}")
def delete_file(file_id: int):
    with db() as conn:
        f = conn.execute("SELECT id, rel_path FROM files WHERE id=?", (file_id,)).fetchone()
        if not f:
            raise HTTPException(404, "文件不存在")
        trash_file(f["rel_path"], f["id"])
        conn.execute("DELETE FROM files WHERE id=?", (file_id,))
    return {"ok": True}


@app.get("/api/meta")
def meta():
    with db() as conn:
        parts = [dict(r) for r in conn.execute(
            "SELECT body_part AS name, COUNT(*) AS n FROM records WHERE body_part<>''"
            " GROUP BY body_part ORDER BY n DESC")]
        tags = [dict(r) for r in conn.execute(
            "SELECT tag AS name, COUNT(*) AS n FROM record_tags GROUP BY tag ORDER BY n DESC")]
        stats = dict(conn.execute(
            """SELECT (SELECT COUNT(*) FROM records) AS records,
                      (SELECT COUNT(*) FROM files WHERE kind='image') AS images,
                      (SELECT COUNT(*) FROM files WHERE kind='video') AS videos,
                      (SELECT COALESCE(SUM(size),0) FROM files) AS bytes""").fetchone())
        builtin = builtin_settings(conn)
        custom = load_fields(conn, active_only=True)
    return {"body_parts": parts, "tags": tags, "stats": stats,
            "fields": {"builtin": builtin, "custom": custom},
            "video_thumbs": bool(FFMPEG), "transcode": bool(H264_ENC),
            "version": os.environ.get("APP_VERSION", "dev")}


# ---------------------------------------------------------------- 媒体文件
@app.get("/media/{file_id}")
def get_media(file_id: int, download: int = 0, original: int = 0):
    with db() as conn:
        f = conn.execute("SELECT * FROM files WHERE id=?", (file_id,)).fetchone()
    if not f:
        raise HTTPException(404)
    path = MEDIA_DIR / f["rel_path"]
    if not path.exists():
        raise HTTPException(404, "文件在磁盘上不存在")
    if f["web_path"] and not download and not original:
        web = WEB_DIR / f["web_path"]
        if web.exists():
            return FileResponse(web, media_type="video/mp4")
    kwargs = {"media_type": f["mime"] or None}
    if download:
        kwargs["filename"] = f["orig_name"]
    return FileResponse(path, **kwargs)


@app.get("/thumb/{file_id}")
def get_thumb(file_id: int):
    p = THUMB_DIR / f"{file_id}.jpg"
    if not p.exists():
        raise HTTPException(404)
    return FileResponse(p, media_type="image/jpeg",
                        headers={"Cache-Control": "private, max-age=604800"})


# ---------------------------------------------------------------- 前端静态文件（PWA）
app.mount("/", StaticFiles(directory=BASE_DIR / "static", html=True), name="static")

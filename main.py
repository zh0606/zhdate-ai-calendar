import json
import os
from datetime import date, timedelta
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field
from dotenv import load_dotenv


load_dotenv()
app = FastAPI(title="ZhDate 智能日程助手", version="2.0.0")
configured_origins = [origin.strip() for origin in os.getenv(
    "ALLOWED_ORIGINS", "http://127.0.0.1:5500,http://localhost:5500"
).split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[*configured_origins, "null"],
    # 同时支持 127/localhost、192.168、手机热点172.20.10 网段
    allow_origin_regex=r"^https?://(?:localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|172\.20\.10\.\d{1,3})(?::\d+)?$",
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

class ChatRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)


class ScheduleItem(BaseModel):
    title: str = Field(min_length=1, max_length=60)
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    time: str = Field(default="", pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$|^$")
    advice: str = Field(min_length=1, max_length=60)
    category: Literal["study", "work", "life", "other"] = "other"


@app.get("/")
def health() -> dict:
    return {"message": "ZhDate API is ready", "ai_enabled": bool(os.getenv("DEEPSEEK_API_KEY"))}


@app.post("/chat")
def chat(payload: ChatRequest) -> dict:
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="DEEPSEEK_API_KEY is not configured")

    today = date.today()
    current_week_monday = today - timedelta(days=today.weekday())
    next_week_monday = current_week_monday + timedelta(days=7)
    next_week_sunday = next_week_monday + timedelta(days=6)
    client = OpenAI(api_key=api_key, base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"))
    prompt = f"""
你是 ZhDate 的温柔日程解析助手。只输出一个 JSON 对象，不要 Markdown 或额外解释。
今天是 {today.isoformat()}，明天是 {(today + timedelta(days=1)).isoformat()}。
本周范围是 {current_week_monday.isoformat()} 至 {(current_week_monday + timedelta(days=6)).isoformat()}；
下周范围是 {next_week_monday.isoformat()} 至 {next_week_sunday.isoformat()}。
把用户输入严格拆成五个字段：事情 title、日期 date、时间 time、建议 advice、分类 category。
输出结构：{{"title":"简洁事件名","date":"YYYY-MM-DD","time":"HH:MM 或空字符串","advice":"一句不超过30字、针对这件事的温柔建议","category":"study|work|life|other"}}
学习、考试、课程归为 study；会议、项目、提交归为 work；吃饭、运动、家务、健康和约会归为 life；其余归为 other。
没有明确时间时 time 返回空字符串；结合上述周范围正确理解今天、明天、后天、本周和下周。
“下周六”必须是下周范围内的星期六，绝不能返回本周六。advice 必须是一句完整建议，不能复述日程。
""".strip()

    try:
        response = client.chat.completions.create(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": payload.text}],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        raw = response.choices[0].message.content or "{}"
        item = ScheduleItem.model_validate(json.loads(raw))
        date.fromisoformat(item.date)
        if item.time:
            hour, minute = map(int, item.time.split(":"))
            if not (0 <= hour <= 23 and 0 <= minute <= 59):
                raise ValueError("invalid time")
        return {"result": item.model_dump()}
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail="AI returned an invalid schedule") from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="AI service is temporarily unavailable") from exc

import os
import re
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM = """당신은 자미두수 전문 역술가입니다. 미지근한 말은 절대 하지 않습니다.
규칙:
- 한자, 전문용어 절대 사용 금지 (화록, 화기, 유년, 대한, 명궁 등 금지)
- 누구나 이해할 수 있는 쉬운 말로만 작성
- "조심하세요", "주의가 필요합니다" 같은 두루뭉술한 표현 대신 구체적 상황과 행동을 직접 지시
- 예: "돈 거래 조심하세요" 대신 "이번 달 후반에 누군가 돈을 빌려달라고 하면 거절하세요. 못 받을 가능성이 큽니다"
- 매월, 매 섹션마다 최소 3개 이상의 구체적 상황/행동/시기를 제시
- 존댓말, 단호하고 자신감 있는 어조로 직언
- 볼드(**), 헤더(###), 구분선(---) 등 마크다운 기호 사용 금지"""


def _clean(text: str) -> str:
    text = re.sub(r'\*+', '', text)
    text = re.sub(r'#{1,6}\s*', '', text)
    text = re.sub(r'-{3,}', '', text)
    text = re.sub(r'_{1,}', '', text)
    return text.strip()


def _extract(mingban: dict, current_year: int) -> dict:
    ming = next((p for p in mingban["palaces"] if p["isMingGong"]), None)
    stars = ", ".join(
        f"{s['name']}{s['brightness']}" + (f"({s['siHuaKr']})" if s["siHuaKr"] else "")
        for s in (ming["stars"] if ming else [])
    )
    dx = mingban["currentDaxian"]
    ln = mingban["liunian"]
    liuyue_str = "\n".join(
        f"  {m['month']}월: {m['natalPalaceKr']}" for m in ln["liuyue"]
    )
    sihua_str = ", ".join(f"{s}:{h}" for s, h in ln.get("siHuaKr", {}).items())
    sihua_pal = ", ".join(f"{h}:{p}" for h, p in ln.get("siHuaPalacesKr", {}).items())
    return dict(
        ming_gong_zhi=mingban["mingGongZhi"],
        shen_gong_zhi=mingban["shenGongZhi"],
        wu_xing_ju=mingban["wuXingJu"],
        ming_stars=stars,
        daxian_age=f"{dx['ageStart']}~{dx['ageEnd']}",
        daxian_palace=dx["palaceNameKr"],
        daxian_ganzhi=dx["ganZhi"],
        daxian_stars=", ".join(dx["mainStars"]),
        current_year=current_year,
        liunian_palace=ln["natalPalaceAtMingKr"],
        sihua=sihua_str,
        sihua_pal=sihua_pal,
        liuyue=liuyue_str,
        palaces="\n".join(
            f"  {p['nameKr']}[{p['ganZhi']}]: " +
            ", ".join(f"{s['name']}{s['brightness']}" + (f"({s['siHuaKr']})" if s["siHuaKr"] else "")
                      for s in p["stars"])
            for p in mingban["palaces"]
        ),
    )


def _prompt_free(d):
    return (
        f"자미두수 명반 데이터입니다. 쉬운 말로 무료 미리보기를 작성하세요.\n\n"
        f"명궁: {d['ming_gong_zhi']} / 오행국: {d['wu_xing_ju']} / 주성: {d['ming_stars']}\n"
        f"현재 대한: {d['daxian_age']}세 ({d['daxian_palace']} {d['daxian_ganzhi']})\n\n"
        f"150자 이내로, 이 사람의 핵심 기질 한 줄 + 지금 시기의 분위기 한 줄만 직언하세요.\n"
        f"마지막은 반드시 '전체 운세에서 더 충격적인 내용을 확인하세요.'로 끝내세요."
    )


def _prompt_year(d):
    return (
        f"자미두수 명반 데이터입니다. 한자나 전문용어 없이, 매우 구체적이고 직설적으로 작성하세요.\n\n"
        f"명궁: {d['ming_gong_zhi']} / 오행국: {d['wu_xing_ju']} / 주성: {d['ming_stars']}\n"
        f"현재 대한: {d['daxian_age']}세 / {d['daxian_palace']}({d['daxian_ganzhi']}) / {d['daxian_stars']}\n"
        f"{d['current_year']}년 유년명궁: {d['liunian_palace']}\n"
        f"사화: {d['sihua']}\n"
        f"사화궁위: {d['sihua_pal']}\n\n"
        f"월별 흐름:\n{d['liuyue']}\n\n"
        f"전체 12궁 배치:\n{d['palaces']}\n\n"
        f"아래 형식으로 작성하세요. 반드시 이 형식을 지켜주세요. 각 섹션은 최소 4~5문장 이상, "
        f"구체적인 시기·상황·행동을 포함해 직설적으로 작성하세요:\n\n"
        f"[올해 총평]\n"
        f"(올해 전체 분위기를 5문장 이상으로. 가장 중요한 변화가 언제 어떻게 오는지 구체적으로)\n\n"
        f"[재물운]\n"
        f"(돈이 들어오는 시기와 액수 규모, 나가는 시기와 이유를 구체적으로. "
        f"\"이런 제안이 오면 거절/수락하세요\" 같은 직접적 행동 지침 포함)\n\n"
        f"[직업·사업운]\n"
        f"(기회가 오는 정확한 시기와 그 기회의 형태, 위험한 시기에 무엇을 피해야 하는지 구체적으로)\n\n"
        f"[건강운]\n"
        f"(주의할 신체 부위, 증상이 나타날 수 있는 시기, 병원 방문이나 검진을 권장하는 시기)\n\n"
        f"[인연·관계운]\n"
        f"(만남·이별·갈등·화해가 일어나는 구체적 시기와 그 사람의 특징, 어떻게 대처해야 하는지)\n\n"
        f"[월별 핵심 운세]\n"
        f"1월: (이달에 가장 강하게 일어나는 일을 구체적 행동지침과 함께 2~3줄)\n"
        f"2월: (이달에 가장 강하게 일어나는 일을 구체적 행동지침과 함께 2~3줄)\n"
        f"3월: (이달에 가장 강하게 일어나는 일을 구체적 행동지침과 함께 2~3줄)\n"
        f"4월: (이달에 가장 강하게 일어나는 일을 구체적 행동지침과 함께 2~3줄)\n"
        f"5월: (이달에 가장 강하게 일어나는 일을 구체적 행동지침과 함께 2~3줄)\n"
        f"6월: (이달에 가장 강하게 일어나는 일을 구체적 행동지침과 함께 2~3줄)\n"
        f"7월: (이달에 가장 강하게 일어나는 일을 구체적 행동지침과 함께 2~3줄)\n"
        f"8월: (이달에 가장 강하게 일어나는 일을 구체적 행동지침과 함께 2~3줄)\n"
        f"9월: (이달에 가장 강하게 일어나는 일을 구체적 행동지침과 함께 2~3줄)\n"
        f"10월: (이달에 가장 강하게 일어나는 일을 구체적 행동지침과 함께 2~3줄)\n"
        f"11월: (이달에 가장 강하게 일어나는 일을 구체적 행동지침과 함께 2~3줄)\n"
        f"12월: (이달에 가장 강하게 일어나는 일을 구체적 행동지침과 함께 2~3줄)\n\n"
        f"[올해 한마디]\n"
        f"(단 한 문장으로 올해를 정의. 강렬하고 명확하게)"
    )


async def generate_ziwei_reading(mingban: dict, service_type: str,
                                  current_year: int, liuri=None) -> str:
    d = _extract(mingban, current_year)

    if service_type == "ziwei_free":
        prompt, tokens = _prompt_free(d), 400
    else:
        prompt, tokens = _prompt_year(d), 8000

    resp = await client.chat.completions.create(
        model="gpt-4o",
        max_tokens=tokens,
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user",   "content": prompt},
        ],
    )
    return _clean(resp.choices[0].message.content)

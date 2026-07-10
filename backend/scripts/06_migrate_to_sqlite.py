# -*- coding: utf-8 -*-
"""
정적 JSON 데이터를 읽어 SQLite DB(hospital_data.db)로 이관(Migration)하는 스크립트.
"""
import json
import sys
from pathlib import Path

# Add backend dir to sys.path to import app modules
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BACKEND_DIR))

from app.db.database import engine, SessionLocal, Base
from app.db.models import Hospital

FINAL_HOSPITALS_JSON = BACKEND_DIR.parent / "data" / "processed" / "final_hospitals.json"

def migrate():
    # 1. 테이블 생성
    Base.metadata.create_all(bind=engine)
    print("✅ SQLite 테이블 생성 완료")

    # 2. 데이터 읽기
    if not FINAL_HOSPITALS_JSON.exists():
        print(f"❌ {FINAL_HOSPITALS_JSON} 파일을 찾을 수 없습니다.")
        sys.exit(1)
        
    try:
        data = json.loads(FINAL_HOSPITALS_JSON.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"❌ JSON 파싱 실패: {e}")
        sys.exit(1)
        
    # 3. 데이터 삽입
    db = SessionLocal()
    try:
        # 기존 데이터 삭제 (멱등성 보장)
        db.query(Hospital).delete()
        
        insert_count = 0
        for item in data:
            h = Hospital(
                name=item["name"],
                address=item.get("address", ""),
                lat=item["lat"],
                lng=item["lng"],
                tier=item["tier"]
            )
            db.add(h)
            insert_count += 1
            
        db.commit()
        print(f"✅ 총 {insert_count}개의 병원 데이터를 SQLite로 마이그레이션했습니다.")
    except Exception as e:
        db.rollback()
        print(f"❌ DB 삽입 중 에러 발생: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()

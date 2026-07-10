# -*- coding: utf-8 -*-
"""기존 final_hospitals.json 데이터를 SQLite (hospitals.db)로 마이그레이션하는 스크립트"""
import sys
from pathlib import Path
import json

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.db.database import engine, Base, SessionLocal
from app.db.models import Hospital

def main():
    json_path = BASE_DIR / "data" / "processed" / "final_hospitals.json"
    if not json_path.exists():
        print(f"Error: {json_path} does not exist.")
        return

    # 테이블 생성
    Base.metadata.create_all(bind=engine)
    print("SQLite 테이블 생성 완료.")

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    db = SessionLocal()
    try:
        # 기존 데이터 초기화
        db.query(Hospital).delete()
        
        count = 0
        for item in data:
            h = Hospital(
                name=item["name"],
                lat=item["lat"],
                lng=item["lng"],
                tier=item["tier"],
                address=item.get("address"),
                tel=item.get("tel")
            )
            db.add(h)
            count += 1
            
        db.commit()
        print(f"총 {count}개의 병원 데이터 SQLite 마이그레이션 완료!")
    except Exception as e:
        db.rollback()
        print(f"마이그레이션 실패: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()

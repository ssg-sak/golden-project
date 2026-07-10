import pandas as pd
import numpy as np
import os

# ==========================================
# [Distance Calculation Logic Explanation]
# 거리 계산 로직 설명: 
# 이 스크립트에서는 'Haversine 공식(Haversine Formula)'을 사용하여 직선거리를 계산합니다.
# 지구는 둥글기 때문에 단순 유클리드 거리(피타고라스 정리)를 사용하면 오차가 발생합니다.
# Haversine 공식은 두 지점의 위도(Latitude)와 경도(Longitude)를 라디안(Radian)으로 변환한 뒤,
# 구면 삼각법을 이용하여 지구 표면을 따라가는 최단 거리(대원거리, Great-circle distance)를 구하는 방식입니다.
# 
# Geopandas를 사용하여 한국 표준 투영 좌표계(예: EPSG:5179)로 변환 후 직선거리를 구하는 방식도 가능하지만,
# 여기서는 외부 라이브러리 의존성을 낮추고 대규모 연산을 numpy 배열 연산으로 빠르게 처리하기 위해
# pandas와 numpy만을 활용한 Haversine 로직을 구현하였습니다.
# ==========================================

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    위도와 경도를 기반으로 두 지점 간의 거리를 킬로미터(km) 단위로 반환합니다.
    """
    R = 6371.0 # 지구의 평균 반지름 (km)

    # 각도를 라디안으로 변환
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])

    # 위도 및 경도 차이
    dlat = lat2 - lat1
    dlon = lon2 - lon1

    # Haversine 공식
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arcsin(np.sqrt(a))
    distance = R * c
    
    return distance

def extract_blind_spots(kindergarten_csv_path, hospital_csv_path, output_csv_path):
    """
    유치원과 병원 데이터를 읽어와 3km 반경 밖에 있는 '사각지대 유치원'만 필터링합니다.
    """
    # 1. 데이터 불러오기
    # 데이터가 없을 경우를 대비한 예외처리 및 더미 데이터 생성 로직 포함 (테스트용)
    try:
        df_kinder = pd.read_csv(kindergarten_csv_path)
        df_hospital = pd.read_csv(hospital_csv_path)
        print("데이터를 성공적으로 불러왔습니다.")
    except FileNotFoundError:
        print("지정된 경로에 CSV 파일이 없어 임시 더미 데이터를 생성하여 진행합니다.")
        # 더미 데이터 생성 (대구광역시 인근 좌표 중심)
        df_kinder = pd.DataFrame({
            '유치원명': ['가유치원', '나유치원', '다유치원', '라유치원'],
            'latitude': [35.8714, 35.8820, 35.8500, 35.9000],
            'longitude': [128.6014, 128.6100, 128.5500, 128.6500]
        })
        df_hospital = pd.DataFrame({
            '병원명': ['A소아과', 'B달빛병원'],
            'latitude': [35.8710, 35.8800],
            'longitude': [128.6010, 128.6200]
        })

    # 필수 컬럼 확인 ('latitude', 'longitude' 컬럼이 있다고 가정)
    if not {'latitude', 'longitude'}.issubset(df_kinder.columns) or not {'latitude', 'longitude'}.issubset(df_hospital.columns):
        raise ValueError("데이터프레임에 'latitude'와 'longitude' 컬럼이 포함되어 있어야 합니다.")

    # 2. 거리 계산 및 가장 가까운 병원 찾기
    min_distances = []
    
    for idx, kinder in df_kinder.iterrows():
        # 각 유치원에 대해 모든 병원과의 거리를 한 번에 계산 (Numpy 벡터 연산)
        distances = haversine_distance(
            kinder['latitude'], kinder['longitude'],
            df_hospital['latitude'].values, df_hospital['longitude'].values
        )
        
        # 가장 가까운 병원과의 거리 저장
        min_dist = np.min(distances)
        min_distances.append(min_dist)

    # 계산된 최소 거리를 유치원 데이터프레임에 추가
    df_kinder['nearest_hospital_dist_km'] = min_distances

    # 3. 사각지대 필터링
    # 기존 병원 위치들을 기준으로 반경 3km(직선거리) 안에 포함되는 유치원들은 '안전 지대'로 분류해서 제외
    # 반경 3km 바깥에 있는 유치원(사각지대) 데이터만 따로 필터링
    df_blind_spots = df_kinder[df_kinder['nearest_hospital_dist_km'] > 3.0].copy()

    print(f"전체 유치원 수: {len(df_kinder)}개")
    print(f"사각지대(3km 밖) 유치원 수: {len(df_blind_spots)}개")

    # 4. 새로운 데이터프레임 저장
    os.makedirs(os.path.dirname(output_csv_path), exist_ok=True)
    df_blind_spots.to_csv(output_csv_path, index=False, encoding='utf-8-sig')
    print(f"사각지대 유치원 데이터가 저장되었습니다: {output_csv_path}")

    return df_blind_spots

if __name__ == "__main__":
    # 실행 예시 (경로는 실제 파일 위치에 맞게 수정 필요)
    # 현재 위치(scripts)를 기준으로 상위 폴더의 data 디렉토리 접근
    KINDER_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "daegu_kindergartens.csv")
    HOSPITAL_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "daegu_hospitals.csv")
    OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "blind_spot_kindergartens.csv")
    
    extract_blind_spots(KINDER_PATH, HOSPITAL_PATH, OUTPUT_PATH)

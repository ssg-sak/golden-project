import math
import os
import time
import pandas as pd
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut

def find_elbow_point(wcss):
    """
    수학적으로 엘보우 포인트를 찾는 함수.
    곡선의 첫 점과 마지막 점을 잇는 직선과 각 점 사이의 수직 거리가 가장 먼 곳을 엘보우 포인트로 간주.
    """
    if not wcss:
        return 1
    
    n_points = len(wcss)
    if n_points <= 2:
        return n_points
        
    p1 = (1, wcss[0])
    p2 = (n_points, wcss[-1])
    
    a = p2[1] - p1[1]
    b = p1[0] - p2[0]
    c = p2[0] * p1[1] - p1[0] * p2[1]
    
    max_distance = -1
    elbow_index = 0
    
    for i in range(n_points):
        x0 = i + 1
        y0 = wcss[i]
        distance = abs(a * x0 + b * y0 + c) / math.sqrt(a * a + b * b)
        if distance > max_distance:
            max_distance = distance
            elbow_index = i
            
    return elbow_index + 1

def geocode_with_cache(csv_path, geocoded_path):
    """
    주소 데이터를 위도/경도로 변환하는 전처리 로직.
    반복적인 API 호출을 막기 위해 한 번 성공하면 캐시 파일(CSV)에 저장하고 다음부턴 불러옵니다.
    """
    if os.path.exists(geocoded_path):
        print(f"[CACHE FOUND] 지오코딩 캐시 발견: {os.path.basename(geocoded_path)} 에서 기존 좌표 데이터를 불러옵니다.")
        return pd.read_csv(geocoded_path, encoding='utf-8-sig')
    
    print(f"[GEOCODING START] 지오코딩 캐시 없음. {os.path.basename(csv_path)} 변환 시작...")
    try:
        df = pd.read_csv(csv_path, encoding='cp949')
    except UnicodeDecodeError:
        df = pd.read_csv(csv_path, encoding='utf-8')
        
    df['latitude'] = None
    df['longitude'] = None
    
    geolocator = Nominatim(user_agent="daegu_golden_time_agent")
    total = len(df)
    
    for idx, row in df.iterrows():
        address = row.get('주소', '')
        if pd.isna(address) or not address:
            continue
            
        try:
            clean_addr = str(address).split(',')[0].split('(')[0].strip()
            location = geolocator.geocode(clean_addr, timeout=3)
            if location:
                df.at[idx, 'latitude'] = location.latitude
                df.at[idx, 'longitude'] = location.longitude
            else:
                df.at[idx, 'latitude'] = 35.871430 + (idx * 0.0001 % 0.05)
                df.at[idx, 'longitude'] = 128.601445 + (idx * 0.0001 % 0.05)
        except Exception as e:
            print(f"[GEOCODING ERROR] 주소 '{clean_addr}' 변환 실패 (기본좌표 폴백). 사유: {e}")
            df.at[idx, 'latitude'] = 35.871430
            df.at[idx, 'longitude'] = 128.601445
            
        if idx % 50 == 0 and idx > 0:
            print(f"... {idx}/{total} 개 변환 완료")
            
        time.sleep(0.6) 
        
    df.to_csv(geocoded_path, index=False, encoding='utf-8-sig')
    print(f"[GEOCODING END] 완료 및 캐시 저장: {geocoded_path}")
    return df

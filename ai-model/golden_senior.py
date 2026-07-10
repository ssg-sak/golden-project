import os
import json
import warnings
import pandas as pd
import geopandas as gpd
import numpy as np
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt

from pipeline_utils import find_elbow_point
from hira_data_bridge import compute_composite_weight

warnings.filterwarnings('ignore')

def run_senior_pipeline(hospital_json, output_json, vuln_geojson):
    print("\n[SENIOR] Phase A: 데이터 셋업 및 전처리")
    
    # 어르신 모드: 유치원 대신 VDI 중심점을 수요로 활용
    gdf_vuln = gpd.read_file(vuln_geojson)
    gdf_vuln_4326 = gdf_vuln.to_crs(epsg=4326)
    
    df_demand = pd.DataFrame({
        'latitude': gdf_vuln_4326.geometry.centroid.y,
        'longitude': gdf_vuln_4326.geometry.centroid.x,
        'vulnerability_index': gdf_vuln_4326['vulnerability_index'] if 'vulnerability_index' in gdf_vuln_4326.columns else 1.0
    })
    
    if not os.path.exists(hospital_json):
        raise FileNotFoundError(f"병원 JSON 찾을 수 없음: {hospital_json}")
        
    with open(hospital_json, 'r', encoding='utf-8') as f:
        hospital_data = json.load(f)
        
    df_hospital = pd.DataFrame(hospital_data)
    df_hospital = df_hospital.rename(columns={'lat': 'latitude', 'lng': 'longitude'}).dropna(subset=['latitude', 'longitude'])
    
    # 어르신 모드: 권역/지역응급(Tier 1, 2) 필터링
    df_hospital = df_hospital[df_hospital['tier'].isin([1, 2])]
    
    print(f"[SENIOR] 수요(행정동) {len(df_demand)}건, 권역·지역응급 {len(df_hospital)}건 로드.")
    
    gdf_demand = gpd.GeoDataFrame(df_demand, geometry=gpd.points_from_xy(df_demand.longitude, df_demand.latitude), crs="EPSG:4326")
    gdf_hospital = gpd.GeoDataFrame(df_hospital, geometry=gpd.points_from_xy(df_hospital.longitude, df_hospital.latitude), crs="EPSG:4326")
    
    gdf_demand_proj = gdf_demand.to_crs(epsg=5179)
    gdf_hospital_proj = gdf_hospital.to_crs(epsg=5179)
    
    print("\n[SENIOR] Phase B: 공간 분석 및 타겟 필터링")
    gdf_hospital_proj['geometry'] = gdf_hospital_proj.geometry.buffer(3000)
    
    joined = gpd.sjoin(gdf_demand_proj, gdf_hospital_proj, how='left', predicate='intersects')
    gdf_blind_spots = joined[joined['index_right'].isna()].copy()
    gdf_blind_spots = gdf_blind_spots.drop(columns=[col for col in gdf_blind_spots.columns if col.endswith('_right') or col == 'index_right'])
    
    gdf_blind_spots_4326 = gdf_blind_spots.to_crs(epsg=4326)
    
    print(f"[SENIOR] 안전망 제외 최종 사각지대(행정동): {len(gdf_blind_spots_4326)}개")
    
    if len(gdf_blind_spots_4326) < 3: return
        
    print("\n[SENIOR] Phase C: AI 클러스터링 모델링 (HIRA 3중 복합 가중치 파인튜닝)")
    X = [[geom.y, geom.x] for geom in gdf_blind_spots_4326.geometry]

    # ── [BASELINE] 기존 단일 VDI 가중치 (롤백 대비 주석 보존) ──────────────────
    # 시니어 모드는 DataFrame 초기 생성 시 가져온 index를 그대로 사용
    # raw_weights = gdf_blind_spots_4326['vulnerability_index'].fillna(1.0).values
    # mean_weight = np.mean(raw_weights)
    # sample_weight = raw_weights / mean_weight if mean_weight > 0 else np.ones(len(X))
    # ──────────────────────────────────────────────────────────────────────────

    # ── [FINETUNED] 3중 복합 가중치: VDI × (1 + infra_penalty) × equity_mult ──
    # equity_multiplier: 대구 평균 대비 65세이상 인구 비율
    # 현재: 균등 1.0 적용 (향후 행정동 노인 통계 데이터 연계 시 대체)
    DAEGU_AVG_SENIOR_RATIO = 1.0  # 기본값 (데이터 확보 전)
    composite_weights = []
    for geom, vdi in zip(gdf_blind_spots_4326.geometry,
                         gdf_blind_spots_4326['vulnerability_index'].fillna(1.0).values):
        w = compute_composite_weight(
            vdi_weight=float(vdi),
            point_lat=geom.y,
            point_lng=geom.x,
            equity_multiplier=DAEGU_AVG_SENIOR_RATIO
        )
        composite_weights.append(w)

    composite_weights = np.array(composite_weights)
    mean_cw = np.mean(composite_weights)
    sample_weight = composite_weights / mean_cw if mean_cw > 0 else np.ones(len(X))
    print(f"[SENIOR] 복합 가중치 범위: min={composite_weights.min():.4f}, "
          f"max={composite_weights.max():.4f}, mean={mean_cw:.4f}")
    # ──────────────────────────────────────────────────────────────────────────
    
    max_k = min(10, len(X))
    wcss = [KMeans(n_clusters=i, random_state=42).fit(X, sample_weight=sample_weight).inertia_ for i in range(1, max_k + 1)]
        
    optimal_k = find_elbow_point(wcss)
    print(f"[SENIOR] 최적 병원 거점 개수(K) = {optimal_k}")
    
    kmeans = KMeans(n_clusters=optimal_k, random_state=42)
    gdf_blind_spots_4326['cluster'] = kmeans.fit_predict(X, sample_weight=sample_weight)
    
    print("\n[SENIOR] Phase D: 결과 저장")
    centroids = kmeans.cluster_centers_
    cluster_counts = gdf_blind_spots_4326.groupby('cluster').size()
    
    locations = [{"id": i+1, "lat": float(centroids[i][0]), "lng": float(centroids[i][1]), "demand": int(cluster_counts.get(i, 0))} for i in range(optimal_k)]
    
    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(locations, f, ensure_ascii=False, indent=2)
        
    print(f"[SENIOR] 시각화 (Matplotlib) 저장 진행")
    plt.figure(figsize=(10, 10))
    plt.scatter(gdf_demand.geometry.x, gdf_demand.geometry.y, c='lightgray', s=10, alpha=0.5)
    plt.scatter(gdf_hospital.geometry.x, gdf_hospital.geometry.y, c='red', marker='P', s=100)
    plt.scatter(gdf_blind_spots_4326.geometry.x, gdf_blind_spots_4326.geometry.y, c=gdf_blind_spots_4326['cluster'], cmap='viridis', s=30, edgecolor='k')
    plt.scatter([c[1] for c in centroids], [c[0] for c in centroids], c='gold', marker='*', s=400, edgecolor='black')
    
    plt.title("Daegu Golden Time: SENIOR Emergency AI Centers", fontsize=14, fontweight='bold')
    plt.grid(True, linestyle='--', alpha=0.5)
    
    plot_path = os.path.join(os.path.dirname(output_json), "golden_governance_clusters_senior.png")
    plt.savefig(plot_path, dpi=300, bbox_inches='tight')
    plt.close()

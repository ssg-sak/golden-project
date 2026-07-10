import os
from golden_pediatric import run_pediatric_pipeline
from golden_senior import run_senior_pipeline

if __name__ == "__main__":
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    
    KINDER_RAW = os.path.join(BASE_DIR, "..", "data", "raw", "daegu_kindergartens.csv")
    KINDER_GEO = os.path.join(BASE_DIR, "..", "data", "processed", "daegu_kindergartens_geocoded.csv")
    HOSPITAL_JSON = os.path.join(BASE_DIR, "..", "data", "processed", "final_hospitals.json")
    
    OUTPUT_JSON_PEDIATRIC = os.path.join(BASE_DIR, "..", "data", "processed", "optimal_locations_pediatric.json")
    OUTPUT_JSON_SENIOR = os.path.join(BASE_DIR, "..", "data", "processed", "optimal_locations_senior.json")
    
    VULNERABILITY_JSON = os.path.join(BASE_DIR, "..", "data", "processed", "daegu_vulnerability.geojson")
    
    print("==============================================")
    print(" 1) 소아(Pediatric) 거점 분석 파이프라인 가동")
    print("==============================================")
    run_pediatric_pipeline(
        kinder_raw=KINDER_RAW, 
        kinder_geo=KINDER_GEO, 
        hospital_json=HOSPITAL_JSON, 
        output_json=OUTPUT_JSON_PEDIATRIC, 
        vuln_geojson=VULNERABILITY_JSON
    )
    
    print("\n==============================================")
    print(" 2) 어르신(Senior) 거점 분석 파이프라인 가동")
    print("==============================================")
    run_senior_pipeline(
        hospital_json=HOSPITAL_JSON, 
        output_json=OUTPUT_JSON_SENIOR, 
        vuln_geojson=VULNERABILITY_JSON
    )

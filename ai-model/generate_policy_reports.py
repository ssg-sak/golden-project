import json
import csv
import os

def generate_reports():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_geojson = os.path.join(base_dir, "..", "data", "processed", "daegu_vulnerability.geojson")
    output_csv = os.path.join(base_dir, "..", "frontend", "public", "data", "policy_monitoring_report.csv")
    output_json = os.path.join(base_dir, "..", "frontend", "public", "data", "priority_targets.json")

    # Load GeoJSON
    if not os.path.exists(input_geojson):
        print(f"Error: {input_geojson} not found.")
        return

    with open(input_geojson, 'r', encoding='utf-8') as f:
        data = json.load(f)

    records = []
    for feature in data.get('features', []):
        props = feature.get('properties', {})
        adm_nm = props.get('adm_nm', '')
        dong_name = props.get('동이름') or adm_nm.replace('대구광역시 ', '').strip()
        pop_65 = int(props.get('65세이상_인구', 0))
        pop_0_9 = int(props.get('0~9세_인구', 0))
        vuln_pop = int(props.get('취약인구', 0))
        nearest_hosp = props.get('nearest_hospital_name', '')
        min_dist = float(props.get('min_dist_to_hospital', 0))
        vdi = float(props.get('vulnerability_index', 0))

        records.append({
            'dong_name': dong_name,
            'vdi': vdi,
            'pop_65': pop_65,
            'pop_0_9': pop_0_9,
            'vuln_pop': vuln_pop,
            'nearest_hosp': nearest_hosp,
            'min_dist': min_dist
        })

    # Ensure output directories exist
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    os.makedirs(os.path.dirname(output_json), exist_ok=True)

    # 1. Generate CSV
    # Headers: ['행정동', 'VDI', '65세이상', '0-9세', '취약인구합계', '최근접병원', '최근접거리km']
    with open(output_csv, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['행정동', 'VDI', '65세이상', '0-9세', '취약인구합계', '최근접병원', '최근접거리km'])
        for r in records:
            writer.writerow([
                r['dong_name'],
                r['vdi'],
                r['pop_65'],
                r['pop_0_9'],
                r['vuln_pop'],
                r['nearest_hosp'],
                r['min_dist']
            ])
    print(f"[SUCCESS] CSV Exported: {output_csv}")

    # 2. Generate JSON (Priority Targets)
    # Sort by VDI (High Risk)
    sorted_by_vdi = sorted(records, key=lambda x: x['vdi'], reverse=True)
    high_risk_top_10 = [r['dong_name'] for r in sorted_by_vdi[:10]]

    # Sort by Pediatric Priority (0-9세 인구수)
    sorted_by_ped = sorted(records, key=lambda x: x['pop_0_9'], reverse=True)
    ped_priority = sorted_by_ped[0]['dong_name'] if sorted_by_ped else None

    # Sort by General Priority (최근접거리)
    sorted_by_dist = sorted(records, key=lambda x: x['min_dist'], reverse=True)
    gen_priority = sorted_by_dist[0]['dong_name'] if sorted_by_dist else None

    priority_data = {
        "highRiskTop10": high_risk_top_10,
        "pediatricPriority": ped_priority,
        "generalPriority": gen_priority
    }

    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(priority_data, f, ensure_ascii=False, indent=2)
    print(f"[SUCCESS] JSON Exported: {output_json}")

if __name__ == "__main__":
    generate_reports()

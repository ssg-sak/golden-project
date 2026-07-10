from geopy.geocoders import Nominatim
import time

geolocator = Nominatim(user_agent="daegu_golden_time_agent")
coords = [
    ("Pediatric C1", 35.8503, 128.6589),
    ("Pediatric C2", 35.7945, 128.4645),
    ("Pediatric C3", 35.9183, 128.6245),
    ("Pediatric C4", 36.2211, 128.5914),
    ("Senior C1", 35.7633, 128.4922),
    ("Senior C2", 36.1893, 128.6229),
    ("Senior C3", 35.8979, 128.6546)
]

with open("result.txt", "w", encoding="utf-8") as f:
    for name, lat, lng in coords:
        try:
            loc = geolocator.reverse(f"{lat}, {lng}", exactly_one=True, timeout=10)
            addr = loc.address if loc else "Not Found"
            f.write(f"{name}: {addr}\n")
        except Exception as e:
            f.write(f"{name}: Error - {e}\n")
        time.sleep(1)

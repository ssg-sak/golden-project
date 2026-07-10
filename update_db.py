import sqlite3

conn = sqlite3.connect('data/hospitals.db')
cursor = conn.cursor()
cursor.execute("UPDATE hospitals SET lat=35.848, lng=128.544, address='대구광역시 달서구 당산로 14' WHERE name='구병원'")
conn.commit()
conn.close()
print("DB updated.")

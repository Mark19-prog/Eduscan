import psycopg2
conn = psycopg2.connect('postgresql://eduscan_app:eduscan@127.0.0.1:5432/eduscan')
cursor = conn.cursor()
cursor.execute("UPDATE persons SET grade = '10' WHERE full_name = 'Saba, Mark C.'")
conn.commit()
print("Updated Saba, Mark C. to Grade 10")

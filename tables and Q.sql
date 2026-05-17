CREATE TABLE user_groups (
  group_id SERIAL PRIMARY KEY,
  name     VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO user_groups (name) VALUES
  ('admin'),('employee'),('customer'),('technical_staff');


CREATE TABLE users (
  user_id   SERIAL PRIMARY KEY,
  name      VARCHAR(100) NOT NULL,
  email     VARCHAR(150) NOT NULL UNIQUE,
  password  VARCHAR(255) NOT NULL,
  group_id  INT NOT NULL REFERENCES user_groups(group_id)
);

INSERT INTO users (name, email, password, group_id) VALUES
  ('Mohammed Ali', 'mohammed@farm.com', 'hashed_pw_1', 1),
  ('Saleh Khaled',     'saleh@farm.com',   'hashed_pw_2', 2),
  ('Ali Kaleh',   'ali@farm.com', 'hashed_pw_3', 2),
  ('Husam Yousef',   'Husam@farm.com', 'hashed_pw_4', 4),
  ('Anas Mohammed',     'Anas@farm.com',   'hashed_pw_5', 3);
-- 3. FARMS
CREATE TABLE farms (
  farm_id  SERIAL PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,
  location VARCHAR(200),
  user_id  INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE
);




-- 4. CROPS
CREATE TABLE crops (
  crop_id SERIAL PRIMARY KEY,
  name    VARCHAR(100) NOT NULL,
  season  VARCHAR(50)
);

INSERT INTO crops (name, season) VALUES
  ('Wheat',     'Winter'),
  ('Tomato',    'Summer'),
  ('Sunflower', 'Summer'),
  ('Potato',    'Spring'),
  ('Barley',    'Winter');

-- 5. FIELDS
CREATE TABLE fields (
  field_id  SERIAL PRIMARY KEY,
  soil_type VARCHAR(50),
  size      FLOAT,
  farm_id   INT NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE
);

INSERT INTO fields (soil_type, size, farm_id) VALUES
  ('Clay',       12.5, 1),
  ('Sandy',       8.0, 1),
  ('Loamy',      15.0, 2),
  ('Clay Loam',  10.0, 2),
  ('Sandy Loam',  6.5, 3);

-- 6. PLANTINGS
CREATE TABLE plantings (
  planting_id   SERIAL PRIMARY KEY,
  planting_date DATE NOT NULL,
  harvest_date  DATE NOT NULL,
  field_id      INT NOT NULL REFERENCES fields(field_id) ON DELETE CASCADE,
  crop_id       INT NOT NULL REFERENCES crops(crop_id) ON DELETE CASCADE
);

INSERT INTO plantings (planting_date, harvest_date, field_id, crop_id) VALUES
  ('2025-01-10', '2025-06-20', 1, 1),
  ('2025-03-05', '2025-08-15', 2, 2),
  ('2025-02-20', '2025-07-30', 3, 3),
  ('2025-04-01', '2025-09-10', 4, 4),
  ('2025-01-15', '2025-06-25', 5, 5),
  ('2025-05-01', '2025-10-01', 1, 2);
  
-- 7. SENSORS
CREATE TABLE sensors (
  sensor_id SERIAL PRIMARY KEY,
  type      VARCHAR(50) NOT NULL,
  unit      VARCHAR(20),
  field_id  INT NOT NULL REFERENCES fields(field_id) ON DELETE CASCADE
);

INSERT INTO sensors (type, unit, field_id) VALUES
  ('temperature', '°C', 1),
  ('humidity',    '%',  1),
  ('moisture',    '%',  2),
  ('temperature', '°C', 3),
  ('pH',          'pH', 4),
  ('humidity',    '%',  5);

-- 8. SENSOR READINGS
CREATE TABLE sensor_readings (
  reading_id SERIAL PRIMARY KEY,
  value      NUMERIC(10,2) NOT NULL,
  timestamp  TIMESTAMPTZ DEFAULT NOW(),
  sensor_id  INT NOT NULL REFERENCES sensors(sensor_id) ON DELETE CASCADE
);

INSERT INTO sensor_readings (value, timestamp, sensor_id) VALUES
  (22.5, '2025-06-01 08:00:00', 1),
  (23.1, '2025-06-01 10:00:00', 1),
  (65.0, '2025-06-01 08:00:00', 2),
  (63.5, '2025-06-01 10:00:00', 2),
  (45.2, '2025-06-01 08:30:00', 3),
  (19.8, '2025-06-01 09:00:00', 4),
  (6.8,  '2025-06-01 07:00:00', 5),
  (71.0, '2025-06-01 08:00:00', 6),
  (24.0, '2025-06-02 08:00:00', 1),
  (66.5, '2025-06-02 08:00:00', 2);

-- 9. EQUIPMENT
CREATE TABLE equipment (
  equipment_id SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  status       VARCHAR(50) DEFAULT 'active',
  farm_id      INT NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE
);


INSERT INTO equipment (name, status, farm_id) VALUES
  ('Tractor A',       'active',      1),
  ('Irrigation Pump', 'active',      1),
  ('Harvester B',     'maintenance', 2),
  ('Sprayer Unit',    'active',      2),
  ('Tractor C',       'inactive',    3),
  ('Water Tank',      'active',      3);

  Q1 — Crops planted per farm

SELECT f.name AS farm_name, fi.field_id, fi.soil_type,
       c.name AS crop_name, c.season,
       p.planting_date, p.harvest_date
FROM farms f
JOIN fields fi ON fi.farm_id = f.farm_id
JOIN plantings p ON p.field_id = fi.field_id
JOIN crops c ON c.crop_id = p.crop_id
ORDER BY f.name, p.planting_date;


Q2 — Avg/min/max sensor readings per field

SELECT fi.field_id, s.type AS sensor_type, s.unit,
       COUNT(sr.reading_id) AS total_readings,
       ROUND(AVG(sr.value)::NUMERIC, 2) AS avg_value,
       ROUND(MIN(sr.value)::NUMERIC, 2) AS min_value,
       ROUND(MAX(sr.value)::NUMERIC, 2) AS max_value
FROM fields fi
JOIN sensors s ON s.field_id = fi.field_id
JOIN sensor_readings sr ON sr.sensor_id = s.sensor_id
GROUP BY fi.field_id, s.type, s.unit
ORDER BY fi.field_id;



Q3 — Farm summary with field and equipment count

SELECT f.farm_id, f.name, f.location,
       COUNT(DISTINCT fi.field_id)    AS num_fields,
       COUNT(DISTINCT p.planting_id)  AS num_plantings,
       COUNT(DISTINCT e.equipment_id) AS num_equipment
FROM farms f
LEFT JOIN fields    fi ON fi.farm_id = f.farm_id
LEFT JOIN plantings p  ON p.field_id = fi.field_id
LEFT JOIN equipment e  ON e.farm_id  = f.farm_id
GROUP BY f.farm_id, f.name, f.location
ORDER BY num_fields DESC;



Q4 — Users with their role and farm count

SELECT u.user_id, u.name, u.email,
       ug.name AS group_name,
       COUNT(f.farm_id) AS farms_owned
FROM users u
JOIN user_groups ug ON ug.group_id = u.group_id
LEFT JOIN farms f ON f.user_id = u.user_id
GROUP BY u.user_id, u.name, u.email, ug.name
ORDER BY ug.name, u.name;



Q5 — Fields with no sensor installed

SELECT fi.field_id, fi.soil_type, fi.size, f.name AS farm_name
FROM fields fi
JOIN farms f ON f.farm_id = fi.farm_id
WHERE fi.field_id NOT IN (
    SELECT DISTINCT field_id FROM sensors
)
ORDER BY fi.field_id;




Q6 — Most recent harvest per farm

SELECT DISTINCT ON (f.farm_id)
    f.name AS farm_name, c.name AS crop_name,
    p.harvest_date, fi.soil_type
FROM plantings p
JOIN fields fi ON fi.field_id = p.field_id
JOIN farms f ON f.farm_id = fi.farm_id
JOIN crops c ON c.crop_id = p.crop_id
ORDER BY f.farm_id, p.harvest_date DESC;




Q7 — Total sensors per field with farm name

SELECT f.name AS farm_name, fi.field_id,
       fi.soil_type, COUNT(s.sensor_id) AS sensor_count
FROM fields fi
JOIN farms f ON f.farm_id = fi.farm_id
LEFT JOIN sensors s ON s.field_id = fi.field_id
GROUP BY f.name, fi.field_id, fi.soil_type
ORDER BY f.name, fi.field_id;

Block 1 — Procedure: add_planting

CREATE OR REPLACE PROCEDURE add_planting(
    p_field_id     INT,
    p_crop_id      INT,
    p_plant_date   DATE,
    p_harvest_date DATE
)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO plantings (field_id, crop_id, planting_date, harvest_date)
    VALUES (p_field_id, p_crop_id, p_plant_date, p_harvest_date);
    RAISE NOTICE 'Planting added successfully.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error: %', SQLERRM;
END;
$$;

-- Call it:
CALL add_planting(2, 3, '2025-04-10', '2025-09-20');

Block 2 — Function: get_farm_total_area

CREATE OR REPLACE FUNCTION get_farm_total_area(p_farm_id INT)
RETURNS NUMERIC
LANGUAGE plpgsql AS $$
DECLARE
    v_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(size), 0)
    INTO v_total
    FROM fields
    WHERE farm_id = p_farm_id;
    RETURN v_total;
END;
$$;

-- Use in SELECT:
SELECT farm_id, name,
       get_farm_total_area(farm_id) AS total_area_ha
FROM farms;

Block 3 — Trigger: prevent invalid harvest date

-- Step 1: create the function
CREATE OR REPLACE FUNCTION fn_check_harvest_date()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.harvest_date <= NEW.planting_date THEN
        RAISE EXCEPTION
            'Harvest date must be after planting date.';
    END IF;
    RETURN NEW;
END;
$$;

-- Step 2: attach the trigger
CREATE OR REPLACE TRIGGER trg_check_harvest_date
BEFORE INSERT OR UPDATE ON plantings
FOR EACH ROW
EXECUTE FUNCTION fn_check_harvest_date();


CREATE OR REPLACE PROCEDURE update_equipment_status(
    p_equipment_id INT,
    p_new_status   VARCHAR
)
LANGUAGE plpgsql AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM equipment
    WHERE equipment_id = p_equipment_id;

    IF v_count = 0 THEN
        RAISE EXCEPTION 'Equipment ID % not found.', p_equipment_id;
    END IF;

    UPDATE equipment
    SET status = p_new_status
    WHERE equipment_id = p_equipment_id;

    RAISE NOTICE 'Status updated to: %', p_new_status;
END;
$$;


Block 5 — Function: count_plantings_for_crop

CREATE OR REPLACE FUNCTION count_plantings_for_crop(p_crop_id INT)
RETURNS INT
LANGUAGE plpgsql AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM plantings
    WHERE crop_id = p_crop_id;
    RETURN v_count;
END;
$$;

-- Use in SELECT:
SELECT crop_id, name,
       count_plantings_for_crop(crop_id) AS times_planted
FROM crops
ORDER BY times_planted DESC;
